import React, { useState, useMemo } from 'react';
import { Customer, Equipment, Billing, Warning, DebtPayment } from '../types';
import { CreditCardIcon } from '../components/icons/CreditCardIcon';
import { PrinterIcon } from '../components/icons/PrinterIcon';
import { usePagination } from '../hooks/usePagination';
import { InfiniteScrollTrigger } from '../components/InfiniteScrollTrigger';

interface IndustrialViewProps {
    customers: Customer[];
    billings: Billing[];
    debtPayments: DebtPayment[];
    warnings: Warning[];
    onStartBilling: (customer: Customer, equipment: Equipment) => void;
    onFinalizeBilling: (billing: Billing) => void;
    onViewBilling: (billing: Billing | DebtPayment) => void;
    onDeleteBilling: (item: Billing | DebtPayment) => void;
    onPayDebtCustomer: (customer: Customer) => void;
    onOpenDigitalBilling: (customer: Customer) => void;
    onResolveWarning: (warningId: string) => void;
    onPrintDebtStatement: (customer: Customer) => void;
    onOpenEsp32Dashboard: (herokuId: string, machineName: string, customerMpStoreId?: string) => void;
}

const IndustrialView: React.FC<IndustrialViewProps> = ({ 
    customers, 
    billings, 
    debtPayments,
    warnings, 
    onStartBilling, 
    onFinalizeBilling, 
    onViewBilling, 
    onDeleteBilling, 
    onPayDebtCustomer, 
    onOpenDigitalBilling, 
    onResolveWarning, 
    onPrintDebtStatement,
    onOpenEsp32Dashboard
}) => {
    const [equipmentNumber, setEquipmentNumber] = useState('');
    const [error, setError] = useState('');
    const [tapCount, setTapCount] = useState(0);
    const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'debtors' | 'warnings' | 'mp_digital'>('pending');
    
    // Modal de Aviso Ativo
    const [activeWarningModal, setActiveWarningModal] = useState<{ 
        isOpen: boolean; 
        warning: Warning | null; 
        customer: Customer | null; 
        equipment: Equipment | null;
    }>({ isOpen: false, warning: null, customer: null, equipment: null });

    const pendingBillings = useMemo(() => {
        return billings.filter(b => b.paymentMethod === 'pending_payment');
    }, [billings]);

    const billingHistory = useMemo(() => {
        const combined = [
            ...billings
                .filter(b => b.paymentMethod !== 'pending_payment')
                .map(b => ({ ...b, sortDate: new Date(b.settledAt).getTime() })),
            ...debtPayments
                .map(dp => ({ ...dp, sortDate: new Date(dp.paidAt).getTime() }))
        ];
        return combined.sort((a, b) => b.sortDate - a.sortDate);
    }, [billings, debtPayments]);

    const debtorCustomers = useMemo(() => {
        return customers.filter(c => c.debtAmount > 0).sort((a, b) => b.debtAmount - a.debtAmount);
    }, [customers]);

    const activeWarnings = useMemo(() => {
        return warnings.filter(w => !w.isResolved).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [warnings]);

    const mpDigitalCustomers = useMemo(() => 
        customers.filter(c => c.mercadoPagoStoreId), 
    [customers]);

    // Pagination Hooks (15 items per page)
    const { 
        slicedItems: slicedPending, 
        loadMore: loadMorePending, 
        hasMore: hasMorePending 
    } = usePagination(pendingBillings, 15);

    const { 
        slicedItems: slicedHistory, 
        loadMore: loadMoreHistory, 
        hasMore: hasMoreHistory 
    } = usePagination(billingHistory, 15);

    const { 
        slicedItems: slicedDebtors, 
        loadMore: loadMoreDebtors, 
        hasMore: hasMoreDebtors 
    } = usePagination(debtorCustomers, 15);

    const { 
        slicedItems: slicedWarnings, 
        loadMore: loadMoreWarnings, 
        hasMore: hasMoreWarnings 
    } = usePagination(activeWarnings, 15);

    const { 
        slicedItems: slicedMpDigital, 
        loadMore: loadMoreMpDigital, 
        hasMore: hasMoreMpDigital 
    } = usePagination(mpDigitalCustomers, 15);

    const handleTitleClick = () => {
        const newCount = tapCount + 1;
        if (newCount >= 5) {
            localStorage.setItem('industrialMode', 'false');
            localStorage.setItem('lastActiveView', 'DASHBOARD');
            window.location.reload();
            setTapCount(0);
        } else {
            setTapCount(newCount);
            // Reset counter after 2 seconds of inactivity
            setTimeout(() => setTapCount(0), 2000);
        }
    };

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError('');

        if (!equipmentNumber.trim()) {
            setError('Digite o número do equipamento');
            return;
        }

        const lowerCaseNumber = equipmentNumber.toLowerCase().trim();
        let foundCustomer: Customer | null = null;
        let foundEquipment: Equipment | null = null;

        for (const customer of customers) {
            const equipment = customer.equipment.find(e => e.numero?.toLowerCase().trim() === lowerCaseNumber);
            if (equipment) {
                foundCustomer = customer;
                foundEquipment = equipment;
                break;
            }
        }

        if (foundCustomer && foundEquipment) {
            // Verifica se este cliente tem avisos ativos
            const activeWarning = warnings.find(w => w.customerId === foundCustomer!.id && !w.isResolved);
            
            if (activeWarning) {
                // Intercepta com o modal de aviso
                setActiveWarningModal({
                    isOpen: true,
                    warning: activeWarning,
                    customer: foundCustomer,
                    equipment: foundEquipment
                });
            } else {
                onStartBilling(foundCustomer, foundEquipment);
            }
            setEquipmentNumber('');
        } else {
            setError(`Equipamento "${equipmentNumber}" não encontrado.`);
        }
    };

    const handleConfirmWarningAndResolve = () => {
        if (activeWarningModal.warning) {
            onResolveWarning(activeWarningModal.warning.id);
        }
        if (activeWarningModal.customer && activeWarningModal.equipment) {
            onStartBilling(activeWarningModal.customer, activeWarningModal.equipment);
        }
        setActiveWarningModal({ isOpen: false, warning: null, customer: null, equipment: null });
    };

    const handleConfirmWarningAndSnooze = () => {
        if (activeWarningModal.customer && activeWarningModal.equipment) {
            onStartBilling(activeWarningModal.customer, activeWarningModal.equipment);
        }
        setActiveWarningModal({ isOpen: false, warning: null, customer: null, equipment: null });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-white">
            <h1 onClick={handleTitleClick} className="text-4xl font-black mb-8 text-yellow-400 tracking-tighter cursor-pointer select-none">MODO INDUSTRIAL</h1>
            
            <form onSubmit={handleSearch} className="w-full max-w-md space-y-8">
                <div className="space-y-4">
                    <label className="block text-2xl font-bold text-center">NÚMERO DO EQUIPAMENTO</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={equipmentNumber}
                        onChange={(e) => setEquipmentNumber(e.target.value)}
                        className="w-full bg-black border-4 border-yellow-400 text-6xl text-center font-mono py-6 rounded-xl focus:outline-none focus:ring-4 focus:ring-yellow-400/50 text-yellow-400"
                        placeholder="000"
                        autoFocus
                    />
                </div>

                {error && (
                    <div className="bg-red-600 text-white p-4 rounded-lg font-bold text-center text-xl animate-pulse">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    className="w-full bg-yellow-400 text-black text-3xl font-black py-8 rounded-2xl hover:bg-yellow-300 active:scale-95 transition-all shadow-[0_10px_0_0_#ca8a04]"
                >
                    INICIAR COBRANÇA
                </button>
            </form>

            <div className="w-full max-w-2xl mt-12 space-y-6 pb-20">
                {/* Tab Navigation */}
                <div className="w-full max-w-2xl mt-8 grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setActiveTab('pending')}
                        className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border-b-8 ${activeTab === 'pending' ? 'bg-yellow-500 text-black border-yellow-700' : 'bg-slate-900/50 text-slate-500 border-slate-950'}`}
                    >
                        <span className="text-4xl font-black">{pendingBillings.length}</span>
                        <span className="font-bold uppercase tracking-widest text-xs">Pendentes</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border-b-8 ${activeTab === 'history' ? 'bg-blue-600 text-white border-blue-800' : 'bg-slate-900/50 text-slate-500 border-slate-950'}`}
                    >
                        <PrinterIcon className="w-8 h-8" />
                        <span className="font-bold uppercase tracking-widest text-xs">Histórico</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('debtors')}
                        className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border-b-8 ${activeTab === 'debtors' ? 'bg-red-600 text-white border-red-800' : 'bg-slate-900/50 text-slate-500 border-slate-950'}`}
                    >
                        <span className="text-4xl font-black">{debtorCustomers.length}</span>
                        <span className="font-bold uppercase tracking-widest text-xs">Devedores</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('warnings')}
                        className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border-b-8 ${activeTab === 'warnings' ? 'bg-purple-600 text-white border-purple-800' : 'bg-slate-900/50 text-slate-500 border-slate-950'}`}
                    >
                        <span className="text-4xl font-black">{activeWarnings.length}</span>
                        <span className="font-bold uppercase tracking-widest text-xs">Avisos</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('mp_digital')}
                        className={`col-span-2 p-8 rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-95 border-b-8 shadow-lg ${activeTab === 'mp_digital' ? 'bg-green-600 text-white border-green-800 shadow-green-900/40' : 'bg-slate-900/50 text-slate-500 border-slate-950'}`}
                    >
                        <CreditCardIcon className="w-10 h-10" />
                        <span className="text-2xl font-black uppercase tracking-tighter">MP DIGITAL</span>
                    </button>
                </div>

                {/* Tab Content: Pendentes */}
                {activeTab === 'pending' && (
                    <div className="space-y-4">
                        {pendingBillings.length > 0 ? (
                            <>
                                {slicedPending.map(billing => (
                                    <div key={billing.id} className="bg-slate-900 border-2 border-yellow-500/20 p-4 rounded-xl flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-xl font-bold truncate flex items-center gap-2">
                                                {billing.customerName}
                                            </p>
                                            <p className="text-slate-400 font-mono text-sm">
                                                <span className="uppercase">{billing.equipmentType}</span> - {billing.equipmentNumero || 'S/N'}
                                            </p>
                                            <p className="text-yellow-400 font-black">R$ {billing.valorTotal.toFixed(2)}</p>
                                        </div>
                                        <div className="flex flex-col gap-2 shrink-0">
                                            <button
                                                onClick={() => onFinalizeBilling(billing)}
                                                className="bg-yellow-500 text-black font-black px-6 py-4 rounded-lg hover:bg-yellow-400 active:scale-95 transition-all whitespace-nowrap text-lg"
                                            >
                                                FINALIZAR
                                            </button>
                                            {customers.find(c => c.id === billing.customerId)?.mercadoPagoStoreId && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const c = customers.find(c => c.id === billing.customerId);
                                                        if (c) onOpenDigitalBilling(c);
                                                    }}
                                                    className="w-full bg-emerald-600 text-white font-black px-4 py-4 rounded-xl text-lg active:scale-95 transition-all uppercase tracking-tighter shadow-lg"
                                                >
                                                    MP DIGITAL
                                                </button>
                                            )}
                                            {customers.find(c => c.id === billing.customerId)?.equipment.some(e => (e as any).herokuId) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const c = customers.find(c => c.id === billing.customerId);
                                                        const equip = c?.equipment.find(e => (e as any).herokuId);
                                                        if (c && equip) {
                                                            onOpenEsp32Dashboard((equip as any).herokuId, `${c.name} - ${equip.numero}`, c.mercadoPagoStoreId);
                                                        }
                                                    }}
                                                    className="w-full bg-blue-600 text-white font-black px-4 py-4 rounded-xl text-lg active:scale-95 transition-all uppercase tracking-tighter shadow-lg"
                                                >
                                                    CONTROLE PIX
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <InfiniteScrollTrigger 
                                    onIntersect={loadMorePending} 
                                    hasMore={hasMorePending} 
                                    className="border-t-2 border-yellow-500/10 mt-4" 
                                />
                            </>
                        ) : (
                            <p className="text-center text-slate-600 font-bold py-12 italic uppercase tracking-widest">Nenhuma cobrança pendente</p>
                        )}
                    </div>
                )}

                {/* Tab Content: Histórico */}
                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {billingHistory.length > 0 ? (
                            <>
                                {slicedHistory.map((item: any) => {
                                    const isDebt = 'paidAt' in item;
                                    const settledAt = isDebt ? item.paidAt : item.settledAt;
                                    const amount = isDebt ? item.amountPaid : item.valorTotal;

                                    return (
                                        <div key={item.id} className={`p-4 rounded-xl border-2 flex flex-col gap-4 ${isDebt ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-black border-slate-800'}`}>
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="min-w-0">
                                                    <p className="text-lg font-bold truncate text-slate-200 flex items-center gap-2">
                                                        {isDebt && <span className="text-indigo-400 text-[10px] font-black border border-indigo-500 px-1 rounded uppercase">Dívida</span>}
                                                        {item.customerName}
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-mono">
                                                        {new Date(settledAt).toLocaleDateString('pt-BR')} {new Date(settledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <p className="text-sm text-slate-400">
                                                        <span className="uppercase">{item.equipmentType}</span> - {item.equipmentNumero || '(Rec. Dívida)'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`${isDebt ? 'text-indigo-400' : 'text-yellow-500'} font-black text-xl`}>R$ {amount.toFixed(2)}</p>
                                                    <p className="text-[10px] text-slate-600 uppercase font-bold">{item.paymentMethod}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 w-full">
                                                {!isDebt && customers.find(c => c.id === item.customerId)?.mercadoPagoStoreId && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const c = customers.find(c => c.id === item.customerId);
                                                            if (c) onOpenDigitalBilling(c);
                                                        }}
                                                        className="w-full bg-emerald-600 text-white font-bold py-4 px-4 rounded-xl transition-all active:scale-95 shadow-md text-sm"
                                                    >
                                                        MP DIGITAL
                                                    </button>
                                                )}
                                                {!isDebt && customers.find(c => c.id === item.customerId)?.equipment.some(e => (e as any).herokuId) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const c = customers.find(c => c.id === item.customerId);
                                                            const equip = c?.equipment.find(e => (e as any).herokuId);
                                                            if (c && equip) {
                                                                onOpenEsp32Dashboard((equip as any).herokuId, `${c.name} - ${equip.numero}`, c.mercadoPagoStoreId);
                                                            }
                                                        }}
                                                        className="w-full bg-blue-600 text-white font-bold py-4 px-4 rounded-xl transition-all active:scale-95 shadow-md text-sm"
                                                    >
                                                        CONTROLE PIX
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex gap-2 pt-2 border-t border-slate-800/50">
                                                <button
                                                    onClick={() => onViewBilling(item)}
                                                    className="flex-1 bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700 active:scale-95 transition-all text-xs"
                                                >
                                                    VER DETALHES
                                                </button>
                                                <button
                                                    onClick={() => onDeleteBilling(item)}
                                                    className="flex-1 bg-red-900/20 text-red-500 border border-red-900/30 py-3 rounded-lg font-bold hover:bg-red-900/40 active:scale-95 transition-all text-xs"
                                                >
                                                    EXCLUIR
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <InfiniteScrollTrigger 
                                    onIntersect={loadMoreHistory} 
                                    hasMore={hasMoreHistory} 
                                    className="border-t-2 border-blue-500/10 mt-4" 
                                />
                            </>
                        ) : (
                            <p className="text-center text-slate-600 font-bold py-12 italic uppercase tracking-widest">Nenhuma cobrança realizada ainda</p>
                        )}
                    </div>
                )}

                {/* Tab Content: Devedores */}
                {activeTab === 'debtors' && (
                    <div className="space-y-4">
                        {debtorCustomers.length > 0 ? (
                            <>
                                {slicedDebtors.map(customer => (
                                    <div key={customer.id} className="bg-red-900/10 border-2 border-red-900/30 p-4 rounded-xl flex flex-col gap-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="min-w-0">
                                                <p className="text-lg font-bold truncate text-white">{customer.name}</p>
                                                <p className="text-xs text-slate-500 truncate">{customer.cidade || 'Local não informado'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-red-500 font-black text-xl">R$ {customer.debtAmount.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onPayDebtCustomer(customer)}
                                                className="flex-[2] bg-red-600 text-white font-black py-4 rounded-lg hover:bg-red-500 active:scale-95 transition-all uppercase tracking-widest text-sm"
                                            >
                                                RECEBER DÍVIDA
                                            </button>
                                            <button
                                                onClick={() => onPrintDebtStatement(customer)}
                                                className="flex-1 bg-white text-black font-black py-4 rounded-lg hover:bg-slate-200 active:scale-95 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-1"
                                            >
                                                <PrinterIcon className="w-4 h-4" />
                                                IMPRIMIR FICHA
                                            </button>
                                            {customer.mercadoPagoStoreId && (
                                                <button
                                                    onClick={() => onOpenDigitalBilling(customer)}
                                                    className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-lg hover:bg-emerald-500 active:scale-95 transition-all uppercase tracking-widest text-sm shadow-lg"
                                                >
                                                    MP DIGITAL
                                                </button>
                                            )}
                                            {customer.equipment.some(e => (e as any).herokuId) && (
                                                <button
                                                    onClick={() => {
                                                        const equip = customer.equipment.find(e => (e as any).herokuId);
                                                        if (equip) {
                                                            onOpenEsp32Dashboard((equip as any).herokuId, `${customer.name} - ${equip.numero}`, customer.mercadoPagoStoreId);
                                                        }
                                                    }}
                                                    className="flex-1 bg-blue-600 text-white font-black py-4 rounded-lg hover:bg-blue-500 active:scale-95 transition-all uppercase tracking-widest text-sm shadow-lg"
                                                >
                                                    PIX
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <InfiniteScrollTrigger 
                                    onIntersect={loadMoreDebtors} 
                                    hasMore={hasMoreDebtors} 
                                    className="border-t-2 border-red-500/10 mt-4" 
                                />
                            </>
                        ) : (
                            <p className="text-center text-slate-600 font-bold py-12 italic uppercase tracking-widest">Nenhum cliente devedor</p>
                        )}
                    </div>
                )}

                {/* Tab Content: Avisos */}
                {activeTab === 'warnings' && (
                    <div className="space-y-4">
                        {activeWarnings.length > 0 ? (
                            <>
                                {slicedWarnings.map(warning => (
                                    <div key={warning.id} className={`p-4 rounded-xl border-2 flex flex-col gap-2 ${warning.level === 'critical' || warning.level === 'high' ? 'bg-red-900/20 border-red-500/50' : 'bg-orange-900/20 border-orange-500/50'}`}>
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="font-black text-white uppercase tracking-tighter">{warning.customerName}</p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${warning.level === 'critical' || warning.level === 'high' ? 'bg-red-600 text-white' : 'bg-orange-500 text-black'}`}>
                                                {warning.level}
                                            </span>
                                        </div>
                                        <p className="text-slate-300 text-sm font-bold">{warning.message}</p>
                                        <button
                                            onClick={() => onResolveWarning(warning.id)}
                                            className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-black text-xs transition-all"
                                        >
                                            MARCAR COMO RESOLVIDO
                                        </button>
                                    </div>
                                ))}
                                <InfiniteScrollTrigger 
                                    onIntersect={loadMoreWarnings} 
                                    hasMore={hasMoreWarnings} 
                                    className="border-t-2 border-purple-500/10 mt-4" 
                                />
                            </>
                        ) : (
                            <p className="text-center text-slate-600 font-bold py-12 italic uppercase tracking-widest">Nenhum aviso pendente</p>
                        )}
                    </div>
                )}

                {/* Tab Content: MP DIGITAL Selection */}
                {activeTab === 'mp_digital' && (
                    <div className="space-y-4">
                        <p className="text-center text-green-500 font-black uppercase tracking-widest text-sm mb-4">Selecione a Loja para Sincronizar</p>
                        {mpDigitalCustomers.length > 0 ? (
                            <>
                                {slicedMpDigital.map(customer => (
                                     <button
                                        key={customer.id}
                                        onClick={() => onOpenDigitalBilling(customer)}
                                        className="w-full bg-slate-900 border-2 border-green-500/20 p-6 rounded-2xl flex items-center justify-between gap-4 active:scale-95 transition-all text-left group hover:border-green-500/50"
                                     >
                                        <div className="min-w-0">
                                            <p className="text-2xl font-black text-white uppercase tracking-tighter group-hover:text-green-400 transition-colors">{customer.name}</p>
                                            <p className="text-slate-500 font-mono text-xs mt-1">ID LOJA: {customer.mercadoPagoStoreId}</p>
                                            <p className="text-slate-400 text-sm mt-2 font-bold italic">{customer.cidade || 'Local não informado'}</p>
                                        </div>
                                         <div className="flex gap-2">
                                            <div className="bg-green-500/10 p-4 rounded-xl text-green-500 group-hover:bg-green-500 group-hover:text-black transition-all">
                                                <CreditCardIcon className="w-8 h-8" />
                                            </div>
                                         </div>
                                     </button>
                                ))}
                                <InfiniteScrollTrigger 
                                    onIntersect={loadMoreMpDigital} 
                                    hasMore={hasMoreMpDigital} 
                                    className="border-t-2 border-green-500/10 mt-4" 
                                />
                            </>
                        ) : (
                            <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 p-12 rounded-3xl text-center">
                                <p className="text-slate-600 font-bold italic uppercase tracking-widest">Nenhuma loja Mercado Pago configurada</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Aviso Interceptador */}
            {activeWarningModal.isOpen && activeWarningModal.warning && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
                    <div className="w-full max-w-md bg-slate-900 border-4 border-red-500 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-in fade-in zoom-in duration-300">
                        <div className="bg-red-600 p-6 flex flex-col items-center text-center gap-2">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Aviso Crítico</h2>
                            <p className="text-white/80 font-bold uppercase text-sm tracking-widest">Atenção Necessária</p>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Cliente</p>
                                <p className="text-2xl font-black text-white uppercase tracking-tight">{activeWarningModal.customer?.name}</p>
                            </div>
                            
                            <div className="bg-red-500/10 border-2 border-red-500/20 p-4 rounded-2xl">
                                <p className="text-red-400 font-black mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                    MENSAGEM DO SISTEMA:
                                </p>
                                <p className="text-white text-lg font-bold leading-tight">
                                    {activeWarningModal.warning.message}
                                </p>
                            </div>

                            <div className="space-y-3 pt-4">
                                <button
                                    onClick={handleConfirmWarningAndResolve}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white py-5 rounded-2xl font-black text-xl transition-all active:scale-95 flex flex-col items-center justify-center gap-1"
                                >
                                    <span>RESOLVIDO AGORA</span>
                                    <span className="text-[10px] opacity-70 uppercase font-black">Limpar aviso e faturar</span>
                                </button>
                                
                                <button
                                    onClick={handleConfirmWarningAndSnooze}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-2xl font-black text-sm transition-all active:scale-95"
                                >
                                    AINDA NÃO RESOLVIDO, APENAS FATURAR
                                </button>

                                <button
                                    onClick={() => setActiveWarningModal({ isOpen: false, warning: null, customer: null, equipment: null })}
                                    className="w-full text-slate-500 font-bold py-2 hover:text-slate-400 transition-all text-xs"
                                >
                                    CANCELAR COBRANÇA
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-20 text-slate-500 font-bold uppercase tracking-widest text-sm">
                PIX MONTANHA v1.0
            </div>

            <style>{`
                .industrial-mode body {
                    background-color: #000 !important;
                }
                .industrial-mode input::placeholder {
                    color: #444;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default IndustrialView;
