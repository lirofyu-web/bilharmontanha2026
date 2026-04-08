// components/AddCustomerForm.tsx
import React, { useState } from 'react';
import { Customer, Equipment } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import CustomerForm from './CustomerForm';

interface AddCustomerFormProps {
  customers: Customer[];
  onAddCustomer: (customerData: Omit<Customer, 'id' | 'createdAt' | 'debtAmount' | 'lastVisitedAt'>) => Promise<void>;
  isSaving: boolean;
  showNotification: (message: string, type?: 'success' | 'error') => void;
}

const AddCustomerForm: React.FC<AddCustomerFormProps> = ({ customers, onAddCustomer, isSaving, showNotification }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (formData: Omit<Customer, 'id' | 'createdAt' | 'debtAmount' | 'lastVisitedAt' | 'equipment'> & { debtAmount?: string | number } & { equipment: Partial<Equipment>[] }) => {
    // Validation for unique equipment numbers (already present in CustomerForm)
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

    const { debtAmount, ...restOfData } = formData;
    await onAddCustomer({ ...restOfData, equipment: finalEquipment });
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
        <div className="text-center">
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-[var(--color-primary-text)] font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg"
            >
                <PlusIcon className="w-5 h-5" />
                <span>Adicionar Novo Cliente</span>
            </button>
        </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
      <CustomerForm
        customers={customers}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        showNotification={showNotification}
        onCancel={() => setIsOpen(false)}
        submitButtonText="Salvar Cliente"
      />
       <style>{`
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

export default AddCustomerForm;