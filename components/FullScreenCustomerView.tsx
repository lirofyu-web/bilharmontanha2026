import React, { useMemo } from 'react';
import { Customer, Equipment, Warning } from '../types';
import { XIcon } from './icons/XIcon';
import { BilliardIcon } from './icons/BilliardIcon';
import { JukeboxIcon } from './icons/JukeboxIcon';
import { CraneIcon } from './icons/CraneIcon';
import { PurpleBilliardBallIcon } from './icons/PurpleBilliardBallIcon';
import { LocationMarkerIcon } from './icons/LocationMarkerIcon';
import { PhoneIcon } from './icons/PhoneIcon'; // Assuming you have this icon
import { AnnotationIcon } from './icons/AnnotationIcon'; // Assuming you have this icon


interface FullScreenCustomerViewProps {
    customer: Customer;
    onClose: () => void;
    warnings: Warning[];
    onWarningClick: (customer: Customer) => void;
}

const DetailItem: React.FC<{icon: React.ReactNode, label: string, value: React.ReactNode}> = ({ icon, label, value }) => (
    <div className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <div className="mt-1 text-slate-400">{icon}</div>
        <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-md text-slate-800 dark:text-slate-200 font-medium">{value}</p>
        </div>
    </div>
);


const FullScreenCustomerView: React.FC<FullScreenCustomerViewProps> = ({ 
    customer, 
    onClose, 
    warnings, 
    onWarningClick,
    onOpenEsp32Dashboard,
}) => {
    
    const handleWarningClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onWarningClick) {
            onWarningClick(customer);
        }
    };

    const hasActiveWarning = useMemo(() => {
        return warnings.some((w: Warning) => w.customerId === customer.id && !w.isResolved);
    }, [warnings, customer.id]);

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

    const equipmentTypeText = {
        'mesa': 'Mesa de Sinuca',
        'jukebox': 'Jukebox',
        'grua': 'Grua de Pelúcia'
    };
    
    const fullAddress = [customer.endereco, customer.cidade].filter(Boolean).join(', ');

    if (!customer) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm animate-fade-in no-print">
            <div className="relative h-full bg-slate-100 dark:bg-slate-900 overflow-y-auto">
                <header className="sticky top-0 z-20 flex items-center justify-between p-4 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                            {customer.name}
                            {hasActiveWarning && (
                                <button onClick={handleWarningClick} title="Aviso pendente">
                                    <PurpleBilliardBallIcon className="w-6 h-6 pulse-indicator" />
                                </button>
                            )}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{customer.cidade}</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="ml-4 p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Fechar"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>

                <main className="p-4 md:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <section>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Informações de Contato</h3>
                            <div className="space-y-3">
                                {fullAddress && <DetailItem icon={<LocationMarkerIcon className='w-5 h-5'/>} label='Endereço' value={fullAddress} />}
                                {customer.telefone && <DetailItem icon={<PhoneIcon className='w-5 h-5'/>} label='Telefone' value={customer.telefone} />}
                                {customer.pontoReferencia && <DetailItem icon={<AnnotationIcon className='w-5 h-5'/>} label='Ponto de Referência' value={customer.pontoReferencia} />}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Equipamentos</h3>
                            <div className="space-y-3">
                                {(customer.equipment || []).map((equip: Equipment) => (
                                    <div key={equip.id} className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <EquipmentIcon type={equip.type} className="w-6 h-6" />
                                            <div>
                                                <span className="font-bold text-md text-slate-800 dark:text-slate-100">{equipmentTypeText[equip.type]} {equip.numero}</span>
                                                <p className='text-xs text-slate-500 dark:text-slate-400'>Nº de Série: {equip.serialNumber || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!customer.equipment || customer.equipment.length === 0) && (
                                    <div className="text-slate-500 dark:text-slate-400 text-center py-8 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg">
                                        <p>Nenhum equipamento cadastrado.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
            <style>{`
                @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
                .pulse-indicator { animation: pulse 1.5s infinite; }
                @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default FullScreenCustomerView;
