
// views/RotasView.tsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactDOMServer from 'react-dom/server';
import { Customer, Warning } from '../types';
import PageHeader from '../components/PageHeader';
import MapComponent from '../components/MapComponent';
import ThermalRouteSheet from '../components/ThermalRouteSheet'; // Import the new component
import { PrinterIcon, DocumentTextIcon, RulerIcon, LocationMarkerIcon, BilliardIcon, JukeboxIcon, CraneIcon, ListBulletIcon, XIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '../components/icons';
import { optimizeRoute } from '../utils/routeOptimizer';
import { Geolocation } from '@capacitor/geolocation';
import { nativePrintPDF } from '../utils/nativePrint';


interface RotasViewProps {
  customers: Customer[];
  warnings: Warning[];
}

type EquipmentFilter = 'all' | 'mesa' | 'jukebox' | 'grua';
type GeocodedCustomer = Customer & { latitude: number; longitude: number; };
type FullScreenMode = 'none' | 'map' | 'list';

const FilterCard: React.FC<{
    title: string;
    count: number;
    icon: React.ReactNode;
    onClick: () => void;
    isActive: boolean;
}> = ({ title, count, icon, onClick, isActive }) => {
    const baseClasses = "bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border-2 flex-1 text-left transition-all duration-200 min-w-[200px]";
    const activeClasses = "border-lime-500 bg-lime-50 dark:bg-lime-900/50 scale-105";
    const inactiveClasses = "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600";
    return (
        <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${isActive ? 'bg-lime-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {icon}
                </div>
                <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-lg">{title}</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{count} clientes</p>
                </div>
            </div>
        </button>
    );
};

const RotasView: React.FC<RotasViewProps> = ({ customers, warnings }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [distances, setDistances] = useState<Record<string, number | null>>({});
  const [isProcessingRoute, setIsProcessingRoute] = useState(false);
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>('all');
  const [optimizedRoute, setOptimizedRoute] = useState<GeocodedCustomer[] | null>(null);
  const [fullScreenMode, setFullScreenMode] = useState<FullScreenMode>('none');
  const customerRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const filteredCustomersForRoute = useMemo(() => {
    if (equipmentFilter === 'all') {
        return customers;
    }
    return customers.filter(c => c.equipment?.some(e => e.type === equipmentFilter));
  }, [customers, equipmentFilter]);

  const geocodedCustomers = useMemo(() => {
    return filteredCustomersForRoute.filter(c => c.latitude != null && c.longitude != null).sort((a, b) => a.name.localeCompare(b.name)) as GeocodedCustomer[];
  }, [filteredCustomersForRoute]);
  
  const nonGeocodedCustomers = useMemo(() => {
    return filteredCustomersForRoute.filter(c => c.latitude == null || c.longitude == null).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredCustomersForRoute]);

  const displayedCustomers = useMemo(() => {
      if (optimizedRoute) {
          return [...optimizedRoute, ...nonGeocodedCustomers] as Customer[];
      }
      return filteredCustomersForRoute.sort((a, b) => a.name.localeCompare(b.name));
  }, [optimizedRoute, filteredCustomersForRoute, nonGeocodedCustomers]);

  const customersByCity = useMemo(() => {
    if (optimizedRoute) {
        return {
            'Rota Otimizada': optimizedRoute,
            'Sem Localização Salva': nonGeocodedCustomers
        };
    }
    return displayedCustomers.reduce((acc, customer) => {
        const city = customer.cidade.trim() || 'Sem Cidade';
        if (!acc[city]) {
            acc[city] = [];
        }
        acc[city].push(customer);
        return acc;
    }, {} as Record<string, Customer[]>);
  }, [displayedCustomers, optimizedRoute, nonGeocodedCustomers]);
  
  const equipmentCounts = useMemo(() => ({
    all: customers.length,
    mesa: customers.filter(c => c.equipment?.some(e => e.type === 'mesa')).length,
    jukebox: customers.filter(c => c.equipment?.some(e => e.type === 'jukebox')).length,
    grua: customers.filter(c => c.equipment?.some(e => e.type === 'grua')).length,
  }), [customers]);

  const sortedCities = useMemo(() => {
      if (optimizedRoute) {
          const keys = ['Rota Otimizada'];
          if (nonGeocodedCustomers.length > 0) keys.push('Sem Localização Salva');
          return keys;
      }
      return Object.keys(customersByCity).sort((a, b) => a.localeCompare(b));
  }, [customersByCity, optimizedRoute, nonGeocodedCustomers]);

  useEffect(() => {
    if (selectedCustomerId && customerRefs.current[selectedCustomerId]) {
      customerRefs.current[selectedCustomerId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedCustomerId]);
  
  const handleFilterChange = (filter: EquipmentFilter) => {
      setEquipmentFilter(filter);
      setOptimizedRoute(null); // Reset route on filter change
  };

  const handleMarkerClick = useCallback((customerId: string) => {
    setSelectedCustomerId(customerId);
  }, []);
  
  const handleCustomerSelect = useCallback((customerId: string) => {
    setSelectedCustomerId(customerId);
    if (window.innerWidth < 768) {
      mapContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);
  
  const handleOptimizeRoute = useCallback(async () => {
    setIsProcessingRoute(true);
    setOptimizedRoute(null);

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000
      });
      const { latitude, longitude } = position.coords;
      const route = optimizeRoute(latitude, longitude, geocodedCustomers);
      setOptimizedRoute(route);
    } catch (error: any) {
      console.error("Erro na otimização de rota:", error);
      let message = "Não foi possível obter a localização para otimizar a rota.";
      if (error.code === 1 || error.message?.toLowerCase().includes("denied")) {
        message = "Permissão de localização negada. Verifique as configurações do GPS.";
      } else if (error.message?.toLowerCase().includes("timeout")) {
        message = "Tempo esgotado ao buscar localização. Tente novamente em local aberto.";
      }
      alert(message);
    } finally {
      setIsProcessingRoute(false);
    }
  }, [geocodedCustomers]);

  const handleResetRoute = () => {
      setOptimizedRoute(null);
      setSelectedCustomerId(null);
  };
  
  const handlePrintRoute = useCallback(async () => {
    const allItems: ({ type: 'city', name: string } | { type: 'customer', data: Customer })[] = [];
    sortedCities.forEach(city => {
        allItems.push({ type: 'city', name: city });
        if (customersByCity[city]) {
            customersByCity[city].forEach(customer => {
                allItems.push({ type: 'customer', data: customer });
            });
        }
    });

    const itemsPerPage = 35; // Adjusted for smaller font size
    const pages: typeof allItems[] = [];
    for (let i = 0; i < allItems.length; i += itemsPerPage) {
        pages.push(allItems.slice(i, i + itemsPerPage));
    }
    
    let pagesHtml = '';
    pages.forEach((pageItems, pageIndex) => {
        let tableRows = '';
        pageItems.forEach(item => {
            if (item.type === 'city') {
                tableRows += `<tr><td colspan="6" class="city-header">${item.name}</td></tr>`;
            } else {
                const customer = item.data;
                const activeWarnings = warnings.filter(w => w.customerId === customer.id && !w.isResolved);
                
                const equipamentos = [];
                if ((customer.equipment || []).some(e => e.type === 'mesa')) equipamentos.push('Mesa');
                if ((customer.equipment || []).some(e => e.type === 'jukebox')) equipamentos.push('Jukebox');
                if ((customer.equipment || []).some(e => e.type === 'grua')) equipamentos.push('Grua');

                const lastVisitDate = customer.lastVisitedAt ? new Date(customer.lastVisitedAt).toLocaleDateString('pt-BR') : '---';
                const clockReadings = (customer.equipment || [])
                    .filter(e => e.type === 'mesa' || e.type === 'jukebox' || e.type === 'grua')
                    .map(e => {
                        const icon = e.type === 'mesa' ? '🎱' : e.type === 'jukebox' ? '🎵' : '🧸';
                        return `<div>${icon}${e.numero}: <strong>${e.relogioAnterior}</strong></div>`;
                    })
                    .join('');
                
                tableRows += `
                    <tr>
                        <td class="checkbox-cell"><div class="checkbox"></div></td>
                        <td>
                            <div style="text-transform: uppercase; font-weight: bold; font-size: 9pt;">${customer.name} <span style="font-weight: normal; text-transform: none; color: #666; margin-left: 5px;">- ${customer.endereco}</span></div>
                            ${activeWarnings.length > 0 ? `
                                <div style="color: #D32F2F; font-size: 7pt; font-weight: bold; margin-top: 1mm; border-top: 0.2mm solid #FFEBEE; padding-top: 0.5mm;">
                                    ⚠️ AVISO: ${activeWarnings.map(w => w.message).join(' | ')}
                                </div>
                            ` : ''}
                        </td>
                        <td>${equipamentos.join(', ')}</td>
                        <td class="date-cell">${lastVisitDate}</td>
                        <td class="clocks-cell">${clockReadings || 'N/A'}</td>
                        <td class="${customer.debtAmount > 0 ? 'negativo-cell' : 'no-negativo-cell'}">
                            ${customer.debtAmount > 0 ? `R$ ${customer.debtAmount.toFixed(2).replace('.', ',')}` : '-'}
                        </td>
                    </tr>
                `;
            }
        });

        pagesHtml += `
            <div class="page-container">
                <div class="header">
                    <h1>Rota de Cobrança</h1>
                    <p>Montanha Bilhar & Jukebox - ${new Date().toLocaleDateString('pt-BR')}</p>
                </div>
                <table class="customers-table">
                    <thead>
                        <tr>
                            <th class="checkbox-cell">Vis.</th>
                            <th>Cliente</th>
                            <th>Equip.</th>
                            <th class="date-cell">Últ. Visita</th>
                            <th class="clocks-cell">Relógios</th>
                            <th>Dívida</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
                <div class="footer">Página ${pageIndex + 1} de ${pages.length}</div>
            </div>
        `;
    });
    
    const fullHtml = `
      <html><head><title>Rota de Cobrança</title><style>
        body { font-family: Arial, sans-serif; font-size: 8pt; color: #333; }
        @page { size: A4; margin: 10mm; }
        .page-container { position: relative; min-height: 277mm; page-break-after: always; }
        .page-container:last-child { page-break-after: auto; }
        .header { text-align: center; } .header h1 { font-size: 14pt; margin-bottom: 2mm; } .header p { font-size: 9pt; margin: 0; color: #555; }
        .customers-table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 6mm; }
        .customers-table th, .customers-table td { border: 1px solid #ccc; padding: 1.5mm; text-align: left; vertical-align: middle; word-break: break-word; }
        .customers-table th { background-color: #f2f2f2; font-weight: bold; }
        .city-header { background-color: #e0e0e0; font-weight: bold; font-size: 10pt; padding: 2mm; }
        .checkbox-cell { width: 15px; text-align: center; } .checkbox { width: 10px; height: 10px; border: 1px solid #333; }
        .negativo-cell { width: 60px; text-align: right; color: #D32F2F; font-weight: bold; font-family: monospace; }
        .no-negativo-cell { width: 60px; text-align: right; font-family: monospace; }
        .date-cell { width: 55px; }
        .clocks-cell { min-width: 100px; }
        .footer { position: absolute; bottom: 0; width: 100%; text-align: center; font-size: 8pt; color: #888; }
      </style></head><body>${pagesHtml}</body></html>`;
      
    try {
        await nativePrintPDF(fullHtml, 'Rota de Cobrança (A4)');
    } catch (err) {
        console.error("Print error:", err);
        alert("Erro ao abrir gerenciador de impressão.");
    }
  }, [customersByCity, sortedCities]);
  
  const handleThermalPrint = useCallback(async () => {
    const thermalComponent = <ThermalRouteSheet customersByCity={customersByCity} sortedCities={sortedCities} isOptimized={!!optimizedRoute} />;
    const htmlString = ReactDOMServer.renderToString(thermalComponent);

    const fullHtml = `
            <html>
                <head>
                    <title>Rota de Cobrança (Térmica)</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                         body { margin: 0; background-color: #808080; }
                        .thermal-sheet { margin: 0 auto; }
                        @page { size: 80mm auto; margin: 0; }
                        @media print {
                            body { background-color: #fff; }
                        }
                    </style>
                </head>
                <body><div class="thermal-sheet">${htmlString}</div></body>
            </html>
        `;

    try {
        await nativePrintPDF(fullHtml, 'Rota de Cobrança (Térmica)');
    } catch (err) {
        console.error("Print error:", err);
        alert("Erro na impressão térmica.");
    }
}, [customersByCity, sortedCities, optimizedRoute]);

  return (
    <div className="h-full flex flex-col relative">
      {fullScreenMode === 'none' && (
        <>
          <PageHeader
            title="Rotas e Mapa de Clientes"
            subtitle="Visualize a localização dos seus clientes e planeje suas rotas."
          />
          {/* Filter Cards */}
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FilterCard 
                  title="Todas as Rotas"
                  count={equipmentCounts.all}
                  icon={<ListBulletIcon className="w-6 h-6" />}
                  onClick={() => handleFilterChange('all')}
                  isActive={equipmentFilter === 'all'}
              />
              <FilterCard 
                  title="Rotas (Mesas)"
                  count={equipmentCounts.mesa}
                  icon={<BilliardIcon className="w-6 h-6" />}
                  onClick={() => handleFilterChange('mesa')}
                  isActive={equipmentFilter === 'mesa'}
              />
              <FilterCard 
                  title="Rotas (Jukebox)"
                  count={equipmentCounts.jukebox}
                  icon={<JukeboxIcon className="w-6 h-6" />}
                  onClick={() => handleFilterChange('jukebox')}
                  isActive={equipmentFilter === 'jukebox'}
              />
              <FilterCard 
                  title="Rotas (Gruas)"
                  count={equipmentCounts.grua}
                  icon={<CraneIcon className="w-6 h-6" />}
                  onClick={() => handleFilterChange('grua')}
                  isActive={equipmentFilter === 'grua'}
              />
          </div>
        </>
      )}


      <div className={`flex flex-grow min-h-0 ${fullScreenMode === 'none' ? 'flex-col md:flex-row gap-8' : 'flex-col'}`}>
        
        {/* Map Panel */}
        <div 
          ref={mapContainerRef} 
          className={`
            ${fullScreenMode === 'list' ? 'hidden' : 'flex'}
            ${fullScreenMode === 'map' ? 'flex-grow w-full h-full' : 'flex-1 min-h-0 md:flex-[2_1_0%] w-full md:w-auto'}
          `}
        >
          <MapComponent
            customers={geocodedCustomers}
            selectedCustomerId={selectedCustomerId}
            onMarkerClick={handleMarkerClick}
            optimizedRoute={optimizedRoute}
          />
        </div>

        {/* Customer List Panel */}
        <div className={`
            bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col
            ${fullScreenMode === 'map' ? 'hidden' : 'flex'}
            ${fullScreenMode === 'list' ? 'flex-grow w-full h-full' : 'flex-1 min-h-0 md:flex-[1_1_0%] w-full md:w-auto'}
          `}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Clientes ({displayedCustomers.length})</h3>
            <div className="flex items-center gap-2">
               <button onClick={handleOptimizeRoute} title="Otimizar Rota" disabled={isProcessingRoute} className="p-2 text-slate-500 dark:text-slate-400 hover:text-lime-500 dark:hover:text-lime-400 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-wait">
                 {isProcessingRoute ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <RulerIcon className="w-5 h-5"/>}
               </button>
               {optimizedRoute && (
                 <button onClick={handleResetRoute} title="Resetar Rota" className="p-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300">
                    <XIcon className="w-5 h-5" />
                 </button>
               )}
                <div className="h-6 border-l border-slate-300 dark:border-slate-600 mx-1"></div>
               <button onClick={handlePrintRoute} title="Imprimir Rota (A4)" className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                 <PrinterIcon className="w-5 h-5"/>
               </button>
               <button onClick={handleThermalPrint} title="Imprimir Rota (Térmica)" className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                 <DocumentTextIcon className="w-5 h-5"/>
               </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-grow p-2 space-y-4">
            {sortedCities.length > 0 ? sortedCities.map(city => (
              <div key={city} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <h4 className="text-md font-semibold text-lime-600 dark:text-lime-400 p-3 border-b border-slate-200 dark:border-slate-700 capitalize flex items-center gap-2">
                    {city === 'Rota Otimizada' ? <RulerIcon className="w-5 h-5" /> : <LocationMarkerIcon className="w-5 h-5" />}
                    {city}
                </h4>
                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                    {customersByCity[city].map((customer, index) => {
                      const twentyFiveDaysInMs = 25 * 24 * 60 * 60 * 1000;
                      const visitIsPending = !customer.lastVisitedAt || (new Date().getTime() - new Date(customer.lastVisitedAt).getTime()) > twentyFiveDaysInMs;
                      const hasDebt = customer.debtAmount > 0;

                      return (
                        <li key={customer.id} ref={el => { customerRefs.current[customer.id] = el; }}>
                            <button
                              onClick={() => handleCustomerSelect(customer.id)}
                              className={`w-full text-left p-3 transition-colors ${
                                selectedCustomerId === customer.id ? 'bg-lime-600/10 dark:bg-lime-600/20' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {city === 'Rota Otimizada' && <span className="font-bold text-lime-500 text-lg w-6 text-center">{index + 1}.</span>}
                                {city === 'Sem Localização Salva' && <span className="font-bold text-slate-500 text-lg w-6 text-center">-</span>}
                                <div className="flex-shrink-0 flex items-center gap-1.5">
                                    {visitIsPending ? (
                                        <span title="Visita Pendente" className="block w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                                    ) : (
                                        <span title={`Visitado em ${new Date(customer.lastVisitedAt!).toLocaleDateString('pt-BR')}`} className="block w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                                    )}
                                    {hasDebt && (
                                        <span title={`Dívida: R$ ${customer.debtAmount.toFixed(2).replace('.',',')}`} className="block w-2.5 h-2.5 bg-amber-400 rounded-full"></span>
                                    )}
                                </div>
                                <p className={`font-semibold truncate ${selectedCustomerId === customer.id ? 'text-lime-600 dark:text-lime-400' : 'text-slate-900 dark:text-white'}`}>{customer.name}</p>
                              </div>
                              <p className="text-sm text-slate-500 dark:text-slate-400 truncate pl-6">{customer.endereco}</p>
                              {distances[customer.id] != null && <p className="text-xs text-sky-500 dark:text-sky-400 mt-1 pl-6">Aprox. {distances[customer.id]?.toFixed(1)} km</p>}
                            </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )) : (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                Nenhum cliente com endereço geocodificado encontrado para o filtro selecionado.
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Floating Fullscreen Controls */}
      <div className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-20 right-5 z-40 flex flex-col gap-2">
          <button 
              onClick={() => setFullScreenMode(fullScreenMode === 'map' ? 'none' : 'map')}
              title={fullScreenMode === 'map' ? "Restaurar Visualização" : "Mapa em Tela Cheia"}
              className="p-3 bg-slate-800 text-white rounded-full shadow-lg hover:bg-lime-600 transition-colors border-2 border-slate-700"
          >
              {fullScreenMode === 'map' ? <ArrowsPointingInIcon className="w-6 h-6" /> : <ArrowsPointingOutIcon className="w-6 h-6" />}
          </button>
          <button 
              onClick={() => setFullScreenMode(fullScreenMode === 'list' ? 'none' : 'list')}
              title={fullScreenMode === 'list' ? "Restaurar Visualização" : "Lista em Tela Cheia"}
              className="p-3 bg-slate-800 text-white rounded-full shadow-lg hover:bg-lime-600 transition-colors border-2 border-slate-700"
          >
              {fullScreenMode === 'list' ? <ArrowsPointingInIcon className="w-6 h-6" /> : <ArrowsPointingOutIcon className="w-6 h-6" />}
          </button>
      </div>

    </div>
  );
};

export default RotasView;
