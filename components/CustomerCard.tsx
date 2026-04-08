import React, { useState, useMemo } from 'react';
import { Customer, Equipment, Billing, Warning } from '../types';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CurrencyDollarIcon } from './icons/CurrencyDollarIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { LocationArrowIcon } from './icons/LocationArrowIcon';
import { BilliardIcon } from './icons/BilliardIcon';
import { JukeboxIcon } from './icons/JukeboxIcon';
import { CraneIcon } from './icons/CraneIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ReceiptIcon } from './icons/ReceiptIcon';
import { RedBilliardBallIcon } from './icons/RedBilliardBallIcon';
import { GreenBilliardBallIcon } from './icons/GreenBilliardBallIcon';
import { YellowBilliardBallIcon } from './icons/YellowBilliardBallIcon';
import { PurpleBilliardBallIcon } from './icons/PurpleBilliardBallIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';

interface CustomerCardProps {
  customer: Customer;
  billings: Billing[];
  onBill: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onPayDebt: (customer: Customer) => void;
  onHistory: (customer: Customer) => void;
  onLocationActions: (customer: Customer) => void;
  onWhatsAppActions: (customer: Customer) => void;
  onFichaActions: (customer: Customer) => void;
  onFinalizePendingPayment: (billing: Billing) => void;
  onPendingPaymentAction: (customer: Customer, billing: Billing) => void;
  onWarningClick: (customer: Customer) => void;
  hasActiveWarning: boolean;
  showNotification: (message: string, type?: 'success' | 'error') => void;
  onFocusCustomer: (customer: Customer) => void;
  areValuesHidden: boolean;
  onUpdateCustomer: (updatedCustomer: Partial<Customer> & { id: string }) => void;
  onOpenDigitalBilling?: (customer: Customer) => void;
  onOpenEsp32Dashboard?: (herokuId: string, machineName: string, customerMpStoreId?: string) => void;
}

const EquipmentIcon: React.FC<{ type: Equipment['type'], className?: string }> = ({ type, className }) => {
    const finalClassName = className || 'w-5 h-5';
    const colorMap = {
        mesa: 'text-cyan-400',
        jukebox: 'text-fuchsia-400',
        grua: 'text-orange-400',
    };
    const colors = colorMap[type] || '';
    switch (type) {
        case 'mesa': return <BilliardIcon className={`${finalClassName} ${colors}`} />;
        case 'jukebox': return <JukeboxIcon className={`${finalClassName} ${colors}`} />;
        case 'grua': return <CraneIcon className={`${finalClassName} ${colors}`} />;
        default: return null;
    }
};

const EquipmentDetailRow: React.FC<{ label: string; value: string | number | undefined | null; areValuesHidden?: boolean }> = ({ label, value, areValuesHidden }) => {
  if (value === undefined || value === null || value === '') return null;
  const isCurrency = typeof value === 'string' && value.startsWith('R$');

  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-400">{label}:</span>
      <span className="font-semibold text-slate-200">{areValuesHidden && isCurrency ? 'R$ •••,••' : String(value)}</span>
    </div>
  );
};


const CustomerCard: React.FC<CustomerCardProps> = ({ customer, billings, onBill, onEdit, onDelete, onPayDebt, onHistory, onLocationActions, onWhatsAppActions, onFichaActions, onWarningClick, hasActiveWarning, showNotification, onFocusCustomer, onFinalizePendingPayment, onPendingPaymentAction, areValuesHidden, onUpdateCustomer, onOpenDigitalBilling, onOpenEsp32Dashboard }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const pendingBilling = useMemo(() => {
        return billings.find(b => 
            b.customerId === customer.id && 
            b.paymentMethod === 'pending_payment' &&
            (b.equipmentType === 'mesa' || b.equipmentType === 'jukebox')
        );
    }, [billings, customer.id]);

    const hasDebt = customer.debtAmount > 0;
    const twentyFiveDaysInMs = 25 * 24 * 60 * 60 * 1000;
    const visitIsPending = !customer.lastVisitedAt || (new Date().getTime() - new Date(customer.lastVisitedAt).getTime()) > twentyFiveDaysInMs;

    const handleBillingAction = () => {
        if (!pendingBilling) {
            onBill(customer);
            return;
        }

        const hasMultipleEquipment = customer.equipment && customer.equipment.length > 1;

        if (hasMultipleEquipment) {
            onPendingPaymentAction(customer, pendingBilling);
        } else {
            onFinalizePendingPayment(pendingBilling);
        }
    };
    
    const handleLocationClick = () => {
        onLocationActions(customer);
    };

    const handleWarningClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onWarningClick(customer);
    };

    const ActionButton: React.FC<{onClick: () => void, icon: React.ReactNode, label: string, colorClass: string, disabled?: boolean, isPrimary?: boolean, title?: string, pulse?: boolean}> = ({onClick, icon, label, colorClass, disabled, isPrimary, title, pulse}) => (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`flex flex-col items-center justify-center w-full p-2 rounded-lg font-medium transition-colors text-center ${pulse ? '' : colorClass} ${
                disabled
                ? 'bg-slate-500 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : isPrimary
                ? 'bg-lime-600 text-white hover:bg-lime-700'
                : `${colorClass} text-white hover:opacity-90`
            } ${pulse ? 'animate-blink-colors' : ''}`}
        >
            {icon}
            <span className="mt-1 text-xs leading-tight tracking-tighter">{label}</span>
        </button>
    );

    const equipmentTypeText = {
        'mesa': 'Mesa de Sinuca',
        'jukebox': 'Jukebox',
        'grua': 'Grua de Pelúcia'
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 transition-shadow duration-300 hover:shadow-xl">
            <div className="p-3">
                <div
                    className="flex flex-wrap justify-between items-start gap-2 cursor-pointer group"
                    onClick={() => onFocusCustomer(customer)}
                >
                    <div className="flex-grow">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 break-words group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors">
                            {customer.name}
                            {hasActiveWarning && (
                                <button onClick={handleWarningClick} title="Aviso pendente">
                                    <PurpleBilliardBallIcon className="w-4 h-4 pulse-indicator" />
                                </button>
                            )}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 break-words">{customer.cidade} - Cobrador: {customer.linhaNumero}</p>
                    </div>
                    <div className="flex items-center flex-wrap justify-end gap-3">
                        {visitIsPending ? (
                            <div title="Visita Pendente">
                                <RedBilliardBallIcon className="w-4 h-4 text-red-500 pulse-indicator" />
                            </div>
                        ) : (
                            <div title={`Visitado em ${new Date(customer.lastVisitedAt!).toLocaleDateString('pt-BR')}`}>
                                <GreenBilliardBallIcon className="w-4 h-4 text-green-500" />
                            </div>
                        )}
                        {hasDebt && (
                            <div title={areValuesHidden ? "Dívida Pendente" : `Dívida: R$ ${customer.debtAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-sm bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-600">
                               <YellowBilliardBallIcon className="w-4 h-4 text-amber-500" />
                               <span>{areValuesHidden ? 'Dívida' : `R$ ${customer.debtAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="mt-4 space-y-1.5">
                    <div className="grid grid-cols-3 gap-1.5">
                        <ActionButton
                            onClick={handleBillingAction}
                            icon={<ReceiptIcon className="w-5 h-5" />}
                            label={pendingBilling ? (customer.equipment?.length > 1 ? "Opções" : "Finalizar") : "COBRAR"}
                            colorClass={pendingBilling ? "bg-lime-500" : "bg-yellow-500"}
                            pulse={!!pendingBilling}
                            title={pendingBilling ? `Ações para pagamento pendente` : "Cobrar novo equipamento"}
                        />
                        <ActionButton onClick={() => onEdit(customer)} icon={<PencilIcon className="w-5 h-5" />} label="Editar" colorClass="bg-sky-600" title='Editar Cliente' />
                        <ActionButton 
                            onClick={() => onPayDebt(customer)} 
                            icon={<CurrencyDollarIcon className="w-5 h-5" />} 
                            label={hasDebt ? "Pagar" : "Dívida"} 
                            colorClass={hasDebt ? "bg-amber-600" : "bg-orange-500"}
                            title={hasDebt ? "Registrar pagamento de dívida" : "Adicionar uma dívida avulsa"}
                        />
                        <ActionButton onClick={() => onHistory(customer)} icon={<HistoryIcon className="w-5 h-5" />} label="Histórico" colorClass="bg-indigo-600" />
                        <ActionButton onClick={() => onFichaActions(customer)} icon={<DocumentTextIcon className="w-5 h-5" />} label="Ficha" colorClass="bg-pink-600" title='Ver ou compartilhar ficha' />
                        <ActionButton onClick={() => onDelete(customer)} icon={<TrashIcon className="w-5 h-5" />} label="Excluir" colorClass="bg-red-600" title='Excluir Cliente' />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        <ActionButton
                            onClick={() => onWhatsAppActions(customer)}
                            icon={<WhatsAppIcon className="w-5 h-5" />}
                            label="WhatsApp"
                            colorClass={customer.telefone ? 'bg-green-700' : 'bg-slate-600'}
                            title={customer.telefone ? 'Opções do WhatsApp' : 'Adicionar WhatsApp'}
                        />
                        <ActionButton
                            onClick={handleLocationClick}
                            icon={<LocationArrowIcon className="w-5 h-5" />}
                            label="Localização"
                            colorClass={customer.latitude ? "bg-blue-700" : "bg-slate-600"}
                            title={customer.latitude ? 'Ver localização' : 'Salvar localização atual'}
                        />
                    </div>
                </div>

                {/* Standardized Integration Buttons */}
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {customer.mercadoPagoStoreId && onOpenDigitalBilling && (
                        <ActionButton
                            onClick={() => onOpenDigitalBilling(customer)}
                            icon={<CreditCardIcon className="w-5 h-5" />}
                            label="MP DIGITAL"
                            colorClass="bg-emerald-600"
                            title="Faturamento Digital"
                        />
                    )}
                    
                    {customer.equipment.some(e => (e as any).herokuId) && onOpenEsp32Dashboard && (
                        <ActionButton
                            onClick={() => {
                                const equip = customer.equipment.find(e => (e as any).herokuId);
                                if (equip) onOpenEsp32Dashboard((equip as any).herokuId, `${customer.name} - ${equip.numero}`, customer.mercadoPagoStoreId);
                            }}
                            icon={<div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(74,222,128,0.5)]"></div>}
                            label="CONTROLE PIX"
                            colorClass="bg-blue-600"
                            title="Gestão Remota ESP32"
                        />
                    )}
                </div>
            </div>

            {customer.equipment && customer.equipment.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex justify-between items-center p-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50">
                        <span className="font-semibold">Equipamentos ({customer.equipment.length})</span>
                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isExpanded && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 space-y-3">
                            {customer.equipment.map((equip) => (
                                <div key={equip.id} className="p-3 bg-slate-800 rounded-lg">
                                    <div className="flex items-center gap-3 mb-3">
                                        <EquipmentIcon type={equip.type} className="w-5 h-5" />
                                        <span className="font-bold text-md text-white">{equipmentTypeText[equip.type]} {equip.numero}</span>
                                    </div>
                                    <div className="space-y-1 font-mono">
                                        <EquipmentDetailRow label="Nº Relógio" value={equip.relogioNumero} />
                                        <EquipmentDetailRow label="Leitura Anterior" value={equip.relogioAnterior} />
                                        {equip.type === 'mesa' && (
                                            equip.billingType === 'monthly' ? (
                                                <EquipmentDetailRow label="Mensalidade" value={`R$ ${(equip.monthlyFeeValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} areValuesHidden={areValuesHidden} />
                                            ) : (
                                                <>
                                                    <EquipmentDetailRow label="Vlr. Ficha" value={`R$ ${(equip.valorFicha || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} areValuesHidden={areValuesHidden} />
                                                    <EquipmentDetailRow label="Parte Firma" value={`${equip.parteFirma || 0}%`} />
                                                </>
                                            )
                                        )}
                                        {equip.type === 'jukebox' && (
                                            <EquipmentDetailRow label="Parte Firma" value={`${equip.porcentagemJukeboxFirma || 0}%`} />
                                        )}
                                        {equip.type === 'grua' && (
                                            <>
                                                {equip.aluguelPercentual != null && <EquipmentDetailRow label="Aluguel" value={`${equip.aluguelPercentual}%`} />}
                                                {equip.aluguelValor != null && <EquipmentDetailRow label="Aluguel" value={`R$ ${(equip.aluguelValor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} areValuesHidden={areValuesHidden} />}
                                                <EquipmentDetailRow label="Capacidade Pelúcias" value={equip.quantidadePelucia} />
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(CustomerCard);
