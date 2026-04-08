import React, { useState, useEffect, useCallback } from 'react';
import { Customer } from '../types';
import { XIcon } from './icons/XIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { fetchMpBilling, MpSummary } from '../utils/mercadoPago';
import { nativePrintPDF } from '../utils/nativePrint';
import { PrinterIcon } from './icons/PrinterIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';

interface DigitalBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  mercadoPagoToken?: string;
}

const DigitalBillingModal: React.FC<DigitalBillingModalProps> = ({ isOpen, onClose, customer, mercadoPagoToken }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MpSummary | null>(null);
  
  // Filter Periods: Start and End Dates
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to 1st of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; // Default to today
  });

  const handlePrint = async () => {
    if (!summary) return;
    
    // Format Dates for Title
    const formatDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };
    
    const rangeText = `${formatDate(startDate)} a ${formatDate(endDate)}`;
    
    const htmlContent = `
      <div class="header">
        <h3 class="font-black">EXTRATO MERCADO PAGO</h3>
        <p class="text-xs uppercase font-bold text-center">${customer.name}</p>
        <p class="text-xs text-center">${rangeText}</p>
      </div>
      <hr />
      <div class="receipt-row font-bold">
        <span>RESUMO DAS VENDAS DIGITAIS</span>
      </div>
      <hr />
      <div class="receipt-row text-base">
        <span>PIX / DINHEIRO</span>
        <span class="filler"></span>
        <span class="value">R$ ${summary.pix.toFixed(2)}</span>
      </div>
      <div class="receipt-row text-base">
        <span>CARTÃO CRÉDITO</span>
        <span class="filler"></span>
        <span class="value">R$ ${summary.credit.toFixed(2)}</span>
      </div>
      <div class="receipt-row text-base">
        <span>CARTÃO DÉBITO</span>
        <span class="filler"></span>
        <span class="value">R$ ${summary.debit.toFixed(2)}</span>
      </div>
      ${summary.refunds > 0 ? `
      <div class="receipt-row text-base" style="color: #666;">
        <span>ESTORNOS (INF.)</span>
        <span class="filler"></span>
        <span class="value">R$ ${summary.refunds.toFixed(2)}</span>
      </div>
      ` : ''}
      <hr />
      <div class="receipt-row text-xl font-black">
        <span>TOTAL FATURADO</span>
        <span class="filler"></span>
        <span class="value">R$ ${(summary.pix + summary.credit + summary.debit - summary.refunds).toFixed(2)}</span>
      </div>
      <hr />
      <div class="text-center text-xs mt-4">
        <p>${summary.count} TRANSAÇÕES APROVADAS</p>
        <p>SINCRONIZADO VIA API ME. PAGO</p>
        <p>${new Date().toLocaleString('pt-BR')}</p>
      </div>
    `;

    // Wrap in standard 54mm layout
    const fullHtml = `
      <html><head><style>
        body { font-family: 'Courier New', Courier, monospace; width: 54mm; font-size: 14pt; font-weight: 700; color: #000; margin: 0 auto; padding: 2mm; }
        .header { text-align: center; margin-bottom: 12px; }
        .header h3 { margin: 0; font-size: 18pt; font-weight: 900; }
        .font-black { font-weight: 900; }
        .text-lg { font-size: 16pt; }
        .text-xl { font-size: 18pt; }
        .text-base { font-size: 15pt; line-height: 1.3rem; }
        .text-sm { font-size: 14pt; line-height: 1.1rem; }
        .text-xs { font-size: 11pt; line-height: 0.9rem; }
        hr { border-top: 2px dashed #000; margin: 8px 0; border-bottom: 0; }
        .receipt-row { display: grid; grid-template-columns: auto 1fr auto; align-items: baseline; gap: 0.3ch; }
        .receipt-row .filler { border-bottom: 2px dotted #000; position: relative; bottom: 0.15em; }
        .receipt-row .value { white-space: nowrap; }
        .text-center { text-align: center; }
        .mt-4 { margin-top: 0.8rem; }
      </style></head><body>${htmlContent}</body></html>
    `;

    try {
      await nativePrintPDF(fullHtml, 'extrato-mp.pdf');
    } catch (err) {
      alert('Erro ao imprimir: ' + err);
    }
  };

  const getCacheKey = useCallback(() => {
    return `mp_summary_${customer.id}_${startDate}_${endDate}`;
  }, [customer.id, startDate, endDate]);

  const loadDigitalBilling = useCallback(async () => {
    if (!customer.mercadoPagoStoreId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const accessToken = mercadoPagoToken || localStorage.getItem('appMercadoPagoToken');
      if (!accessToken) {
        throw new Error('Token do Mercado Pago não configurado. Vá em Configurações.');
      }

      const data = await fetchMpBilling(customer.mercadoPagoStoreId!, startDate, endDate, accessToken);
      
      setSummary(prev => {
        // High Watermark: Only update if the new fetch has more or equal transactions
        // than what we already know for this session/period.
        if (!prev || data.count >= prev.count) {
          localStorage.setItem(getCacheKey(), JSON.stringify(data));
          return data;
        }
        return prev;
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar faturamento digital.');
    } finally {
      setLoading(false);
    }
  }, [customer.mercadoPagoStoreId, startDate, endDate, getCacheKey]);

  // Reset or load summary when customer, date range, or modal state changes
  useEffect(() => {
    if (isOpen) {
      const cacheKey = getCacheKey();
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setSummary(parsed);
          setError(null);
        } catch (e) {
          // If JSON parse fails, fallback to fetching
          loadDigitalBilling();
        }
      } else {
        loadDigitalBilling();
      }
    } else {
      // Clear summary when closing to avoid flashing stale data on next open
      setSummary(null);
      setError(null);
    }
  }, [isOpen, customer.id, startDate, endDate, getCacheKey, loadDigitalBilling]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] h-auto sm:max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 rounded-lg">
              <CreditCardIcon className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">Faturamento Digital</h2>
              <p className="text-xs text-slate-400 font-bold uppercase">{customer.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (customer.mercadoPagoStoreId) {
                   window.open(`https://www.mercadopago.com.br/stores/detail?store_id=${customer.mercadoPagoStoreId}`, '_blank');
                }
              }} 
              className="p-2 text-slate-400 hover:text-emerald-400 transition-all hover:scale-110 active:scale-95"
              title="Abrir QR Code no Navegador"
            >
              <QrCodeIcon className="w-6 h-6" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                loadDigitalBilling();
              }} 
              disabled={loading}
              className={`p-2 text-slate-400 hover:text-sky-400 transition-all ${loading ? 'animate-spin cursor-wait' : 'hover:scale-110 active:scale-95'}`}
              title="Sincronizar Agora"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
              <XIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filters - Updated for Date Range */}
        <div className="p-4 bg-slate-800/30 border-b border-slate-700/50 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
             <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Desde</label>
                <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                />
             </div>
             <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Até</label>
                <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                />
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && !summary ? (
             <div className="h-40 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
                <p className="text-slate-400 animate-pulse font-medium">Sincronizando Mercado Pago...</p>
             </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
              <p className="text-red-400 text-sm font-medium">{error}</p>
              <button 
                onClick={loadDigitalBilling}
                className="mt-3 text-sky-400 text-xs font-bold hover:underline"
              >
                Tentar Novamente
              </button>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              
              {/* Total Card */}
              <div className="bg-gradient-to-br from-sky-600 to-sky-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <CreditCardIcon className="w-20 h-20" />
                 </div>
                 <p className="text-sky-100 text-sm font-bold uppercase tracking-wider mb-1">Total Faturado Digital (Líquido)</p>
                 <h3 className="text-3xl font-black text-white">
                   R$ {(summary.pix + summary.credit + summary.debit - summary.refunds).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </h3>
                 <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] text-white font-bold uppercase">
                      {summary.count} Vendas Aprovadas
                    </span>
                 </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center group hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center font-black text-teal-400">PX</div>
                    <div>
                      <p className="text-sm font-bold text-white">PIX / Dinheiro Digital</p>
                      <p className="text-xs text-slate-400">Transferências instantâneas</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-teal-400">R$ {summary.pix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center group hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center font-black text-violet-400">CR</div>
                    <div>
                      <p className="text-sm font-bold text-white">Cartão de Crédito</p>
                      <p className="text-xs text-slate-400">Vendas parceladas ou à vista</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-violet-400">R$ {summary.credit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center group hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center font-black text-sky-400">DB</div>
                    <div>
                      <p className="text-sm font-bold text-white">Cartão de Débito</p>
                      <p className="text-xs text-slate-400">Pagamentos eletrônicos diretos</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-sky-400">R$ {summary.debit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                {summary.refunds > 0 && (
                  <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center font-black text-red-500">EX</div>
                      <div>
                        <p className="text-sm font-bold text-white">Estornos / Devoluções</p>
                        <p className="text-xs text-red-400">Valores devolvidos aos clientes</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-red-500">- R$ {summary.refunds.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {summary.count === 0 && !loading && (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm italic">Nenhuma movimentação encontrada para este ID no período selecionado.</p>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-slate-500">Aguardando dados...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex gap-3">
          <button 
            disabled={!summary || loading}
            onClick={handlePrint}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
          >
            <PrinterIcon className="w-5 h-5" />
            <span>Imprimir Extrato</span>
          </button>
          <button 
            onClick={onClose}
            className="px-6 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DigitalBillingModal;
