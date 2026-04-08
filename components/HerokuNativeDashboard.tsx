import React, { useState, useEffect, useCallback } from 'react';
import { 
    authenticateHeroku, 
    sendHerokuRemoteCredit, 
    getAllHerokuMachines,
    getHerokuMachineById,
    updateHerokuMachine,
    clearHerokuAuth
} from '../utils/herokuStatus';
import { fetchMpBilling, MpSummary, MpPayment, fetchMpDetailedPayments } from '../utils/mercadoPago';
import { XIcon } from './icons/XIcon';
import { nativePrintPDF } from '../utils/nativePrint';

interface HerokuNativeDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    herokuId: string;
    machineName: string;
    customerMpStoreId?: string;
    mercadoPagoToken?: string;
}

export const HerokuNativeDashboard: React.FC<HerokuNativeDashboardProps> = ({ 
    isOpen, 
    onClose, 
    herokuId, 
    machineName,
    customerMpStoreId,
    mercadoPagoToken
}) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [email, setEmail] = useState(() => localStorage.getItem('herokuEmail') || '');
    const [password, setPassword] = useState(() => localStorage.getItem('herokuPassword') || '');
    const [authError, setAuthError] = useState('');
    
    const [machineData, setMachineData] = useState<any>(null);
    const [isLoadingMachine, setIsLoadingMachine] = useState(false);
    
    const [mpSummary, setMpSummary] = useState<MpSummary | null>(null);
    const [detailedPayments, setDetailedPayments] = useState<MpPayment[]>([]);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [reportStart, setReportStart] = useState(() => {
        const d = new Date();
        d.setDate(new Date().getDate() - 30); // Ultimos 30 dias por padrão
        return d.toISOString().split('T')[0];
    });
    const [reportEnd, setReportEnd] = useState(() => new Date().toISOString().split('T')[0]);
    
    const [timeLeft, setTimeLeft] = useState(60);
    const [isSendingCredit, setIsSendingCredit] = useState(false);
    const [creditResult, setCreditResult] = useState<string | null>(null);
    const [resolvedUuid, setResolvedUuid] = useState<string | null>(herokuId || null);
    const [allMachines, setAllMachines] = useState<any[]>([]);
    const [isGlobalMode] = useState(!herokuId);
    const [viewMode, setViewMode] = useState<'list' | 'control'>(!herokuId ? 'list' : 'control');

    useEffect(() => {
        if (isOpen) {
            // Regra Rígida: Sempre forçar novo login ao abrir
            clearHerokuAuth();
            setIsAuthenticated(false);
            setMachineData(null);
            setAllMachines([]);
            if (!herokuId) {
                setViewMode('list');
                setResolvedUuid(null);
            } else {
                setViewMode('control');
                setResolvedUuid(herokuId);
            }
            
            // WAKE UP: Enviar um "ping" silencioso ao Heroku para acordar o dyno (caso esteja em sleep)
            fetch('https://pixjukebox-69052c9b736e.herokuapp.com/').catch(() => {});

            setMpSummary(null);
            setDetailedPayments([]);

            // Note: Cache loading now happens instantly on machine selection or data load
        } else {
            clearHerokuAuth();
        }
    }, [isOpen, herokuId, customerMpStoreId]);

    // Timer de 1 minuto para fechar o painel e deslogar
    useEffect(() => {
        if (isOpen && isAuthenticated) {
            setTimeLeft(60);
            const interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        clearHerokuAuth();
                        onClose();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [isOpen, isAuthenticated, onClose]);

    const loadMachineData = async (uuid?: string) => {
        const targetId = uuid || resolvedUuid;
        if (!targetId) {
            // Modo Listagem Global
            const machines = await getAllHerokuMachines();
            setAllMachines(machines);
            return;
        }

        setIsLoadingMachine(true);
        try {
            const machine = await getHerokuMachineById(targetId);
            if (machine) {
                setMachineData(machine);
                const activeId = machine.mercado_pago_id || customerMpStoreId;
                if (activeId) {
                    const cached = localStorage.getItem(`mp_report_${activeId}`);
                    if (cached) {
                        try {
                            const { summary, detailed } = JSON.parse(cached);
                            setMpSummary(summary);
                            setDetailedPayments(detailed);
                        } catch (e) {}
                    }
                }
            }
        } catch (err) {
            console.error('Load machine error:', err);
        } finally {
            setIsLoadingMachine(false);
        }
    };

    const handleAuthenticate = async () => {
        setIsAuthenticating(true);
        setAuthError('');
        try {
            // Salvar credenciais para conveniência futura
            localStorage.setItem('herokuEmail', email);
            localStorage.setItem('herokuPassword', password);
            
            const token = await authenticateHeroku();
            if (token) {
                setIsAuthenticated(true);
                // Iniciar carregamento de dados imediatamente usando o token recém-criado
                loadMachineData();
            } else {
                setAuthError('E-mail ou senha inválidos no servidor PIX.');
            }
        } catch (err) {
            setAuthError('Erro ao conectar com servidor Heroku.');
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleSendCredit = async (amount: number = 1) => {
        if (!resolvedUuid) return;
        setIsSendingCredit(true);
        setCreditResult(null);
        try {
            const success = await sendHerokuRemoteCredit(resolvedUuid, amount);
            if (success) {
                setCreditResult(`✅ ${amount} Crédito(s) enviado(s)!`);
                await loadMachineData();
            } else {
                setCreditResult('❌ Falha ao enviar crédito.');
            }
        } catch (err) {
            setCreditResult('❌ Erro de comunicação com ESP32.');
        } finally {
            setIsSendingCredit(false);
            setTimeout(() => setCreditResult(null), 4000);
        }
    };

    const handleFetchReport = useCallback(async () => {
        const activeStoreId = machineData?.mercado_pago_id || customerMpStoreId;
        
        console.log('Iniciando sincronização:', { 
            activeStoreId, 
            hasToken: !!mercadoPagoToken, 
            machineId: machineData?.mercado_pago_id,
            propId: customerMpStoreId 
        });

        if (!mercadoPagoToken) {
            alert('Erro: Mercado Pago Access Token não configurado em seu perfill.');
            return;
        }

        if (!activeStoreId) {
            alert('Erro: ID da Loja do Mercado Pago não encontrado para este painel ou máquina.');
            return;
        }

        setIsLoadingReport(true);
        try {
            // Relatório financeiro vem exclusivamente do Mercado Pago para precisão total
            const [, detailed] = await Promise.all([
                fetchMpBilling(activeStoreId, reportStart, reportEnd, mercadoPagoToken),
                fetchMpDetailedPayments(activeStoreId, reportStart, reportEnd, mercadoPagoToken)
            ]);

            // Lógica de "Acúmulo Seguro" (Better High-Watermark)
            // 1. Unimos as transações novas com as que já temos usando o ID como chave única
            const paymentMap = new Map<string, MpPayment>();
            
            // Primeiro adicionamos as que já temos em memória/state
            detailedPayments.forEach(p => paymentMap.set(String(p.id), p));
            
            // Depois adicionamos as novas (sobrescrevendo se o ID já existir para ter os dados mais atualizados)
            detailed.forEach(p => paymentMap.set(String(p.id), p));
            
            const mergedDetailed = Array.from(paymentMap.values())
                .sort((a, b) => new Date(b.date_approved).getTime() - new Date(a.date_approved).getTime());

            // 2. Recalculamos o resumo (MpSummary) com base na lista mesclada COMPLETA
            const mergedSummary: MpSummary = {
                pix: 0,
                credit: 0,
                debit: 0,
                refunds: 0,
                count: mergedDetailed.filter(p => p.status === 'approved').length
            };

            mergedDetailed.forEach(p => {
                const amount = p.transaction_amount || 0;
                if (p.status === 'approved') {
                    if (p.payment_type_id === 'credit_card') mergedSummary.credit += amount;
                    else if (p.payment_type_id === 'debit_card') mergedSummary.debit += amount;
                    else mergedSummary.pix += amount;
                } else if (p.status === 'refunded' || p.status === 'cancelled') {
                    mergedSummary.refunds += amount;
                }
            });

            setMpSummary(mergedSummary);
            setDetailedPayments(mergedDetailed);
            
            // Salvar no cache para persistência apontando exatamente para o Store ID dessa máquina
            localStorage.setItem(`mp_report_${activeStoreId}`, JSON.stringify({
                summary: mergedSummary,
                detailed: mergedDetailed,
                timestamp: new Date().toISOString()
            }));
        } catch (err) {
            console.error('Report fetch error:', err);
            alert('Erro ao buscar dados no Mercado Pago. Verifique o Token e a conexão.');
        } finally {
            setIsLoadingReport(false);
        }
    }, [customerMpStoreId, mercadoPagoToken, reportStart, reportEnd, detailedPayments, machineData]);

    const handlePrintReport = async () => {
        const formatDate = (d: string) => {
            const [y, m, day] = d.split('-');
            return `${day}/${m}/${y}`;
        };

        const rows = mpSummary ? `
            <tr><td>PIX/Dinheiro</td><td style="text-align:right">R$ ${mpSummary.pix.toFixed(2)}</td></tr>
            <tr><td>Crédito</td><td style="text-align:right">R$ ${mpSummary.credit.toFixed(2)}</td></tr>
            <tr><td>Débito</td><td style="text-align:right">R$ ${mpSummary.debit.toFixed(2)}</td></tr>
            <tr><td>Estornos</td><td style="text-align:right">- R$ ${mpSummary.refunds.toFixed(2)}</td></tr>
        ` : '';

        const html = `
            <html><head><style>
                body { font-family: 'Courier New', monospace; width: 54mm; font-size: 11pt; color: #000; margin: 0; padding: 2mm; }
                h3 { text-align: center; font-size: 14pt; margin: 0 0 4px 0; }
                p { text-align: center; margin: 2px 0; font-size: 9pt; }
                table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 8px; }
                td { padding: 4px 0; border-bottom: 1px dotted #ccc; }
                .total-row td { border-top: 2px solid #000; font-weight: 900; font-size: 12pt; }
                hr { border-top: 2px dashed #000; }
            </style></head><body>
                <h3>RELATÓRIO FINANCEIRO (MP)</h3>
                <p>${machineName}</p>
                <p>${formatDate(reportStart)} a ${formatDate(reportEnd)}</p>
                <hr>
                <table>
                    <tbody>
                        ${rows}
                        <tr class="total-row">
                            <td>TOTAL LÍQUIDO</td>
                            <td style="text-align:right">R$ ${((mpSummary?.pix || 0) + (mpSummary?.credit || 0) + (mpSummary?.debit || 0) - (mpSummary?.refunds || 0)).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
                <p style="margin-top:8px; font-size:8pt;">Transações: ${mpSummary?.count || 0}</p>
                <p style="font-size:7pt;">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
            </body></html>
        `;
        
        try {
            await nativePrintPDF(html, 'relatorio-mp.pdf');
        } catch (e) {
            console.error('Print error:', e);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose}></div>
            
            <div className={`relative w-full max-w-xl bg-slate-950 border-x sm:border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh] sm:rounded-3xl transition-transform duration-500 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}>
                
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 backdrop-blur-xl">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-black text-white tracking-tighter uppercase leading-none">PIX MONTANHA</h2>
                        <div className="flex items-center gap-2 mt-2">
                             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Sessão Ativa: {timeLeft}s</span>
                         </div>
                    </div>
                    <button 
                        onClick={() => {
                            if (viewMode === 'control' && isGlobalMode) {
                                setViewMode('list');
                                setResolvedUuid(null);
                                setMachineData(null);
                                setMpSummary(null);
                                setDetailedPayments([]);
                                loadMachineData();
                            } else {
                                onClose();
                            }
                        }} 
                        className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl font-black text-sm transition-all active:scale-95 shadow-lg flex items-center gap-2"
                    >
                        <XIcon className="w-4 h-4" />
                        VOLTAR
                    </button>
                </div>

                <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    {!isAuthenticated ? (
                        <div className="space-y-3 py-4">
                            <p className="text-slate-400 text-sm font-bold text-center uppercase tracking-widest">Login de Operador</p>
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all"
                            />
                            <input
                                type="password"
                                placeholder="Senha"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-all"
                                onKeyDown={e => e.key === 'Enter' && handleAuthenticate()}
                            />
                            {authError && <p className="text-red-400 text-xs font-bold text-center bg-red-900/20 py-2 rounded-lg">{authError}</p>}
                            <button
                                onClick={handleAuthenticate}
                                disabled={isAuthenticating}
                                className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-500 active:scale-95 transition-all shadow-xl shadow-indigo-900/20 disabled:opacity-50"
                            >
                                {isAuthenticating ? 'VERIFICANDO...' : 'ENTRAR NO SISTEMA'}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Machine Status or List */}
                            {viewMode === 'list' ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center">FROTA DE MÁQUINAS</p>
                                        <button 
                                            onClick={() => loadMachineData()} 
                                            className="text-indigo-400 text-[10px] font-bold uppercase hover:underline"
                                        >
                                            Atualizar Lista
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                                        {allMachines.length > 0 ? allMachines.map(m => (
                                            <button
                                                key={m.uuid}
                                                onClick={() => {
                                                    setResolvedUuid(m.uuid);
                                                    setMachineData(m);
                                                    setMpSummary(null);
                                                    setDetailedPayments([]);
                                                    setViewMode('control');
                                                    
                                                    const activeId = m.mercado_pago_id || customerMpStoreId;
                                                    if (activeId) {
                                                        const cached = localStorage.getItem(`mp_report_${activeId}`);
                                                        if (cached) {
                                                            try {
                                                                const { summary, detailed } = JSON.parse(cached);
                                                                setMpSummary(summary);
                                                                setDetailedPayments(detailed);
                                                            } catch (e) {}
                                                        }
                                                    }
                                                }}
                                                className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between hover:border-indigo-500 transition-all active:scale-[0.98]"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-3 h-3 rounded-full animate-pulse ${m.status.toLowerCase().includes('online') || m.status.toLowerCase().includes('active') || m.status.toLowerCase().includes('inline') ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]'}`}></div>
                                                    <div className="text-left">
                                                        <p className="text-white font-black text-base uppercase tracking-tighter leading-tight">{m.name}</p>
                                                        <p className="text-slate-500 text-[10px] font-mono">{m.uuid.slice(0, 12)}</p>
                                                    </div>
                                                </div>
                                                <div className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full font-black text-[10px] uppercase">Gerenciar</div>
                                            </button>
                                        )) : (
                                            <div className="text-center text-slate-600 py-12 italic text-sm border-2 border-dashed border-slate-800 rounded-3xl">Buscando máquinas no servidor...</div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* Control Mode Navigation (Internal reference) */}
                                    {isGlobalMode && (
                                        <div className="flex gap-2 mb-2">
                                            <button 
                                                onClick={() => {
                                                    setViewMode('list');
                                                    setResolvedUuid(null);
                                                    setMachineData(null);
                                                    setMpSummary(null);
                                                    setDetailedPayments([]);
                                                    loadMachineData();
                                                }}
                                                className="flex-1 text-indigo-400 border border-indigo-400/20 py-2 rounded-lg font-bold text-[10px] uppercase hover:bg-indigo-400/10 transition-all"
                                            >
                                                ← Lista de Frota
                                            </button>
                                            <button 
                                                onClick={() => loadMachineData()}
                                                className="bg-slate-800 text-slate-300 px-3 rounded-lg font-bold text-[10px] uppercase hover:bg-slate-700"
                                            >
                                                🔄 Atualizar
                                            </button>
                                        </div>
                                    )}

                                    {/* Control Mode */}
                                    {isLoadingMachine ? (
                                        <div className="text-center text-slate-500 py-8 animate-pulse text-sm font-black uppercase tracking-widest">Acessando ESP32...</div>
                                    ) : machineData ? (
                                        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-inner">
                                            <div className="text-center">
                                                <p className="text-slate-500 text-[10px] uppercase font-black mb-2 tracking-[0.2em]">{machineData.name || machineName}</p>
                                                <div className="flex flex-col items-center">
                                                    {(() => {
                                                        const s = (machineData.status || '').toLowerCase();
                                                        const isOnline = s === 'online' || s === 'inline' || s === 'active';
                                                        return (
                                                            <>
                                                                <p className={`text-5xl font-black tracking-tighter ${isOnline ? 'text-green-400' : 'text-red-500'}`}>
                                                                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                                                                </p>
                                                                {machineData.last_seen && (
                                                                    <p className="text-slate-600 text-[10px] mt-2 font-black uppercase tracking-widest">Sinal: {new Date(machineData.last_seen).toLocaleString('pt-BR')}</p>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6 text-center">
                                            <p className="text-red-400 font-black text-sm uppercase">Equipamento não responde</p>
                                            <p className="text-slate-500 text-[10px] mt-2 font-mono">{resolvedUuid}</p>
                                        </div>
                                    )}

                                    {/* Remote Credit Presets */}
                                    {resolvedUuid && (
                                        <div className="space-y-3">
                                            <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest px-1">Comandos de Crédito Remoto</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[1, 2, 5, 10].map(val => (
                                                    <button
                                                        key={val}
                                                        onClick={() => handleSendCredit(val)}
                                                        disabled={isSendingCredit}
                                                        className={`${val >= 5 ? 'bg-orange-600 text-white' : 'bg-yellow-500 text-black'} font-black py-5 rounded-2xl hover:scale-105 active:scale-95 transition-all text-2xl disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-black/40`}
                                                    >
                                                        ⚡ +{val}
                                                    </button>
                                                ))}
                                            </div>
                                            {creditResult && (
                                                <div className="bg-white text-black p-3 rounded-xl text-center font-black text-sm animate-bounce shadow-xl">
                                                    {creditResult}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Report Section */}
                                    {(resolvedUuid || customerMpStoreId) && (
                                        <div className="space-y-4 border-t border-slate-800 pt-6">
                                            <div className="flex justify-between items-center">
                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Extrato de Vendas</p>
                                                <div className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-[8px] font-black tracking-widest">MERCADO PAGO</div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-slate-600 text-[9px] uppercase font-black px-1">Data Inicial</label>
                                                    <input
                                                        type="date"
                                                        value={reportStart}
                                                        onChange={e => setReportStart(e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-[11px] focus:border-indigo-500 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-slate-600 text-[9px] uppercase font-black px-1">Data Final</label>
                                                    <input
                                                        type="date"
                                                        value={reportEnd}
                                                        onChange={e => setReportEnd(e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-[11px] focus:border-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleFetchReport}
                                                disabled={isLoadingReport}
                                                className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl hover:bg-slate-700 active:scale-95 transition-all text-xs tracking-widest disabled:opacity-50"
                                            >
                                                {isLoadingReport ? 'SINCRONIZANDO TRANSAÇÕES...' : 'SINCRONIZAR COM MERCADO PAGO'}
                                            </button>

                                            {mpSummary && (
                                                <div className="space-y-4">
                                                    <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-2xl">
                                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                                            <div className="bg-green-500/10 p-3 rounded-2xl border border-green-500/10">
                                                                <p className="text-green-400 font-black text-xl leading-none">R$ {mpSummary.pix.toFixed(2)}</p>
                                                                <p className="text-slate-600 text-[9px] uppercase font-black mt-2">TOTAL PIX</p>
                                                            </div>
                                                            <div className="bg-indigo-500/10 p-3 rounded-2xl border border-indigo-500/10">
                                                                <p className="text-indigo-400 font-black text-xl leading-none">R$ {(mpSummary.credit + mpSummary.debit).toFixed(2)}</p>
                                                                <p className="text-slate-600 text-[9px] uppercase font-black mt-2">TOTAL CARTÃO</p>
                                                            </div>
                                                        </div>
                                                        <div className="border-t border-slate-800 pt-4 text-center">
                                                            <p className="text-white font-black text-4xl leading-none tracking-tighter">R$ {(mpSummary.pix + mpSummary.credit + mpSummary.debit - mpSummary.refunds).toFixed(2)}</p>
                                                            <p className="text-indigo-500 text-[10px] uppercase font-black tracking-[0.3em] mt-3">Saldo Líquido no Período</p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={handlePrintReport}
                                                        className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-slate-200 active:scale-95 transition-all text-sm flex items-center justify-center gap-3 shadow-xl"
                                                    >
                                                        <XIcon className="w-5 h-5 rotate-45 text-slate-400" />
                                                        IMPRIMIR EXTRATO TÉRMICO
                                                    </button>

                                                    {/* Transaction List */}
                                                    <div className="space-y-3 mt-6">
                                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest px-1">Detalhamento de Vendas ({detailedPayments.length})</p>
                                                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                                            {detailedPayments.map((p) => (
                                                                <div key={p.id} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                                            <p className="text-white font-black text-xs">R$ {p.transaction_amount.toFixed(2)}</p>
                                                                        </div>
                                                                        <p className="text-slate-500 text-[9px] uppercase mt-1 font-mono">
                                                                            {new Date(p.date_approved || p.date_created).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className={`text-[8px] font-black uppercase tracking-tighter ${p.payment_type_id === 'credit_card' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                                                                            {p.payment_type_id === 'credit_card' ? 'CRÉDITO' : p.payment_type_id === 'debit_card' ? 'DÉBITO' : 'PIX'}
                                                                        </p>
                                                                        <p className="text-slate-600 text-[7px] uppercase font-mono mt-0.5">ID: {String(p.id).slice(-8)}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {!isLoadingReport && !mpSummary && (
                                                <p className="text-center text-slate-700 text-[10px] font-black uppercase tracking-widest py-2 italic opacity-50">Nenhuma transação encontrada</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-Logout for authenticated session */}
                                    <button
                                        onClick={() => {
                                            clearHerokuAuth();
                                            setIsAuthenticated(false);
                                            setMachineData(null);
                                            setResolvedUuid(null);
                                            setMpSummary(null);
                                            setDetailedPayments([]);
                                        }}
                                        className="w-full text-slate-700 text-[10px] font-black py-4 hover:text-red-400 transition-all uppercase tracking-[0.2em] mt-6 border-t border-slate-900"
                                    >
                                        Encerrar Sessão de Operador
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Fix: Add clear back button */}
                <div className="p-6 border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl">
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-5 rounded-2xl active:scale-95 transition-all text-xl border border-slate-800 shadow-2xl uppercase tracking-tighter"
                    >
                        FECHAR PAINEL
                    </button>
                </div>
            </div>
        </div>
    );
};
