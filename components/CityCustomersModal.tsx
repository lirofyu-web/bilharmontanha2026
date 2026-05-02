import { Customer, Warning, Billing } from '../types';
import CustomerCard from './CustomerCard';
import { XIcon } from './icons/XIcon';
import { usePagination } from '../hooks/usePagination';
import { InfiniteScrollTrigger } from './InfiniteScrollTrigger';

interface CityCustomersModalProps {
  city: string;
  customers: Customer[];
  warnings: Warning[];
  billings: Billing[];
  onClose: () => void;
  // Pass down all the handlers CustomerCard needs
  onBillCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  onPayDebtCustomer: (customer: Customer) => void;
  onHistoryCustomer: (customer: Customer) => void;
  showNotification: (message: string, type?: 'success' | 'error') => void;
  onFocusCustomer: (customer: Customer) => void;
  onFichaActions: (customer: Customer) => void;
  onLocationActions: (customer: Customer) => void;
  onWhatsAppActions: (customer: Customer) => void;
  onFinalizePendingPayment: (billing: Billing) => void;
  onPendingPaymentAction: (customer: Customer, billing: Billing) => void;
  onAddWarning: (customerId: string, message: string) => Promise<void>;
  onResolveWarning: (warningId: string) => Promise<void>;
  onWarningClick: (customer: Customer) => void;
  areValuesHidden: boolean;
  onUpdateCustomer: (updatedCustomer: Partial<Customer> & { id: string }) => void;
}

const CityCustomersModal: React.FC<CityCustomersModalProps> = ({
  city,
  customers,
  warnings,
  billings,
  onClose,
  onBillCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onPayDebtCustomer,
  onHistoryCustomer,
  showNotification,
  onFocusCustomer,
  onFichaActions,
  onLocationActions,
  onWhatsAppActions,
  onFinalizePendingPayment,
  onPendingPaymentAction,
  onAddWarning,
  onResolveWarning,
  onWarningClick,
  areValuesHidden,
  onUpdateCustomer,
}) => {
  const { 
    slicedItems: slicedCustomers, 
    loadMore, 
    hasMore 
  } = usePagination(customers, 15);

  const handleFocus = (customer: Customer) => {
    onFocusCustomer(customer);
    onClose(); // Close this modal before opening the full-screen view
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 p-4 animate-fade-in no-print"
      role="dialog"
      aria-modal="true"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between mb-6 pb-4 border-b border-slate-700 bg-slate-900/90 -mx-4 px-4 -mt-4 pt-4">
        <h1 className="text-4xl lg:text-5xl font-black text-white break-words">
          {city}
        </h1>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-full"
          aria-label="Fechar"
        >
          <XIcon className="w-8 h-8" />
        </button>
      </header>

      <main className="overflow-y-auto h-full pb-16 -mx-4 px-4">
        {slicedCustomers.length > 0 ? (
          <div className="flex flex-wrap justify-center -m-3">
            {slicedCustomers.map(customer => {
              const hasActiveWarning = warnings.some(w => w.customerId === customer.id && !w.isResolved);
              return (
                <div key={customer.id} className="w-full md:w-1/2 lg:w-1/3 p-3">
                    <CustomerCard
                      customer={customer}
                      billings={billings}
                      hasActiveWarning={hasActiveWarning}
                      activeWarningId={warnings.find(w => w.customerId === customer.id && !w.isResolved)?.id}
                      onBill={onBillCustomer}
                      onEdit={onEditCustomer}
                      onDelete={onDeleteCustomer}
                      onPayDebt={onPayDebtCustomer}
                      onHistory={onHistoryCustomer}
                      showNotification={showNotification}
                      onFocusCustomer={handleFocus}
                      onLocationActions={onLocationActions}
                      onWhatsAppActions={onWhatsAppActions}
                      onFichaActions={onFichaActions}
                      onFinalizePendingPayment={onFinalizePendingPayment}
                      onPendingPaymentAction={onPendingPaymentAction}
                      onAddWarning={onAddWarning}
                      onResolveWarning={onResolveWarning}
                      onWarningClick={onWarningClick}
                      areValuesHidden={areValuesHidden}
                      onUpdateCustomer={onUpdateCustomer}
                    />
                </div>
              );
            })}
            <div className="w-full p-3">
                <InfiniteScrollTrigger onIntersect={loadMore} hasMore={hasMore} />
            </div>
          </div>
        ) : (
          <p className="text-center py-10 text-slate-500 dark:text-slate-400">
            Nenhum cliente encontrado para esta cidade com os filtros atuais.
          </p>
        )}
      </main>
      
      <style>{`
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default CityCustomersModal;