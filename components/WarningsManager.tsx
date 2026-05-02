// components/WarningsManager.tsx
import React, { useState, useMemo } from 'react';
import { Customer, Warning } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { AlertIcon } from './icons/AlertIcon';
import ActionModal from './ActionModal';

interface WarningsManagerProps {
  customers: Customer[];
  warnings: Warning[];
  onAddWarning: (customerId: string, message: string) => void;
  onResolveWarning: (warningId: string) => void;
  onDeleteWarning: (warningId: string) => void;
}

const WarningsManager: React.FC<WarningsManagerProps> = ({ customers, warnings, onAddWarning, onResolveWarning, onDeleteWarning }) => {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [message, setMessage] = useState('');
  const [warningToDelete, setWarningToDelete] = useState<string | null>(null);

  const activeWarnings = useMemo(() => {
    return warnings
      .filter(w => !w.isResolved)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [warnings]);
  
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => a.name.localeCompare(b.name));
  }, [customers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer && message) {
      onAddWarning(selectedCustomer, message);
      setSelectedCustomer('');
      setMessage('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-3 flex items-center gap-2">
        <AlertIcon className="w-6 h-6 text-purple-500 dark:text-purple-400" />
        Gerenciador de Avisos
      </h3>

      {/* Add Warning Form */}
      <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label htmlFor="customer-select" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Cliente</label>
            <select
              id="customer-select"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              required
              className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
            >
              <option value="" disabled>Selecione um cliente</option>
              {sortedCustomers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="warning-message" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Mensagem de Aviso</label>
            <textarea
              id="warning-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={2}
              placeholder="Ex: Verificar barulho na jukebox, cliente pediu mesa nova..."
              className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
            />
          </div>
        </div>
        <div className="text-right mt-4">
            <button
                type="submit"
                className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold py-2 px-4 rounded-md hover:bg-purple-500"
            >
                <PlusIcon className="w-5 h-5" />
                Adicionar Aviso
            </button>
        </div>
      </form>

      {/* Active Warnings List */}
      <div>
        <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Avisos Pendentes ({activeWarnings.length})</h4>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {activeWarnings.length > 0 ? (
            activeWarnings.map(warning => (
              <div key={warning.id} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-start gap-4">
                <div className="flex-grow">
                  <p className="font-bold text-purple-600 dark:text-purple-400">{warning.customerName}</p>
                  <p className="text-slate-600 dark:text-slate-300 my-1">{warning.message}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{new Date(warning.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <button onClick={() => onResolveWarning(warning.id)} title="Marcar como Resolvido" className="p-1.5 text-green-500 hover:text-green-400 hover:bg-green-500/10 rounded-full">
                    <CheckCircleIcon className="w-5 h-5" />
                  </button>
                  <button onClick={() => setWarningToDelete(warning.id)} title="Excluir Aviso" className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-full">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-6 text-slate-500 dark:text-slate-400 italic">Nenhum aviso pendente.</p>
          )}
        </div>
      </div>

      {warningToDelete && (
          <ActionModal
              isOpen={!!warningToDelete}
              onClose={() => setWarningToDelete(null)}
              onConfirm={() => { onDeleteWarning(warningToDelete); setWarningToDelete(null); }}
              title="Confirmar Exclusão"
              confirmText="Sim, Excluir"
              requirePassword="1678"
          >
              <p>Tem certeza que deseja excluir este aviso?</p>
          </ActionModal>
      )}
    </div>
  );
};

export default WarningsManager;