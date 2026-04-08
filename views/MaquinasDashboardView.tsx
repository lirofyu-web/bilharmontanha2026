import React, { useState, useMemo } from 'react';
import { Customer, Equipment } from '../types';
import { HerokuNativeDashboard } from '../components/HerokuNativeDashboard';
import { DatabaseIcon, SearchIcon, ArrowsRightLeftIcon, ChevronRightIcon } from '../components/icons';

interface MaquinasDashboardViewProps {
    customers: Customer[];
}

export const MaquinasDashboardView: React.FC<MaquinasDashboardViewProps> = ({ customers }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMachine, setSelectedMachine] = useState<{ herokuId: string; name: string; customerName: string; mpStoreId?: string } | null>(null);

    const machines = useMemo(() => {
        const list: { herokuId: string; name: string; customerName: string; mpStoreId?: string; type: string }[] = [];
        customers.forEach(customer => {
            customer.equipment.forEach(eq => {
                if (eq.herokuId) {
                    list.push({
                        herokuId: eq.herokuId,
                        name: eq.numero || eq.id,
                        customerName: customer.name,
                        mpStoreId: customer.mercadoPagoStoreId,
                        type: eq.type
                    });
                }
            });
        });
        return list.filter(m => 
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            m.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.herokuId.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [customers, searchTerm]);

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
            {/* Header Area */}
            <div className="bg-slate-800 border-b border-slate-700 p-4 shadow-lg z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
                            <DatabaseIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight uppercase">Painel de Máquinas</h1>
                            <p className="text-slate-400 text-xs font-bold">{machines.length} Dispositivos ESP32 Ativos</p>
                        </div>
                    </div>

                    <div className="relative flex-1 max-w-md">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, cliente ou ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800/50 via-slate-900 to-slate-950">
                <div className="max-w-7xl mx-auto">
                    {machines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                                <DatabaseIcon className="w-10 h-10 text-slate-600" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-300">Nenhuma máquina encontrada</h2>
                            <p className="text-slate-500 text-sm max-w-xs mt-2">Certifique-se de que os equipamentos dos clientes possuem um Heroku ID configurado.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {machines.map((machine) => (
                                <button
                                    key={machine.herokuId}
                                    onClick={() => setSelectedMachine(machine)}
                                    className="group relative bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/50 rounded-2xl p-4 transition-all duration-300 text-left overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 active:scale-[0.98]"
                                >
                                    {/* Decor */}
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <DatabaseIcon className="w-12 h-12 text-white" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                machine.type === 'jukebox' ? 'bg-purple-900/50 text-purple-300' :
                                                machine.type === 'mesa' ? 'bg-emerald-900/50 text-emerald-300' :
                                                'bg-amber-900/50 text-amber-300'
                                            }`}>
                                                {machine.type}
                                            </span>
                                            <ChevronRightIcon className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                        </div>
                                        
                                        <h3 className="text-lg font-black text-white leading-tight mb-1 truncate">
                                            {machine.name}
                                        </h3>
                                        <p className="text-slate-400 text-xs font-bold truncate">
                                            {machine.customerName}
                                        </p>
                                        
                                        <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                                            <code className="text-[10px] text-indigo-400/70 font-mono">
                                                {machine.herokuId.substring(0, 8)}...
                                            </code>
                                            <span className="flex items-center text-[10px] text-slate-500 font-bold uppercase">
                                                Visualizar <ChevronRightIcon className="w-3 h-3 ml-1" />
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Dashboard Modal */}
            {selectedMachine && (
                <HerokuNativeDashboard
                    isOpen={true}
                    onClose={() => setSelectedMachine(null)}
                    herokuId={selectedMachine.herokuId}
                    machineName={selectedMachine.name}
                    customerMpStoreId={selectedMachine.mpStoreId}
                />
            )}
        </div>
    );
};

export default MaquinasDashboardView;
