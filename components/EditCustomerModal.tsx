// components/EditCustomerModal.tsx
import React, { useCallback } from 'react';
import { Customer, Equipment } from '../types';
import CustomerForm from './CustomerForm';
import { safeParseFloat } from '../utils';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customer: Customer) => Promise<void>;
  customer: Customer;
  customers: Customer[];
  isSaving: boolean;
  showNotification: (message: string, type?: 'success' | 'error') => void;
  areValuesHidden: boolean;
}

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({ isOpen, onClose, onConfirm, customer, customers, isSaving, showNotification, areValuesHidden }) => {

  const handleSubmit = useCallback(async (formData: Omit<Customer, 'id' | 'createdAt' | 'debtAmount' | 'lastVisitedAt' | 'equipment'> & { debtAmount?: string | number } & { equipment: Partial<Equipment>[] }) => {
    
    const finalEquipment: Equipment[] = formData.equipment.map(eq => {
      const base = {
        id: eq.id!,
        type: eq.type!,
        numero: eq.numero || '',
        relogioNumero: eq.relogioNumero || '',
        relogioAnterior: Number(eq.relogioAnterior) || 0,
        herokuId: eq.herokuId,
      };

      if (eq.type === 'mesa') {
        const billingType = eq.billingType || 'perPlay';
        if (billingType === 'monthly') {
          return { ...base, billingType, monthlyFeeValue: Number(eq.monthlyFeeValue) || 0 };
        }
        return { ...base, billingType, valorFicha: Number(eq.valorFicha) || 0, parteFirma: Number(eq.parteFirma) || 0, parteCliente: Number(eq.parteCliente) || 0 };
      }
      if (eq.type === 'jukebox') {
        return { ...base, porcentagemJukeboxFirma: Number(eq.porcentagemJukeboxFirma) || 0, porcentagemJukeboxCliente: Number(eq.porcentagemJukeboxCliente) || 0 };
      }
      if (eq.type === 'grua') {
        const gruaData: Partial<Equipment> = {
          ...base,
          saldo: Number(eq.saldo) || 0,
          quantidadePelucia: Number(eq.quantidadePelucia) || 0,
          reposicaoPelucia: Number(eq.reposicaoPelucia) || 0,
          recebimentoEspecie: Number(eq.recebimentoEspecie) || 0,
          recebimentoPix: Number(eq.recebimentoPix) || 0,
        };
        if (eq.aluguelPercentual != null) {
          gruaData.aluguelPercentual = Number(eq.aluguelPercentual);
        }
        if (eq.aluguelValor != null) {
          gruaData.aluguelValor = Number(eq.aluguelValor);
        }
        return gruaData as Equipment;
      }
      return base as Equipment;
    });
    
    // Reconstruct the full customer object with its original ID and other properties
    await onConfirm({
      ...customer, // Keep original id, createdAt, etc.
      ...formData,   // Apply all form changes
      debtAmount: safeParseFloat(formData.debtAmount),
      equipment: finalEquipment,
    });
  }, [onConfirm, customer]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-customer-modal-title"
    >
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-4xl border border-slate-700 animate-fade-in-up max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h2 id="edit-customer-modal-title" className="text-2xl font-bold text-white">Editar Cliente</h2>
          <p className="text-slate-400">Alterando dados de: {customer.name}</p>
        </div>
        <div className="p-6 flex-grow overflow-y-auto">
          <CustomerForm
            customers={customers}
            initialData={customer}
            onSubmit={handleSubmit}
            isSaving={isSaving}
            showNotification={showNotification}
            onCancel={onClose}
            submitButtonText="Salvar Alterações"
            isEditMode
            areValuesHidden={areValuesHidden}
          />
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

export default EditCustomerModal;