// components/DebtPaymentModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Customer } from '../types';
import { CurrencyDollarIcon } from './icons/CurrencyDollarIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { TrashIcon } from './icons/TrashIcon';
import { safeParseFloat } from '../utils';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details: { amountPaidDinheiro: number; amountPaidPix: number; equipmentType: 'mesa' | 'jukebox' | 'grua' } | { amountToAdd: number }) => void;
  onForgiveDebt: (customer: Customer) => void;
  onPrintStatement: (customer: Customer) => void;
  customer: Customer;
}

const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({ isOpen, onClose, onConfirm, onForgiveDebt, onPrintStatement, customer }) => {
  const [paymentValues, setPaymentValues] = useState({ dinheiro: '', pix: '' });
  const [amountToAdd, setAmountToAdd] = useState('');
  const [equipmentType, setEquipmentType] = useState<'mesa' | 'jukebox' | 'grua' | null>(null);
  const [error, setError] = useState('');
  
  const isAddingDebt = customer.debtAmount <= 0;
  const hasDebt = customer.debtAmount > 0;

  useEffect(() => {
    if (isOpen) {
      setPaymentValues({ dinheiro: '', pix: '' });
      setAmountToAdd('');
      setError('');
      
      // Auto-select if customer has only one type of equipment
      const types = Array.from(new Set(customer.equipment.map(e => e.type)));
      if (types.length === 1) {
        setEquipmentType(types[0] as 'mesa' | 'jukebox' | 'grua');
      } else {
        setEquipmentType(null);
      }
    }
  }, [isOpen, customer]);

  const totalPaid = safeParseFloat(paymentValues.dinheiro) + safeParseFloat(paymentValues.pix);

  useEffect(() => {
    if (!isOpen || isAddingDebt) return;
    
    if (totalPaid <= 0) {
        setError('O valor total pago deve ser maior que zero.');
    } else if (totalPaid > customer.debtAmount) {
        const excess = totalPaid - customer.debtAmount;
        setError(`Valor pago excede a dívida em R$ ${excess.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
    } else {
        setError('');
    }
  }, [totalPaid, customer.debtAmount, isOpen, isAddingDebt]);

  const handleConfirm = useCallback(() => {
    if (error && !isAddingDebt) return;

    if (isAddingDebt) {
        const amountNum = safeParseFloat(amountToAdd);
        if (amountNum <= 0) {
            setError('O valor a adicionar deve ser maior que zero.');
            return;
        }
        onConfirm({ amountToAdd: amountNum });
    } else {
        if (totalPaid <= 0) {
            setError('O valor total pago deve ser maior que zero.');
            return;
        }
        if (!equipmentType) {
            setError('Por favor, selecione o tipo de equipamento.');
            return;
        }
        onConfirm({ 
            amountPaidDinheiro: safeParseFloat(paymentValues.dinheiro), 
            amountPaidPix: safeParseFloat(paymentValues.pix),
            equipmentType: equipmentType
        });
    }
  }, [error, isAddingDebt, amountToAdd, paymentValues, equipmentType, onConfirm, totalPaid]);
  
  const handlePaymentChange = (field: keyof typeof paymentValues, value: string) => {
    // Replace comma with dot and remove non-numeric chars except the first dot
    const sanitizedValue = value.replace(',', '.').replace(/[^0-9.]/g, '');
    const parts = sanitizedValue.split('.');
    const finalValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitizedValue;
    setPaymentValues(prev => ({ ...prev, [field]: finalValue }));
  };
  
  const handleAmountToAddChange = (value: string) => {
    const sanitizedValue = value.replace(',', '.').replace(/[^0-9.]/g, '');
    const parts = sanitizedValue.split('.');
    const finalValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitizedValue;
    setAmountToAdd(finalValue);
  }

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debt-modal-title"
    >
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-md border border-slate-700 animate-fade-in-up flex flex-col max-h-[90vh]">
        <header className="p-5 border-b border-slate-700 flex-shrink-0">
          <h2 id="debt-modal-title" className="text-xl font-bold text-white">{isAddingDebt ? 'Adicionar Dívida Avulsa' : 'Pagar Dívida'}</h2>
          <p className="text-sm text-slate-400 break-words">Cliente: {customer.name}</p>
        </header>
        
        <main className="p-5 space-y-6 overflow-y-auto flex-grow">
            <div className="text-center">
                <p className="text-sm text-slate-400">Dívida Atual</p>
                <p className={`text-3xl font-mono font-bold ${hasDebt ? 'text-red-400' : 'text-slate-400'}`}>
                  R$ {customer.debtAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </div>
            
            {isAddingDebt ? (
                <div>
                    <label htmlFor="amountToAdd" className="block text-sm font-medium text-slate-300 mb-1">Valor a Adicionar (R$)</label>
                    <input 
                      type="text" 
                      inputMode="decimal" 
                      id="amountToAdd" 
                      value={amountToAdd} 
                      onChange={(e) => handleAmountToAddChange(e.target.value)} 
                      required 
                      className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white text-lg text-center font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" 
                      placeholder="0,00"
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Valor em Dinheiro (R$)</label>
                            <input 
                              type="text" 
                              inputMode="decimal" 
                              value={paymentValues.dinheiro} 
                              onChange={(e) => handlePaymentChange('dinheiro', e.target.value)} 
                              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-500" 
                              placeholder="0,00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Valor em PIX (R$)</label>
                            <input 
                              type="text" 
                              inputMode="decimal" 
                              value={paymentValues.pix} 
                              onChange={(e) => handlePaymentChange('pix', e.target.value)} 
                              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-500" 
                              placeholder="0,00"
                            />
                        </div>
                    </div>
                     <div className="text-center pt-2">
                        <p className="text-sm text-slate-400">Total Pago</p>
                        <p className="text-xl font-mono font-bold text-lime-400">
                          R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-700">
                        <label className="block text-sm font-medium text-slate-300 mb-2 italic">Dívida referente a:</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button 
                                onClick={() => setEquipmentType('mesa')}
                                className={`py-3 px-2 rounded-md font-bold text-xs transition-all border ${equipmentType === 'mesa' ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-900/20' : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'}`}
                            >
                                MESA
                            </button>
                            <button 
                                onClick={() => setEquipmentType('jukebox')}
                                className={`py-3 px-2 rounded-md font-bold text-xs transition-all border ${equipmentType === 'jukebox' ? 'bg-fuchsia-600 border-fuchsia-400 text-white shadow-lg shadow-fuchsia-900/20' : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'}`}
                            >
                                JUKEBOX
                            </button>
                            <button 
                                onClick={() => setEquipmentType('grua')}
                                className={`py-3 px-2 rounded-md font-bold text-xs transition-all border ${equipmentType === 'grua' ? 'bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-900/20' : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'}`}
                            >
                                GRUA
                            </button>
                        </div>
                    </div>
                </div>
            )}
             {error && <p className="text-red-400 text-xs mt-2 text-center font-medium">{error}</p>}
        </main>

        <footer className="p-4 bg-slate-800/50 rounded-b-lg flex flex-col gap-3 flex-shrink-0">
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row-reverse gap-3">
              <button 
                onClick={handleConfirm} 
                disabled={!!error || (isAddingDebt ? safeParseFloat(amountToAdd) <= 0 : (totalPaid <= 0 || !equipmentType))}
                className="flex-1 justify-center bg-amber-600 text-white font-bold py-3 px-5 rounded-md hover:bg-amber-500 transition-colors inline-flex items-center gap-2 disabled:bg-slate-500 disabled:cursor-not-allowed"
              >
                <CurrencyDollarIcon className="w-5 h-5" />
                {isAddingDebt ? 'Adicionar Dívida' : 'Confirmar Pagamento'}
              </button>
              <button onClick={onClose} className="flex-1 justify-center text-white font-bold py-3 px-5 rounded-md transition-colors animate-blink-cancel">
                Cancelar
              </button>
          </div>
          
          {/* Secondary actions */}
          {hasDebt && (
            <div className="flex gap-3 pt-2 border-t border-slate-700/50">
              <button 
                  onClick={() => onForgiveDebt(customer)}
                  className="flex-1 justify-center text-sm bg-red-800/50 text-red-300 font-semibold py-2 px-4 rounded-md hover:bg-red-700/60 hover:text-white transition-colors inline-flex items-center gap-2"
              >
                  <TrashIcon className="w-4 h-4"/>
                  Perdoar Dívida
              </button>
              <button 
                  onClick={() => { onPrintStatement(customer); onClose(); }}
                  className="flex-1 justify-center text-sm bg-sky-800/50 text-sky-300 font-semibold py-2 px-4 rounded-md hover:bg-sky-700/60 hover:text-white transition-colors inline-flex items-center gap-2"
                  title="Imprimir Demonstrativo de Dívida"
              >
                  <PrinterIcon className="w-4 h-4" />
                  Demonstrativo
              </button>
            </div>
          )}
        </footer>
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

export default DebtPaymentModal;