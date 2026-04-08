import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Billing, Customer, DebtPayment } from '../types';
import PageHeader from '../components/PageHeader';
import { SearchIcon } from '../components/icons/SearchIcon';
import { BilliardIcon } from '../components/icons/BilliardIcon';
import { JukeboxIcon } from '../components/icons/JukeboxIcon';
import { CraneIcon } from '../components/icons/CraneIcon';
import { DocumentDuplicateIcon } from '../components/icons/DocumentDuplicateIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import ActionModal from '../components/ActionModal';
import { CurrencyDollarIcon } from '../components/icons/CurrencyDollarIcon';
import { ListBulletIcon } from '../components/icons/ListBulletIcon';
import { nativePrintPDF } from '../utils/nativePrint';
import { usePagination } from '../hooks/usePagination';
import { InfiniteScrollTrigger } from '../components/InfiniteScrollTrigger';

interface CobrancasViewProps {
    billings: Billing[];
    customers: Customer[];
    debtPayments: DebtPayment[];
    onShowActions: (billing: Billing) => void;
    onEditBilling: (billing: Billing) => void;
    onDeleteBilling: (billing: Billing | DebtPayment) => void;
    onFinalizePayment: (billing: Billing) => void;
    onPayDebtCustomer: (customer: Customer) => void;
    onPrintDebtStatement: (customer: Customer) => void;
    areValuesHidden: boolean;
}

type SortKey = 'settledAt' | 'customerName' | 'valorTotal' | 'paidAt' | 'amountPaid';
type SortDirection = 'asc' | 'desc';
type EquipmentFilter = 'all' | 'mesa' | 'jukebox' | 'grua';
type MainTab = 'billings' | 'debtors';

const PaymentMethodDisplay: React.FC<{ method?: Billing['paymentMethod'] }> = React.memo(({ method }) => {
    if(!method) return null;
    const displayMethod = method === 'debito_negativo' ? 'negativo' : method === 'pending_payment' ? 'pendente' : method;
    const styles: Record<string, string> = {
        pix: 'bg-lime-100 dark:bg-lime-900/50 text-lime-800 dark:text-lime-300 border-lime-300 dark:border-lime-600',
        dinheiro: 'bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-600',
        negativo: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-600',
        misto: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-600',
        pendente: 'bg-slate-100 dark:bg-slate-600/50 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-500',
    };
    const text: Record<string, string> = {
        pix: 'PIX',
        dinheiro: 'Dinheiro',
        negativo: 'Negativo',
        misto: 'Misto',
        pendente: 'Pendente'
    };

    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${styles[displayMethod]}`}>
            {text[displayMethod]}
        </span>
    );
});

const TabButton: React.FC<{label: string, active: boolean, onClick: () => void}> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${
            active
                ? 'bg-lime-500 text-white shadow-md'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
        }`}
    >
        {label}
    </button>
);

// --- Prop Interfaces for Sub-components ---
interface BillingsListProps {
    billings: Billing[];
    onEdit: (billing: Billing) => void;
    onDelete: (billing: Billing) => void;
    onShowActions: (billing: Billing) => void;
    totalBilled: number;
    handleSort: (key: SortKey) => void;
    renderSortArrow: (key: SortKey) => React.ReactNode;
    getNetBilledAmount: (billing: Billing) => number;
    areValuesHidden: boolean;
    visibleItems: Billing[];
    loadMore: () => void;
    hasMore: boolean;
}

interface DebtorsListProps {
    debtorCustomers: Customer[];
    totalDebt: number;
    onPrint: () => void;
    onPayDebtCustomer: (customer: Customer) => void;
    onPrintDebtStatement: (customer: Customer) => void;
    areValuesHidden: boolean;
    visibleItems: Customer[];
    loadMore: () => void;
    hasMore: boolean;
}

// --- Sub-components for each tab ---

const BillingsList: React.FC<BillingsListProps> = ({ 
    billings, onEdit, onDelete, onShowActions, totalBilled, handleSort, renderSortArrow, getNetBilledAmount, areValuesHidden, visibleItems, loadMore, hasMore 
}) => (
    <>
        {/* Mobile View: Cards */}
        <div className="md:hidden space-y-4 mb-10">
            {visibleItems.length > 0 ? visibleItems.map((item: any) => {
                const isDebt = 'paidAt' in item;
                const settledAt = isDebt ? item.paidAt : item.settledAt;
                
                return (
                    <div key={item.id} className={`${isDebt ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'} p-4 rounded-lg shadow-md border`}>
                        <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-grow">
                                <p className="font-bold text-slate-900 dark:text-white break-words">
                                    {isDebt && <span className="text-indigo-600 dark:text-indigo-400 mr-1 text-[10px] uppercase font-black">[DÍVIDA]</span>}
                                    {item.customerName}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(settledAt).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className={`${isDebt ? 'text-indigo-600 dark:text-indigo-400' : 'text-lime-600 dark:text-lime-400'} font-mono font-bold text-lg`}>
                                    {areValuesHidden ? 'R$ •••,••' : `R$ ${(isDebt ? item.amountPaid : getNetBilledAmount(item)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </p>
                                {item.valorDebitoNegativo && item.valorDebitoNegativo > 0 && (
                                    <p className="font-mono text-sm text-red-500 dark:text-red-400">
                                        Dívida: {areValuesHidden ? 'R$ •••,••' : `R$ ${item.valorDebitoNegativo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    </p>
                                )}
                                <div className="mt-1"><PaymentMethodDisplay method={item.paymentMethod} /></div>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <span className="flex items-center gap-2 text-sm">
                                {item.equipmentType === 'mesa' ? <BilliardIcon className="w-4 h-4 text-cyan-500 dark:text-cyan-400" /> : 
                                 item.equipmentType === 'jukebox' ? <JukeboxIcon className="w-4 h-4 text-fuchsia-500 dark:text-fuchsia-400" /> :
                                 <CraneIcon className="w-4 h-4 text-orange-500 dark:text-orange-400" />}
                                <span className="text-slate-600 dark:text-slate-300">
                                    {item.equipmentType === 'mesa' ? `Mesa ${item.equipmentNumero || '(Rec. Dívida)'}` : 
                                     item.equipmentType === 'jukebox' ? `Jukebox ${item.equipmentNumero || '(Rec. Dívida)'}` :
                                     `Grua ${item.equipmentNumero || '(Rec. Dívida)'}`}
                                </span>
                            </span>
                            <div className="flex gap-4">
                                <button onClick={() => onShowActions(item)} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Ações</button>
                                {!isDebt && item.equipmentType === 'grua' && (
                                    <button onClick={() => onEdit(item)} className="p-1 text-sky-500 dark:text-sky-400" title='Editar Cobrança'><PencilIcon className="w-5 h-5" /></button>
                                )}
                                <button onClick={() => onDelete(item)} className="p-1 text-red-500 dark:text-red-400" title='Excluir'><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </div>
                );
            }) : <p className="text-center py-16 text-slate-500 dark:text-slate-400 italic">Nenhuma cobrança encontrada.</p>}
            <InfiniteScrollTrigger onIntersect={loadMore} hasMore={hasMore} />
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block bg-white/75 dark:bg-slate-800/75 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden mb-10">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('settledAt')}>Data {renderSortArrow('settledAt')}</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('customerName')}>Cliente {renderSortArrow('customerName')}</th>
                            <th scope="col" className="px-6 py-3">Equipamento</th>
                            <th scope="col" className="px-6 py-3">Pagamento</th>
                            <th scope="col" className="px-6 py-3 text-right cursor-pointer" onClick={() => handleSort('valorTotal')}>Valor Arrecadado / Dívida</th>
                            <th scope="col" className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleItems.length > 0 ? visibleItems.map((item: any) => {
                                const isDebt = 'paidAt' in item;
                                const settledAt = isDebt ? item.paidAt : item.settledAt;
                                
                                return (
                                    <tr key={item.id} className={`${isDebt ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : 'bg-white dark:bg-slate-800'} border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50`}>
                                        <td className="px-6 py-4">{new Date(settledAt).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                            {isDebt && <span className="text-indigo-500 dark:text-indigo-400 mr-2 text-[10px] font-black uppercase border border-indigo-400 dark:border-indigo-600 px-1 rounded">Dívida</span>}
                                            {item.customerName}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-2">
                                                {item.equipmentType === 'mesa' ? <BilliardIcon className="w-4 h-4 text-cyan-500 dark:text-cyan-400" /> : 
                                                 item.equipmentType === 'jukebox' ? <JukeboxIcon className="w-4 h-4 text-fuchsia-500 dark:text-fuchsia-400" /> :
                                                 <CraneIcon className="w-4 h-4 text-orange-500 dark:text-orange-400" />}
                                                {item.equipmentType === 'mesa' ? `Mesa ${item.equipmentNumero || '(Rec. Dívida)'}` : 
                                                 item.equipmentType === 'jukebox' ? `Jukebox ${item.equipmentNumero || '(Rec. Dívida)'}` :
                                                 `Grua ${item.equipmentNumero || '(Rec. Dívida)'}`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4"><PaymentMethodDisplay method={item.paymentMethod} /></td>
                                        <td className="px-6 py-4 text-right font-mono font-bold">
                                            <div className="flex flex-col items-end">
                                                <span className={isDebt ? "text-indigo-600 dark:text-indigo-400" : "text-lime-600 dark:text-lime-400"}>
                                                    {areValuesHidden ? 'R$ •••,••' : `R$ ${(isDebt ? item.amountPaid : getNetBilledAmount(item)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                </span>
                                                {item.valorDebitoNegativo && item.valorDebitoNegativo > 0 && (
                                                    <span className="text-xs text-red-500 dark:text-red-400">
                                                        (Dívida: {areValuesHidden ? 'R$ •••,••' : `R$ ${item.valorDebitoNegativo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center items-center gap-4">
                                                <button onClick={() => onShowActions(item)} className="text-slate-500 hover:text-indigo-500" title="Mais Ações">Ações</button>
                                                {!isDebt && item.equipmentType === 'grua' && (
                                                    <button onClick={() => onEdit(item)} className="text-slate-500 hover:text-sky-500" title='Editar Cobrança'><PencilIcon className="w-5 h-5" /></button>
                                                )}
                                                <button onClick={() => onDelete(item)} className="text-slate-500 hover:text-red-500" title='Excluir'><TrashIcon className="w-5 h-5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }
                        ) : (
                           <tr><td colSpan={6} className="text-center py-16 text-slate-500 dark:text-slate-400 italic">Nenhuma cobrança encontrada.</td></tr>
                        )}
                        <tr>
                            <td colSpan={6}>
                                <InfiniteScrollTrigger onIntersect={loadMore} hasMore={hasMore} />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </>
);

const DebtorsList: React.FC<DebtorsListProps> = ({ debtorCustomers, totalDebt, onPrint, onPayDebtCustomer, onPrintDebtStatement, areValuesHidden, visibleItems, loadMore, hasMore }) => (
    <>
        {/* Mobile View: Cards */}
        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {visibleItems.length > 0 ? visibleItems.map((customer: Customer) => (
                <div key={customer.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 flex flex-col">
                    <div className="text-center flex-grow">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{customer.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{customer.cidade}, {customer.estado}</p>
                        <p className="font-mono font-bold text-2xl text-red-500 dark:text-red-400 my-3">
                            {areValuesHidden ? 'R$ •••,••' : `R$ ${customer.debtAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </p>
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                        <button
                            onClick={() => onPrintDebtStatement(customer)}
                            className="w-full bg-sky-600 text-white font-bold py-2 px-3 rounded-md hover:bg-sky-500 text-sm flex items-center justify-center gap-2"
                        >
                           <DocumentDuplicateIcon className="w-5 h-5" /> Demonstrativo
                        </button>
                        <button
                            onClick={() => onPayDebtCustomer(customer)}
                            className="w-full bg-amber-600 text-white font-bold py-2 px-3 rounded-md hover:bg-amber-500 text-sm flex items-center justify-center gap-2"
                        >
                           <CurrencyDollarIcon className="w-5 h-5" /> Pagar/Adicionar
                        </button>
                    </div>
                </div>
            )) : (
                <div className="col-span-1 sm:col-span-2 text-center py-16 px-6 bg-slate-100 dark:bg-slate-800/50 rounded-lg shadow-inner">
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Nenhuma Dívida Pendente</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Todos os clientes estão com os pagamentos em dia.</p>
                </div>
            )}
            <div className="col-span-1 sm:col-span-2">
                <InfiniteScrollTrigger onIntersect={loadMore} hasMore={hasMore} />
            </div>
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block bg-white/75 dark:bg-slate-800/75 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Clientes Devedores ({debtorCustomers.length})</h3>
                <button onClick={onPrint} className="inline-flex items-center gap-2 bg-sky-600 text-white font-bold py-2 px-4 rounded-md hover:bg-sky-500">
                    <DocumentDuplicateIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Imprimir Lista</span>
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left">Cliente</th>
                            <th scope="col" className="px-6 py-3 text-left">Cidade</th>
                            <th scope="col" className="px-6 py-3 text-right">Valor da Dívida</th>
                            <th scope="col" className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleItems.length > 0 ? visibleItems.map((customer: Customer) => (
                            <tr key={customer.id} className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{customer.name}</td>
                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{customer.cidade}</td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-red-500 dark:text-red-400">{areValuesHidden ? 'R$ •••,••' : `R$ ${customer.debtAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <button onClick={() => onPayDebtCustomer(customer)} className="bg-amber-600 text-white font-bold py-1 px-3 rounded-md hover:bg-amber-500 text-xs">Pagar/Adicionar</button>
                                        <button onClick={() => onPrintDebtStatement(customer)} className="bg-slate-600 text-white font-bold py-1 px-3 rounded-md hover:bg-slate-500 text-xs">Demonstrativo</button>
                                    </div>
                                </td>
                            </tr>
                        )) : (<tr><td colSpan={4} className="text-center py-16 text-slate-500 dark:text-slate-400 italic">Nenhum cliente com dívida pendente.</td></tr>)}
                        <tr>
                            <td colSpan={4}>
                                <InfiniteScrollTrigger onIntersect={loadMore} hasMore={hasMore} />
                            </td>
                        </tr>
                    </tbody>
                    <tfoot className="bg-slate-100 dark:bg-slate-700/50 font-bold text-slate-900 dark:text-white">
                        <tr>
                            <td colSpan={2} className="text-right px-6 py-3 uppercase">Total Geral de Dívidas</td>
                            <td className="text-right px-6 py-3 font-mono text-lg text-red-500 dark:text-red-400">{areValuesHidden ? 'R$ •••,••' : `R$ ${totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        {/* Total for mobile */}
        {debtorCustomers.length > 0 && (
            <div className="md:hidden mt-4 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-md flex justify-between items-center font-bold text-slate-900 dark:text-white">
                <span>TOTAL DE DÍVIDAS</span>
                <span className="font-mono text-lg text-red-500 dark:text-red-400">
                    {areValuesHidden ? 'R$ •••,••' : `R$ ${totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
            </div>
        )}
    </>
);

const CobrancasView: React.FC<CobrancasViewProps> = ({ 
    billings, 
    customers, 
    debtPayments,
    onShowActions,
    onEditBilling,
    onDeleteBilling,
    onFinalizePayment,
    onPayDebtCustomer,
    onPrintDebtStatement,
    areValuesHidden,
}) => {
    const [activeTab, setActiveTab] = useState<MainTab>('billings');
    const [sortKey, setSortKey] = useState<SortKey>('settledAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>('all');
    const [deletingBilling, setDeletingBilling] = useState<Billing | null>(null);
    
    const getInitialDateRange = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
            start: firstDay.toISOString().split('T')[0],
            end: lastDay.toISOString().split('T')[0]
        };
    };
    const [dateRange, setDateRange] = useState(getInitialDateRange);

    const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDateRange(prev => ({ ...prev, [name]: value }));
    }, []);

    const filteredAndSortedData = useMemo(() => {
        const combined = [
            ...billings.map(b => ({ ...b, sortDate: new Date(b.settledAt).getTime() })),
            ...debtPayments.map(dp => ({ ...dp, sortDate: new Date(dp.paidAt).getTime() }))
        ];

        let items = combined;
        if(activeTab === 'billings') {
            items = combined.filter(item => {
                if (equipmentFilter !== 'all' && item.equipmentType !== equipmentFilter) return false;
                if (searchQuery && !item.customerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                
                const itemDate = new Date(item.sortDate);
                if (dateRange.start && new Date(dateRange.start + 'T00:00:00') > itemDate) return false;
                if (dateRange.end && new Date(dateRange.end + 'T23:59:59') < itemDate) return false;
                return true;
            });
        }
    
        return items.sort((a, b) => {
            let valA: any, valB: any;
            
            if (sortKey === 'settledAt' || sortKey === 'paidAt') {
                valA = a.sortDate;
                valB = b.sortDate;
            } else if (sortKey === 'valorTotal' || sortKey === 'amountPaid') {
                valA = 'amountPaid' in a ? a.amountPaid : ('valorTotal' in a ? a.valorTotal : 0);
                valB = 'amountPaid' in b ? b.amountPaid : ('valorTotal' in b ? b.valorTotal : 0);
            } else {
                valA = (a as any)[sortKey];
                valB = (b as any)[sortKey];
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [activeTab, billings, debtPayments, equipmentFilter, searchQuery, dateRange, sortKey, sortDirection]);

    const { pendingBillings, completedBillings } = useMemo(() => {
        const pending: any[] = [];
        const completed: any[] = [];
        filteredAndSortedData.forEach(item => {
            if ('paymentMethod' in item && item.paymentMethod === 'pending_payment') {
                pending.push(item);
            } else {
                completed.push(item);
            }
        });
        return { pendingBillings: pending, completedBillings: completed };
    }, [filteredAndSortedData]);

    const { debtorCustomers, totalDebt } = useMemo(() => {
        const debtors = customers.filter(c => c.debtAmount > 0).sort((a,b) => b.debtAmount - a.debtAmount);
        const debt = customers.reduce((sum, c) => sum + c.debtAmount, 0);
        return { debtorCustomers: debtors, totalDebt: debt };
    }, [customers]);

    const { 
        slicedItems: completedBillingsSliced, 
        loadMore: loadMoreBillings, 
        hasMore: hasMoreBillings, 
        reset: resetBillings 
    } = usePagination(completedBillings, 15);

    const { 
        slicedItems: debtorCustomersSliced, 
        loadMore: loadMoreDebtors, 
        hasMore: hasMoreDebtors, 
        reset: resetDebtors 
    } = usePagination(debtorCustomers, 15);

    // Reset pagination when searching or changing filters
    useEffect(() => {
        resetBillings();
    }, [searchQuery, equipmentFilter, dateRange, resetBillings]);

    useEffect(() => {
        resetDebtors();
    }, [searchQuery, resetDebtors]);

    const handleSort = useCallback((key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('desc');
        }
    }, [sortKey]);
    
    const renderSortArrow = (key: SortKey) => (sortKey === key) ? (sortDirection === 'asc' ? '▲' : '▼') : null;

    const getNetBilledAmount = useCallback((billing: Billing): number => {
      if (billing.equipmentType === 'grua') {
        return (billing.recebimentoEspecie || 0) + (billing.recebimentoPix || 0);
      }
      return (billing.valorPagoDinheiro || 0) + (billing.valorPagoPix || 0);
    }, []);

    const totalBilled = useMemo(() => {
        return completedBillings.reduce((sum, item) => {
            if ('paidAt' in item) { // DebtPayment
                return sum + item.amountPaid;
            }
            return sum + getNetBilledAmount(item);
        }, 0);
    }, [completedBillings, getNetBilledAmount]);
    
    const handlePrintDebtors = useCallback(async () => {
        const typeMap: Record<string, string> = { mesa: 'M. Sinuca', jukebox: 'Jukebox', grua: 'Grua' };
        const debtOrigins = new Map<string, Set<string>>();
        billings.forEach(b => {
            if (b.valorDebitoNegativo && b.valorDebitoNegativo > 0) {
                if (!debtOrigins.has(b.customerId)) debtOrigins.set(b.customerId, new Set());
                debtOrigins.get(b.customerId)?.add(typeMap[b.equipmentType] || b.equipmentType);
            }
        });

        const reportHtml = `
            <html>
                <head>
                    <title>Relatório de Clientes Devedores</title>
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 10pt; }
                        @page { size: A4; margin: 20mm; }
                        h1, h2 { text-align: center; }
                        h1 { font-size: 16pt; }
                        h2 { font-size: 12pt; color: #555; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        .currency { text-align: right; font-family: monospace; }
                        .total-row { font-weight: bold; border-top: 2px solid #333; }
                    </style>
                </head>
                <body>
                    <h1>Montanha Bilhar & Jukebox</h1>
                    <h2>Relatório de Clientes Devedores - ${new Date().toLocaleDateString('pt-BR')}</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Cidade</th>
                                <th>Origem da Dívida</th>
                                <th class="currency">Valor da Dívida</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${debtorCustomers.map(customer => `
                                <tr>
                                    <td>${customer.name}</td>
                                    <td>${customer.cidade}</td>
                                    <td>${Array.from(debtOrigins.get(customer.id) || []).join(', ') || 'Pagamento Avulso'}</td>
                                    <td class="currency">R$ ${customer.debtAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td colspan="3">Total Geral de Dívidas</td>
                                <td class="currency">R$ ${totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        </tfoot>
                    </table>
                </body>
            </html>
        `;
        
        nativePrintPDF(reportHtml, `Relatório de Devedores - ${new Date().toLocaleDateString('pt-BR')}`);
    }, [debtorCustomers, totalDebt, billings]);

    const handleConfirmDelete = () => {
        if (deletingBilling) {
            onDeleteBilling(deletingBilling);
            setDeletingBilling(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <PageHeader title="Cobranças e Dívidas" subtitle="Visualize cobranças e dívidas pendentes." />
            
            <div className="bg-white/75 dark:bg-slate-800/75 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 mb-8 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <TabButton label="Histórico de Cobranças" active={activeTab === 'billings'} onClick={() => { setActiveTab('billings'); setSortKey('settledAt'); }} />
                    <TabButton label="Clientes Devedores" active={activeTab === 'debtors'} onClick={() => setActiveTab('debtors')} />
                </div>
                
                {activeTab === 'billings' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                            <button onClick={() => setEquipmentFilter('all')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${equipmentFilter === 'all' ? 'bg-lime-500 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                                <ListBulletIcon className={`w-8 h-8 ${equipmentFilter === 'all' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                                <span className="text-xs font-bold mt-1">Todos</span>
                            </button>
                            <button onClick={() => setEquipmentFilter('mesa')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${equipmentFilter === 'mesa' ? 'bg-lime-500 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                                <BilliardIcon className={`w-8 h-8 ${equipmentFilter === 'mesa' ? 'text-white' : 'text-cyan-600 dark:text-cyan-400'}`} />
                                <span className="text-xs font-bold mt-1">Mesas</span>
                            </button>
                            <button onClick={() => setEquipmentFilter('jukebox')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${equipmentFilter === 'jukebox' ? 'bg-lime-500 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                                <JukeboxIcon className={`w-8 h-8 ${equipmentFilter === 'jukebox' ? 'text-white' : 'text-fuchsia-600 dark:text-fuchsia-400'}`} />
                                <span className="text-xs font-bold mt-1">Jukebox</span>
                            </button>
                            <button onClick={() => setEquipmentFilter('grua')} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${equipmentFilter === 'grua' ? 'bg-lime-500 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                                <CraneIcon className={`w-8 h-8 ${equipmentFilter === 'grua' ? 'text-white' : 'text-orange-600 dark:text-orange-400'}`} />
                                <span className="text-xs font-bold mt-1">Gruas</span>
                            </button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <div className="relative flex-grow w-full">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="w-5 h-5 text-slate-400" /></div>
                                <input type="text" placeholder="Filtrar por nome do cliente..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500"/>
                            </div>
                            <div className="flex-shrink-0 w-full sm:w-auto"><input type="date" name="start" value={dateRange.start} onChange={handleDateChange} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-1.5 px-3" /></div>
                            <div className="flex-shrink-0 w-full sm:w-auto"><input type="date" name="end" value={dateRange.end} onChange={handleDateChange} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-1.5 px-3" /></div>
                        </div>
                    </div>
                )}
            </div>
            
            {pendingBillings.length > 0 && activeTab === 'billings' && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-amber-500 dark:text-amber-400 mb-4">Pagamentos Pendentes</h2>
                    <div className="space-y-4">
                        {pendingBillings.map(billing => (
                            <div key={billing.id} className="bg-amber-100/50 dark:bg-amber-900/40 p-4 rounded-lg shadow-md border-l-4 border-amber-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{billing.customerName}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {new Date(billing.settledAt).toLocaleDateString('pt-BR')} - <span className="capitalize">{billing.equipmentType}</span> {billing.equipmentNumero}
                                    </p>
                                    <p className="font-mono font-bold text-lg text-amber-600 dark:text-amber-400 mt-1">
                                        {areValuesHidden ? 'R$ •••,••' : `R$ ${(billing.valorTotal - (billing.valorBonus || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    </p>
                                </div>
                                {billing.equipmentType !== 'grua' && (
                                    <button onClick={() => onFinalizePayment(billing)} className="w-full sm:w-auto bg-amber-600 text-white font-bold py-2 px-4 rounded-md hover:bg-amber-500">
                                        Finalizar Pagamento
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {activeTab === 'billings' && <BillingsList billings={completedBillings} onEdit={onEditBilling} onDelete={setDeletingBilling} onShowActions={onShowActions} totalBilled={totalBilled} handleSort={handleSort} renderSortArrow={renderSortArrow} getNetBilledAmount={getNetBilledAmount} areValuesHidden={areValuesHidden} visibleItems={completedBillingsSliced} loadMore={loadMoreBillings} hasMore={hasMoreBillings} />}
            {activeTab === 'debtors' && <DebtorsList debtorCustomers={debtorCustomers} totalDebt={totalDebt} onPrint={handlePrintDebtors} onPayDebtCustomer={onPayDebtCustomer} onPrintDebtStatement={onPrintDebtStatement} areValuesHidden={areValuesHidden} visibleItems={debtorCustomersSliced} loadMore={loadMoreDebtors} hasMore={hasMoreDebtors} />}
            
            {deletingBilling && (
                <ActionModal 
                    isOpen={!!deletingBilling} 
                    onClose={() => setDeletingBilling(null)} 
                    onConfirm={handleConfirmDelete} 
                    title="Confirmar Exclusão" 
                    confirmText="Sim, Excluir"
                >
                    <p>
                        Tem certeza que deseja excluir esta {('paidAt' in deletingBilling) ? 'baixa de dívida' : 'cobrança'} para <strong>{deletingBilling.customerName}</strong> no valor de <strong>R$ {((deletingBilling as any).valorTotal ?? (deletingBilling as any).amountPaid ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>?
                    </p>
                    {(!('paidAt' in deletingBilling)) && (
                        <p className="mt-2 text-amber-500 dark:text-amber-300">Esta ação irá reverter a leitura do relógio do equipamento e, se aplicável, o valor da dívida do cliente.</p>
                    )}
                </ActionModal>
            )}
        </div>
    );
};

export default CobrancasView;