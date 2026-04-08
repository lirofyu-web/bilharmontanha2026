import React, { useEffect, useRef } from 'react';
import { Customer } from '../types';
import ReactDOMServer from 'react-dom/server';
import { VisitedIcon } from './icons/VisitedIcon';
import { NotVisitedIcon } from './icons/NotVisitedIcon';
import L from 'leaflet';
import 'leaflet.markercluster';

type GeocodedCustomer = Customer & { latitude: number; longitude: number; };

interface MapComponentProps {
  customers: GeocodedCustomer[];
  selectedCustomerId: string | null;
  onMarkerClick: (customerId: string) => void;
  optimizedRoute?: GeocodedCustomer[] | null;
}

const MapComponent: React.FC<MapComponentProps> = ({ customers, selectedCustomerId, onMarkerClick, optimizedRoute }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any | null>(null); // L.Map
  const markersLayer = useRef<any | null>(null); // L.MarkerClusterGroup
  const routeLayer = useRef<any | null>(null); // L.LayerGroup for polylines
  const markerRefs = useRef<Record<string, any>>({}); // Record<string, L.Marker>

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !L) return;

    const brazilBounds = L.latLngBounds(
      L.latLng(-33.75, -73.98), // Southwest corner of Brazil
      L.latLng(5.27, -32.39)    // Northeast corner of Brazil
    );

    mapInstance.current = L.map(mapRef.current, {
      center: [-14.235, -51.9253],
      zoom: 4,
      minZoom: 4,
      maxBounds: brazilBounds,
      maxBoundsViscosity: 1.0,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(mapInstance.current);

    markersLayer.current = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50
    });
    routeLayer.current = L.layerGroup();
    mapInstance.current.addLayer(markersLayer.current);
    mapInstance.current.addLayer(routeLayer.current);
    markerRefs.current = {};

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstance.current) {
        mapInstance.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapRef.current);

    setTimeout(() => {
        mapInstance.current?.invalidateSize();
    }, 250);

    return () => {
      resizeObserver.disconnect();
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!markersLayer.current || !mapInstance.current || !L) return;
    
    markersLayer.current.clearLayers();
    markerRefs.current = {};

    if (customers.length > 0) {
        customers.forEach(customer => {
            const twentyFiveDaysInMs = 25 * 24 * 60 * 60 * 1000;
            const isVisitedRecently = customer.lastVisitedAt && (new Date().getTime() - new Date(customer.lastVisitedAt).getTime()) <= twentyFiveDaysInMs;
            
            const iconComponent = isVisitedRecently 
              ? <VisitedIcon className="w-8 h-8" /> 
              : <NotVisitedIcon className="w-8 h-8" />;

            const customIcon = L.divIcon({
              html: ReactDOMServer.renderToString(iconComponent),
              className: 'custom-marker',
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32],
            });
            
            const marker = L.marker([customer.latitude, customer.longitude], { icon: customIcon });
            
            const popupContent = `
                <div style="font-family: Inter, sans-serif; min-width: 180px;">
                    <h3 style="font-weight: 700; font-size: 1rem; margin-bottom: 4px;">${customer.name}</h3>
                    <p style="font-size: 0.875rem; margin: 0 0 8px 0; color: #6b7280;">${isVisitedRecently ? `Visitado em ${new Date(customer.lastVisitedAt!).toLocaleDateString('pt-BR')}` : 'Visita pendente'}</p>
                    ${customer.debtAmount > 0 ? `<p style="font-size: 0.875rem; margin: 0 0 8px 0; color: #ef4444; font-weight: 600;">Dívida: R$ ${customer.debtAmount.toFixed(2)}</p>` : ''}
                    <a 
                        href="https://www.google.com/maps/dir/?api=1&destination=${customer.latitude},${customer.longitude}" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style="font-weight: 600; color: #0ea5e9;"
                    >
                        Ver Rotas &rarr;
                    </a>
                </div>
            `;

            marker.bindPopup(popupContent);
            marker.on('click', () => {
                onMarkerClick(customer.id);
            });
            
            markersLayer.current.addLayer(marker);
            markerRefs.current[customer.id] = marker;
        });

        if (!selectedCustomerId && !optimizedRoute) {
            try {
               const bounds = markersLayer.current.getBounds();
               if (bounds.isValid()) {
                  mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
               }
            } catch (e) {
               console.warn("Could not fit bounds", e);
            }
        }
    } else {
        mapInstance.current.setView([-14.235, -51.9253], 4);
    }
  }, [customers, onMarkerClick, selectedCustomerId, optimizedRoute]);

  useEffect(() => {
      if (!routeLayer.current || !mapInstance.current || !L) return;
      routeLayer.current.clearLayers();

      if (optimizedRoute && optimizedRoute.length > 1) {
          const latLngs = optimizedRoute.map(c => [c.latitude, c.longitude] as [number, number]);
          const polyline = L.polyline(latLngs, { color: '#fb923c', weight: 5, opacity: 0.8 });
          routeLayer.current.addLayer(polyline);
          mapInstance.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }
  }, [optimizedRoute]);


  useEffect(() => {
    if (!mapInstance.current || !L) return;

    Object.values(markerRefs.current).forEach((m: any) => {
        const element = m.getElement();
        if (element) {
            element.classList.remove('selected-marker');
            m.setZIndexOffset(0);
        }
    });

    if (selectedCustomerId && markerRefs.current[selectedCustomerId]) {
        const selectedMarker: any = markerRefs.current[selectedCustomerId];
        
        const element = selectedMarker.getElement();
        if (element) {
            element.classList.add('selected-marker');
            selectedMarker.setZIndexOffset(1000);
        }

        markersLayer.current.zoomToShowLayer(selectedMarker, () => {
             mapInstance.current.panTo(selectedMarker.getLatLng());
             setTimeout(() => {
                 selectedMarker.openPopup();
             }, 100);
        });
    }
  }, [selectedCustomerId]);

  return (
    <div className="bg-slate-200 dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 h-full w-full flex flex-col relative z-0">
      <div ref={mapRef} className="w-full h-full rounded-lg z-0" />
    </div>
  );
};

export default MapComponent;