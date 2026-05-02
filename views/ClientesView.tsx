
// views/ClientesView.tsx
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Customer, Warning, Billing, Route, Equipment } from '../types';
import AddCustomerForm from '../components/AddCustomerForm';
import CustomerCard from '../components/CustomerCard';
import PageHeader from '../components/PageHeader';
import FullScreenCustomerView from '../components/FullScreenCustomerView';
import { SearchIcon } from '../components/icons/SearchIcon';
import { QrCodeIcon } from '../components/icons/QrCodeIcon';
import { LocationMarkerIcon } from '../components/icons/LocationMarkerIcon';
import CityCustomersModal from '../components/CityCustomersModal';
import CityListModal from '../components/CityListModal';
import { GreenBilliardBallIcon } from '../components/icons/GreenBilliardBallIcon';
import { RedBilliardBallIcon } from '../components/icons/RedBilliardBallIcon';
import { BilliardIcon } from '../components/icons/BilliardIcon';
import { JukeboxIcon } from '../components/icons/JukeboxIcon';
import { CraneIcon } from '../components/icons/CraneIcon';
import { ListBulletIcon } from '../components/icons/ListBulletIcon';
import { MapIcon } from '../components/icons/MapIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { RulerIcon } from '../components/icons/RulerIcon';
import WarningDetailsModal from '../components/WarningDetailsModal';
import HistoryModal from '../components/HistoryModal';
import { usePagination } from '../hooks/usePagination';
import { InfiniteScrollTrigger } from '../components/InfiniteScrollTrigger';

interface ClientesViewProps {
  customers: Customer[];
  warnings: Warning[];
  billings: Billing[];
  routes: Route[];
  onAddCustomer: (customerData: Omit<Customer, 'id' | 'createdAt' | 'debtAmount' | 'lastVisitedAt'>) => Promise<void>;
  onUpdateCustomer: (updatedCustomer: Partial<Customer> & { id: string }) => void;
  isSaving: boolean;
  showNotification: (message: string, type?: 'success' | 'error') => void;
  onFichaActions: (customer: Customer) => void;
  onBillCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  onPayDebtCustomer: (customer: Customer) => void;
  onOpenFastBilling: () => void;
  onLocationActions: (customer: Customer) => void;
  onWhatsAppActions: (customer: Customer) => void;
  onFinalizePendingPayment: (billing: Billing) => void;
  onPendingPaymentAction: (customer: Customer, billing: Billing) => void;
  onWarningClick: (customer: Customer) => void;
  onAddWarning: (customerId: string, message: string) => Promise<void>;
  onResolveWarning: (warningId: string) => Promise<void>;
  areValuesHidden: boolean;
  onOpenRouteCreator: () => void;
  onSaveRoute: (name: string, customerIds: string[]) => Promise<void>;
  onDeleteRoute: (routeId: string) => Promise<void>;
}

type EquipmentFilter = 'all' | 'mesa' | 'jukebox' | 'grua';
type ViewMode = 'cidades' | 'rotas';
type VisitFilter = 'all' | 'visited' | 'not_visited';

const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

const TabButton: React.FC<{label: string, icon: React.ReactNode, active: boolean, onClick: () => void}> = ({ label, icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${
            active
                ? 'bg-lime-500 text-white shadow-md'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
        }`}
    >
        {icon}
        {label}
    </button>
);

const RouteSection: React.FC<{
    route: Route;
    customers: Customer[];
    billings: Billing[];
    warnings: Warning[];
    onBillCustomer: (customer: Customer) => void;
    onEditCustomer: (customer: Customer) => void;
    onDeleteCustomer: (customer: Customer) => void;
    onPayDebtCustomer: (customer: Customer) => void;
    onHistoryCustomer: (customer: Customer) => void;
    showNotification: (message: string, type?: 'success' | 'error') => void;
    onFocusCustomer: (customer: Customer) => void;
    onFichaActions: (customer: Customer) => void;
    onLocationActions: (customer: Customer) => void;
    onWhatsAppActions: (customer: Customer) => void;
    onFinalizePendingPayment: (billing: Billing) => void;
    onPendingPaymentAction: (customer: Customer, billing: Billing) => void;
    onAddWarning: (customerId: string, message: string) => Promise<void>;
    onResolveWarning: (warningId: string) => Promise<void>;
    areValuesHidden: boolean;
    onUpdateCustomer: (updatedCustomer: Partial<Customer> & { id: string }) => void;
    onWarningClick: (customer: Customer) => void;
    onDeleteRoute: (routeId: string) => Promise<void>;
}> = ({ 
    route, customers, billings, warnings, onBillCustomer, onEditCustomer, onDeleteCustomer, 
    onPayDebtCustomer, onHistoryCustomer, showNotification, onFocusCustomer, onFichaActions, 
    onLocationActions, onWhatsAppActions, onFinalizePendingPayment, onPendingPaymentAction, 
    areValuesHidden, onUpdateCustomer, onWarningClick, onDeleteRoute 
}) => {
    const routeCustomers = useMemo(() => 
        route.customerIds.map(id => customers.find(c => c.id === id)).filter((c): c is Customer => !!c),
    [route.customerIds, customers]);

    const { slicedItems, loadMore, hasMore } = usePagination(routeCustomers, 15);

    return (
        <section className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <MapIcon className="w-6 h-6 text-slate-400" />
                    {route.name} ({route.customerIds.length})
                </h2>
                <button onClick={() => { if (window.prompt('Autenticação necessária. Digite a senha de administrador (1678):') === '1678') onDeleteRoute(route.id); }} className="text-red-500 hover:text-red-400 p-2 rounded-full hover:bg-red-500/10" title="Excluir Rota">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex flex-col gap-4">
                {slicedItems.length > 0 ? (
                    <>
                        {slicedItems.map((customer, idx) => (
                            <div key={customer.id} className="flex items-center gap-4">
                                <span className="font-bold text-xl text-lime-500 w-8 text-center">{idx + 1}.</span>
                                <div className="flex-grow">
                                    <CustomerCard 
                                        customer={customer} 
                                        billings={billings} 
                                        hasActiveWarning={warnings.some(w => w.customerId === customer.id && !w.isResolved)} 
                                        onBill={onBillCustomer} 
                                        onEdit={onEditCustomer} 
                                        onDelete={onDeleteCustomer} 
                                        onPayDebt={onPayDebtCustomer} 
                                        onHistory={onHistoryCustomer} 
                                        showNotification={showNotification} 
                                        onFocusCustomer={onFocusCustomer} 
                                        onFichaActions={onFichaActions} 
                                        onLocationActions={onLocationActions} 
                                        onWhatsAppActions={onWhatsAppActions} 
                                        onFinalizePendingPayment={onFinalizePendingPayment} 
                                        onPendingPaymentAction={onPendingPaymentAction} 
                                        activeWarningId={warnings.find(w => w.customerId === customer.id && !w.isResolved)?.id}
                                        onAddWarning={onAddWarning}
                                        onResolveWarning={onResolveWarning}
                                        areValuesHidden={areValuesHidden} 
                                        onUpdateCustomer={onUpdateCustomer} 
                                        onWarningClick={() => onWarningClick(customer)} 
                                    />
                                </div>
                            </div>
                        ))}
                        <InfiniteScrollTrigger onIntersect={loadMore} hasMore={hasMore} className="mt-2" />
                    </>
                ) : (
                    <p className="text-center py-4 text-slate-500 italic">Nenhum cliente nesta rota.</p>
                )}
            </div>
        </section>
    );
};

const ClientesView: React.FC<ClientesViewProps> = ({ 
    customers, 
    warnings,
    billings,
    routes,
    onAddCustomer, 
    onUpdateCustomer,
    isSaving,
    showNotification,
    onFichaActions,
    onBillCustomer,
    onEditCustomer,
    onDeleteCustomer,
    onPayDebtCustomer,
    onOpenFastBilling,
    onLocationActions,
    onWhatsAppActions,
    onFinalizePendingPayment,
    onPendingPaymentAction,
    onAddWarning,
    onResolveWarning,
    areValuesHidden,
    onOpenRouteCreator,
    onSaveRoute,
    onDeleteRoute,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('cidades');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>('all');
  const [visitFilter, setVisitFilter] = useState<VisitFilter>('all');
  const [viewingCity, setViewingCity] = useState<string | null>(null);
  const [isCityListModalOpen, setIsCityListModalOpen] = useState(false);
  const [focusedCustomer, setFocusedCustomer] = useState<Customer | null>(null);
  const [viewingWarning, setViewingWarning] = useState<{customer: Customer, warning: Warning} | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const debouncedSetSearch = useCallback(debounce(setDebouncedSearchQuery, 300), []);

  useEffect(() => {
      debouncedSetSearch(searchQuery);
  }, [searchQuery, debouncedSetSearch]);

  const allEquipments = useMemo(() => customers.flatMap(c => c.equipment || []), [customers]);

  const handleWarningClick = (customer: Customer) => {
    const warning = warnings.find(w => w.customerId === customer.id && !w.isResolved);
    if (warning) {
        setViewingWarning({ customer, warning });
    }
  };

  const onHistoryCustomer = (customer: Customer) => {
    setHistoryCustomer(customer);
  };

  const filteredCustomers = useMemo(() => {
    const twentyFiveDaysInMs = 25 * 24 * 60 * 60 * 1000;
    return customers
        .filter(customer => {
            if (!debouncedSearchQuery) return true;
            const query = debouncedSearchQuery.toLowerCase();
            return customer.name.toLowerCase().includes(query) ||
                   customer.cidade.toLowerCase().includes(query) ||
                   customer.linhaNumero.toLowerCase().includes(query) ||
                   (customer.equipment || []).some(e => e.numero.toLowerCase().includes(query));
        })
        .filter(customer => {
            if (equipmentFilter === 'all') return true;
            return (customer.equipment || []).some(e => e.type === equipmentFilter);
        })
        .filter(customer => {
            if (visitFilter === 'all') return true;
            const visitIsPending = !customer.lastVisitedAt || (new Date().getTime() - new Date(customer.lastVisitedAt).getTime()) > twentyFiveDaysInMs;
            if (visitFilter === 'visited') return !visitIsPending;
            if (visitFilter === 'not_visited') return visitIsPending;
            return true;
        });
  }, [customers, debouncedSearchQuery, equipmentFilter, visitFilter]);

  const customersByCity = useMemo(() => {
    const grouped = filteredCustomers.reduce((acc, customer) => {
        const city = customer.cidade.trim() || 'Sem Cidade';
        if (!acc[city]) acc[city] = [];
        acc[city].push(customer);
        return acc;
    }, {} as Record<string, Customer[]>);
    for (const city in grouped) grouped[city].sort((a, b) => a.name.localeCompare(b.name));
    return grouped;
  }, [filteredCustomers]);

  const sortedCities = useMemo(() => Object.keys(customersByCity).sort((a, b) => a.localeCompare(b)), [customersByCity]);
  
  const cityStats = useMemo(() => {
    const stats: Record<string, { visited: number; notVisited: number }> = {};
    const twentyFiveDaysInMs = 25 * 24 * 60 * 60 * 1000;
    for (const city of sortedCities) {
        const cityCustomers = customersByCity[city];
        let visited = 0, notVisited = 0;
        cityCustomers.forEach(customer => {
            const visitIsPending = !customer.lastVisitedAt || (new Date().getTime() - new Date(customer.lastVisitedAt).getTime()) > twentyFiveDaysInMs;
            if (visitIsPending) notVisited++;
            else visited++;
        });
        stats[city] = { visited, notVisited };
    }
    return stats;
  }, [sortedCities, customersByCity]);

  const handleOpenCityCustomers = useCallback((city: string) => {
      setIsCityListModalOpen(false);
      setViewingCity(city);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <PageHeader title="Clientes e Rotas" subtitle="Gerencie seus clientes, equipamentos e rotas de visita." />

      <div className="mb-8">
        <AddCustomerForm customers={customers} onAddCustomer={onAddCustomer} isSaving={isSaving} showNotification={showNotification} />
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 mb-8 flex flex-col gap-4">
        <div className="flex gap-2">
            <TabButton label="Por Cidade" icon={<LocationMarkerIcon className="w-5 h-5"/>} active={viewMode === 'cidades'} onClick={() => { setViewMode('cidades'); setIsCityListModalOpen(true); }} />
            <TabButton label="Minhas Rotas" icon={<MapIcon className="w-5 h-5"/>} active={viewMode === 'rotas'} onClick={() => setViewMode('rotas')} />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
            <div className="relative flex-grow w-full" ref={searchWrapperRef}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="w-5 h-5 text-slate-400" /></div>
                <input type="text" placeholder="Filtrar por nome, cidade, linha ou nº do equipamento..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoComplete="off" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <button onClick={onOpenFastBilling} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white font-bold py-2 px-4 rounded-md transition-all bg-pink-600 hover:bg-pink-500 active:scale-95 shadow-lg shadow-pink-500/20"><QrCodeIcon className="w-5 h-5" /><span>INICIAR COBRANÇA</span></button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
            <button onClick={() => setEquipmentFilter('all')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${equipmentFilter === 'all' ? 'bg-lime-500 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}><ListBulletIcon className={`w-8 h-8 ${equipmentFilter === 'all' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} /><span className="text-xs font-bold mt-1">Todos</span></button>
            <button onClick={() => setEquipmentFilter('mesa')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${equipmentFilter === 'mesa' ? 'bg-lime-500 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}><BilliardIcon className={`w-8 h-8 ${equipmentFilter === 'mesa' ? 'text-white' : 'text-cyan-600 dark:text-cyan-400'}`} /><span className="text-xs font-bold mt-1">Mesas</span></button>
            <button onClick={() => setEquipmentFilter('jukebox')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${equipmentFilter === 'jukebox' ? 'bg-lime-500 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}><JukeboxIcon className={`w-8 h-8 ${equipmentFilter === 'jukebox' ? 'text-white' : 'text-fuchsia-600 dark:text-fuchsia-400'}`} /><span className="text-xs font-bold mt-1">Jukebox</span></button>
            <button onClick={() => setEquipmentFilter('grua')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${equipmentFilter === 'grua' ? 'bg-lime-500 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}><CraneIcon className={`w-8 h-8 ${equipmentFilter === 'grua' ? 'text-white' : 'text-orange-600 dark:text-orange-400'}`} /><span className="text-xs font-bold mt-1">Gruas</span></button>
        </div>
        <div className="grid grid-cols-3 gap-2 w-full pt-4 border-t border-slate-200 dark:border-slate-700">
            <button onClick={() => setVisitFilter('all')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${visitFilter === 'all' ? 'bg-lime-500 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                <ListBulletIcon className={`w-8 h-8 ${visitFilter === 'all' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className="text-xs font-bold mt-1">Status (Todos)</span>
            </button>
            <button onClick={() => setVisitFilter('visited')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${visitFilter === 'visited' ? 'bg-lime-500 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                <GreenBilliardBallIcon className={`w-8 h-8 ${visitFilter === 'visited' ? 'text-white' : 'text-green-500'}`} />
                <span className="text-xs font-bold mt-1">Visitados</span>
            </button>
            <button onClick={() => setVisitFilter('not_visited')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${visitFilter === 'not_visited' ? 'bg-lime-500 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                <RedBilliardBallIcon className={`w-8 h-8 ${visitFilter === 'not_visited' ? 'text-white' : 'text-red-500'}`} />
                <span className="text-xs font-bold mt-1">Não Visitados</span>
            </button>
        </div>
      </div>

      {viewMode === 'cidades' ? (
        <div className="space-y-6">
            {sortedCities.length > 0 ? sortedCities.map((city, index) => {
            const cityCustomers = customersByCity[city];
            const stats = cityStats[city];
            const isEven = index % 2 === 0;
            const cardBgColor = isEven ? 'bg-lime-100 dark:bg-lime-900' : 'bg-cyan-100 dark:bg-cyan-900';
            const cardBorderColor = isEven ? 'border-lime-200 dark:border-lime-700' : 'border-cyan-200 dark:border-cyan-700';
            return (
                <section key={city} className={`${cardBgColor} ${cardBorderColor} p-4 rounded-lg shadow-lg border`}>
                    <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 mb-4"><h2 className="text-2xl font-bold text-red-600 dark:text-red-500 flex items-center gap-2"><LocationMarkerIcon className="w-6 h-6 text-slate-400" />{city} ({cityCustomers.length})</h2><div className="flex items-center gap-4"><div className="flex items-center gap-1.5 text-green-500" title="Clientes visitados nos últimos 25 dias"><GreenBilliardBallIcon className="w-4 h-4" /><span className="font-bold">{stats.visited}</span></div><div className="flex items-center gap-1.5 text-red-500" title="Clientes com visita pendente"><RedBilliardBallIcon className="w-4 h-4" /><span className="font-bold">{stats.notVisited}</span></div><button onClick={() => handleOpenCityCustomers(city)} className="text-sm font-semibold text-lime-600 dark:text-lime-400 hover:underline">Ver Todos &rarr;</button></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{cityCustomers.slice(0, 8).map(customer => (<CustomerCard key={customer.id} customer={customer} billings={billings} hasActiveWarning={warnings.some(w => w.customerId === customer.id && !w.isResolved)} activeWarningId={warnings.find(w => w.customerId === customer.id && !w.isResolved)?.id} onBill={onBillCustomer} onEdit={onEditCustomer} onDelete={onDeleteCustomer} onPayDebt={onPayDebtCustomer} onHistory={onHistoryCustomer} showNotification={showNotification} onFocusCustomer={setFocusedCustomer} onFichaActions={onFichaActions} onLocationActions={onLocationActions} onWhatsAppActions={onWhatsAppActions} onFinalizePendingPayment={onFinalizePendingPayment} onPendingPaymentAction={onPendingPaymentAction} onAddWarning={onAddWarning} onResolveWarning={onResolveWarning} areValuesHidden={areValuesHidden} onUpdateCustomer={onUpdateCustomer} onWarningClick={handleWarningClick} />))}</div>
                </section>
            );
            }) : (
                 <div className="text-center py-16 px-6 bg-slate-100 dark:bg-slate-800/50 rounded-lg shadow-inner">
                    <SearchIcon className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Nenhum Cliente Encontrado</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Tente ajustar seus filtros de busca ou adicione um novo cliente.</p>
                </div>
            )}
        </div>
      ) : (
        <div className="space-y-6">
            <button onClick={onOpenRouteCreator} className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-500 transition-colors shadow-lg"><RulerIcon className="w-5 h-5" /><span>Criar Nova Rota</span></button>
            {routes.map((route) => (
                <RouteSection 
                    key={route.id} 
                    route={route} 
                    customers={customers} 
                    billings={billings} 
                    warnings={warnings}
                    onBillCustomer={onBillCustomer}
                    onEditCustomer={onEditCustomer}
                    onDeleteCustomer={onDeleteCustomer}
                    onPayDebtCustomer={onPayDebtCustomer}
                    onHistoryCustomer={onHistoryCustomer}
                    showNotification={showNotification}
                    onFocusCustomer={setFocusedCustomer}
                    onFichaActions={onFichaActions}
                    onLocationActions={onLocationActions}
                    onWhatsAppActions={onWhatsAppActions}
                    onFinalizePendingPayment={onFinalizePendingPayment}
                    onPendingPaymentAction={onPendingPaymentAction}
                    onAddWarning={onAddWarning}
                    onResolveWarning={onResolveWarning}
                    areValuesHidden={areValuesHidden}
                    onUpdateCustomer={onUpdateCustomer}
                    onWarningClick={handleWarningClick}
                    onDeleteRoute={onDeleteRoute}
                />
            ))}
            {routes.length === 0 && <div className="text-center py-16 text-slate-500 dark:text-slate-400 italic">Nenhuma rota salva. Clique em "Criar Nova Rota" para começar.</div>}
        </div>
      )}

      {/* Modals */}
      <CityListModal 
        isOpen={isCityListModalOpen} 
        onClose={() => setIsCityListModalOpen(false)} 
        cities={sortedCities} 
        onSelectCity={handleOpenCityCustomers} 
      />

      {viewingCity && (<CityCustomersModal city={viewingCity} customers={customersByCity[viewingCity] || []} warnings={warnings} billings={billings} onClose={() => setViewingCity(null)} onBillCustomer={onBillCustomer} onEditCustomer={onEditCustomer} onDeleteCustomer={onDeleteCustomer} onPayDebtCustomer={onPayDebtCustomer} onHistoryCustomer={onHistoryCustomer} showNotification={showNotification} onFocusCustomer={setFocusedCustomer} onFichaActions={onFichaActions} onLocationActions={onLocationActions} onWhatsAppActions={onWhatsAppActions} onFinalizePendingPayment={onFinalizePendingPayment} onPendingPaymentAction={onPendingPaymentAction} onAddWarning={onAddWarning} onResolveWarning={onResolveWarning} onWarningClick={handleWarningClick} areValuesHidden={areValuesHidden} onUpdateCustomer={onUpdateCustomer} />)}
      {focusedCustomer && <FullScreenCustomerView customer={focusedCustomer} onClose={() => setFocusedCustomer(null)} warnings={warnings} onWarningClick={handleWarningClick} />}
      <WarningDetailsModal isOpen={!!viewingWarning} onClose={() => setViewingWarning(null)} customer={viewingWarning?.customer || null} warning={viewingWarning?.warning || null} />
      <HistoryModal isOpen={!!historyCustomer} onClose={() => setHistoryCustomer(null)} customer={historyCustomer} billings={billings} equipments={allEquipments} />
    </div>
  );
};

export default ClientesView;
