import React from 'react';
import { Billing } from '../types';

interface IndustrialBillingSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    billing: Billing;
    onPrint: (billing: Billing) => void;
}

const IndustrialBillingSummaryModal: React.FC<IndustrialBillingSummaryModalProps> = ({ isOpen, onClose, billing, onPrint }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 no-print select-none">
            <div className="bg-slate-900 border-4 border-yellow-500 w-full max-w-lg rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.3)] animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-yellow-500 p-6">
                    <h2 className="text-black text-2xl font-black uppercase tracking-tighter">Resumo da Cobrança</h2>
                    <p className="text-black/80 font-bold uppercase text-xs tracking-widest">{billing.customerName}</p>
                    <p className="text-black/60 font-mono text-xs">{new Date(billing.settledAt).toLocaleString('pt-BR')}</p>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Equipment Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800 p-3 rounded-xl border-l-4 border-yellow-500">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Equipamento</p>
                            <p className="text-lg font-black uppercase text-yellow-500">{billing.equipmentType}</p>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-xl border-l-4 border-yellow-500">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Número</p>
                            <p className="text-lg font-black uppercase text-yellow-500">{billing.equipmentNumero || 'S/N'}</p>
                        </div>
                    </div>

                    {/* Clocks Section */}
                    <div className="grid grid-cols-2 gap-4 bg-black p-4 rounded-2xl border-2 border-slate-800">
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Relógio Anterior</p>
                            <p className="text-2xl font-mono text-white">{billing.relogioAnterior}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Relógio Atual</p>
                            <p className="text-2xl font-mono text-white">{billing.relogioAtual}</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-slate-800 mt-2 flex justify-between">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Partidas Cobradas</p>
                            <p className="text-xl font-black text-yellow-500">{billing.partidasCobradas || 0}</p>
                        </div>
                    </div>

                    {/* Financial Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-slate-400">
                            <span className="text-xs uppercase font-bold tracking-widest text-slate-500">Valor Bruto</span>
                            <span className="font-mono text-lg">R$ {billing.valorBruto?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-400">
                            <span className="text-xs uppercase font-bold tracking-widest text-slate-500">Comissão (Cliente)</span>
                            <span className="font-mono text-lg">- R$ {billing.valorComissao?.toFixed(2) || '0.00'}</span>
                        </div>
                        {billing.valorBonus && billing.valorBonus > 0 && (
                            <div className="flex justify-between items-center text-blue-400">
                                <span className="text-xs uppercase font-bold tracking-widest text-slate-500">Bônus/Desconto</span>
                                <span className="font-mono text-lg">- R$ {billing.valorBonus.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="bg-yellow-500/10 p-4 rounded-xl border-2 border-yellow-500/20 flex justify-between items-center">
                            <span className="text-sm font-black uppercase text-yellow-500">Total Pago / Líquido</span>
                            <span className="text-2xl font-black text-yellow-500 font-mono">
                                R$ {(billing.equipmentType === 'grua' 
                                    ? (billing.recebimentoEspecie || 0) + (billing.recebimentoPix || 0)
                                    : (billing.valorPagoDinheiro || 0) + (billing.valorPagoPix || 0)
                                ).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="bg-slate-800/50 p-4 rounded-xl space-y-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Forma de Recebimento: <span className="text-white">{billing.paymentMethod.toUpperCase()}</span></p>
                        <div className="flex justify-between items-center text-xs text-slate-300">
                            <span>Em Dinheiro:</span>
                            <span className="font-mono">R$ {billing.valorPagoDinheiro?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-300">
                            <span>Via PIX:</span>
                            <span className="font-mono">R$ {billing.valorPagoPix?.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 bg-black flex flex-col gap-3">
                    <button
                        onClick={() => onPrint(billing)}
                        className="w-full bg-white text-black font-black py-5 rounded-xl hover:bg-slate-100 active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-3"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        REIMPRIMIR COMPROVANTE
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-800 text-white font-black py-4 rounded-xl hover:bg-slate-700 active:scale-95 transition-all uppercase tracking-widest"
                    >
                        FECHAR RESUMO
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IndustrialBillingSummaryModal;
