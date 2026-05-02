// components/FinalizePaymentModal.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Billing } from '../types';
import { safeParseFloat } from '../utils';
import { CurrencyDollarIcon } from './icons/CurrencyDollarIcon';

interface FinalizePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updatedBilling: Billing) => void;
  billing: Billing;
  customerDebt: number;
}

const FinalizePaymentModal: React.FC<FinalizePaymentModalProps> = ({ isOpen, onClose, onConfirm, billing, customerDebt }) => {
  const [paymentValues, setPaymentValues] = useState({
    dinheiro: '',
    pix: '',
    desconto: '',
  });
  const [relogioAtual, setRelogioAtual] = useState('');
  const [error, setError] = useState('');

  const valorTotalParaFirma = useMemo(() => billing.valorTotal, [billing]);

  useEffect(() => {
    if (isOpen) {
      setPaymentValues({
        dinheiro: String(billing.valorTotal > 0 ? billing.valorTotal : '0'),
        pix: '0',
        desconto: '0',
      });
      if (billing.equipmentType === 'jukebox' && billing.relogioAtual > billing.relogioAnterior) {
          setRelogioAtual(String(billing.relogioAtual));
      } else {
          setRelogioAtual('');
      }
      setError('');
    }
  }, [isOpen, billing]);

  const handlePaymentChange = useCallback((field: keyof typeof paymentValues, value: string) => {
    setPaymentValues(prev => ({ ...prev, [field]: value }));
  }, []);
  
  const financialSummary = useMemo(() => {
    const vTotal = valorTotalParaFirma;
    const vDinheiro = safeParseFloat(paymentValues.dinheiro);
    const vPix = safeParseFloat(paymentValues.pix);
    const vDesconto = safeParseFloat(paymentValues.desconto);
    
    const totalPago = vDinheiro + vPix;
    const valorNecessario = vTotal - vDesconto;
    const saldoTransacao = totalPago - valorNecessario;
    const novoSaldoDivida = customerDebt - saldoTransacao;
    
    return {
        totalPago,
        novoSaldoDivida,
        saldoTransacao,
        vDesconto
    };
  }, [paymentValues.dinheiro, paymentValues.pix, paymentValues.desconto, valorTotalParaFirma, customerDebt]);

  useEffect(() => {
    let newError = '';
    if (billing.equipmentType === 'jukebox') {
        const ra = safeParseFloat(relogioAtual);
        if (!relogioAtual) {
            newError = 'Preencha a Leitura Atual.';
        } else if (ra < billing.relogioAnterior) {
            newError = `Leitura atual (${ra}) não pode ser menor que a anterior (${billing.relogioAnterior}).`;
        }
    }
    setError(newError);
  }, [billing, relogioAtual]);


  const handleConfirm = useCallback(() => {
    if (error) return;
    
    const valorPagoDinheiro = safeParseFloat(paymentValues.dinheiro);
    const valorPagoPix = safeParseFloat(paymentValues.pix);
    const valorBonus = safeParseFloat(paymentValues.desconto);
    
    const totalPago = valorPagoDinheiro + valorPagoPix;
    const totalParaFirma = valorTotalParaFirma - valorBonus;
    
    const difference = totalPago - totalParaFirma;
    const valorDividaPaga = difference > 0 ? parseFloat(difference.toFixed(2)) : 0;
    const valorDebitoNegativo = difference < 0 ? parseFloat(Math.abs(difference).toFixed(2)) : 0;

    const methodsUsed: ('dinheiro' | 'pix' | 'debito_negativo')[] = [];
    if (valorPagoDinheiro > 0) methodsUsed.push('dinheiro');
    if (valorPagoPix > 0) methodsUsed.push('pix');
    if (valorDebitoNegativo > 0) methodsUsed.push('debito_negativo');

    let paymentMethod: Billing['paymentMethod'] = 'dinheiro'; 
    if (methodsUsed.length > 1) {
        paymentMethod = 'misto';
    } else if (methodsUsed.length === 1) {
        paymentMethod = methodsUsed[0];
    }

    const updatedBilling: Billing = {
        ...billing,
        settledAt: new Date(), 
        paymentMethod,
        valorPagoDinheiro: valorPagoDinheiro > 0 ? valorPagoDinheiro : undefined,
        valorPagoPix: valorPagoPix > 0 ? valorPagoPix : undefined,
        valorDebitoNegativo: valorDebitoNegativo > 0 ? valorDebitoNegativo : undefined,
        valorDividaPaga: valorDividaPaga > 0 ? valorDividaPaga : undefined,
        valorBonus: valorBonus > 0 ? valorBonus : undefined,
    };

    if (billing.equipmentType === 'jukebox') {
        updatedBilling.relogioAtual = Math.round(safeParseFloat(relogioAtual));
        updatedBilling.partidasJogadas = updatedBilling.relogioAtual - billing.relogioAnterior;
    }
    
    onConfirm(updatedBilling);
  }, [error, paymentValues, billing, relogioAtual, onConfirm]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      role="dialog"
    >
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-md border border-slate-700 animate-fade-in-up flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white">Finalizar Pagamento</h2>
          <p className="text-slate-400 break-words">Cliente: {billing.customerName}</p>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto flex-grow min-h-0">
            <div className="flex gap-3 mb-6">
                <div className="flex-1 p-3 bg-slate-900/50 rounded-lg border border-lime-500/20 text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Entrada Hoje</p>
                    <p className="text-xl font-black text-lime-400 font-mono">R$ {financialSummary.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="flex-1 p-3 bg-slate-900/50 rounded-lg border border-red-500/20 text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Saldo Dívida</p>
                    <p className={`text-xl font-black font-mono ${financialSummary.novoSaldoDivida > 0 ? 'text-red-400' : 'text-slate-400'}`}>R$ {Math.max(0, financialSummary.novoSaldoDivida).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            {billing.equipmentType === 'jukebox' && (
                <div className="bg-slate-900/50 p-4 rounded-lg space-y-3">
                    <h3 className="text-lime-400 font-bold mb-2">Relógio Jukebox</h3>
                    <p className="text-sm text-slate-400">Leitura Anterior: <span className="font-mono text-white">{billing.relogioAnterior}</span></p>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Leitura Atual</label>
                        <input type="text" inputMode="numeric" value={relogioAtual} onChange={(e) => setRelogioAtual(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-500" />
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dinheiro</label>
                  <input type="text" inputMode="decimal" value={paymentValues.dinheiro} onChange={(e) => handlePaymentChange('dinheiro', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">PIX</label>
                  <input type="text" inputMode="decimal" value={paymentValues.pix} onChange={(e) => handlePaymentChange('pix', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Desconto</label>
                  <input type="text" inputMode="decimal" value={paymentValues.desconto} onChange={(e) => handlePaymentChange('desconto', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-500" />
                </div>
            </div>
            
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-700/50 text-center">
                <p className="text-xs text-slate-500 italic">Total Cobrança: R$ {billing.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Dívida Antiga: R$ {customerDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            {error && <p className="text-red-400 text-xs mt-1 text-center">{error}</p>}
        </div>
        <div className="p-4 bg-slate-800/50 rounded-b-lg flex flex-col-reverse sm:flex-row sm:justify-end gap-3 flex-shrink-0">
            <button onClick={onClose} className="w-full sm:w-auto justify-center text-white font-bold py-2 px-6 rounded-md transition-colors animate-blink-cancel">Cancelar</button>
            <button onClick={handleConfirm} disabled={!!error} className="w-full sm:w-auto justify-center bg-lime-500 text-white font-bold py-2 px-6 rounded-md hover:bg-lime-600 transition-colors inline-flex items-center gap-2 disabled:bg-slate-500 disabled:cursor-not-allowed">
                <CurrencyDollarIcon className="w-5 h-5" />
                Finalizar Cobrança
            </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
        @keyframes blink-cancel {
          0%, 100% { background-color: #ef4444; } /* red-500 */
          50% { background-color: #eab308; } /* yellow-500 */
        }
        .animate-blink-cancel {
          animation: blink-cancel 0.5s step-end infinite;
        }
      `}</style>
    </div>
  );
};

export default FinalizePaymentModal;