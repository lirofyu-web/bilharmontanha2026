// views/DashboardView.tsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Customer, Billing, Expense, DebtPayment, Warning, Equipment } from '../types';
import PageHeader from '../components/PageHeader';
import { JukeboxIcon } from '../components/icons/JukeboxIcon';
import { BilliardIcon } from '../components/icons/BilliardIcon';
import { CraneIcon } from '../components/icons/CraneIcon';
import DebtReminders from '../components/DebtReminders';
import { ChartBarIcon } from '../components/icons/ChartBarIcon';
import { CreditCardIcon } from '../components/icons/CreditCardIcon';
import WarningsReminders from '../components/WarningsReminders';
import { CalculatorIcon } from '../components/icons/CalculatorIcon';
import { CurrencyDollarIcon } from '../components/icons/CurrencyDollarIcon';
import { LocationMarkerIcon } from '../components/icons/LocationMarkerIcon';
import { ArrowsRightLeftIcon } from '../components/icons/ArrowsRightLeftIcon';



interface DashboardViewProps {
  billings: Billing[];
  expenses: Expense[];
  customers: Customer[];
  debtPayments: DebtPayment[];
  warnings: Warning[];
  lastBackupDate: string | null;
  onExportData: () => void;
  onNavigateToSettings: () => void;
  areValuesHidden: boolean;
  deletedCustomersLog: { customer: Customer, deletedAt: Date }[];
}


interface DateFilterProps {
    currentDate: Date;
    onMonthChange: (month: number) => void;
    onYearChange: (year: number) => void;
}
const DateFilter: React.FC<DateFilterProps> = React.memo(({ currentDate, onMonthChange, onYearChange }) => {
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Período de Análise:</h3>
            <select value={currentDate.getMonth()} onChange={(e) => onMonthChange(parseInt(e.target.value))} className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500">
                {monthNames.map((month, index) => <option key={month} value={index}>{month}</option>)}
            </select>
            <select value={currentDate.getFullYear()} onChange={(e) => onYearChange(parseInt(e.target.value))} className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500">
                {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
        </div>
    );
});

type ChartView = 'total' | 'average';
type CategoryData = {
    label: string;
    faturamentoTotal: number;
    saldo: number;
    despesas: number;
    quantidade: number;
    color: string;
    icon: React.FC<{className?: string}>;
    receitaDinheiro: number;
    receitaPix: number;
};

interface FinancialPerformanceCardProps {
    stats: MonthlyStats;
    chartView: ChartView;
    onChartViewChange: (view: ChartView) => void;
    areValuesHidden: boolean;
}

const FinancialPerformanceCard: React.FC<FinancialPerformanceCardProps> = React.memo(({ stats, chartView, onChartViewChange, areValuesHidden }) => {
    
    const chartData: CategoryData[] = useMemo(() => [
        { 
            label: 'Mesas',
            faturamentoTotal: chartView === 'total' ? stats.totalRevenueMesa : stats.averageRevenueMesa,
            saldo: chartView === 'total' ? stats.balanceMesa : stats.averageProfitMesa,
            despesas: chartView === 'total' ? stats.expensesMesa : (stats.mesaCount > 0 ? stats.expensesMesa / stats.mesaCount : 0),
            receitaDinheiro: chartView === 'total' ? stats.revenueMesaDinheiro : (stats.mesaCount > 0 ? stats.revenueMesaDinheiro / stats.mesaCount : 0),
            receitaPix: chartView === 'total' ? stats.revenueMesaPix : (stats.mesaCount > 0 ? stats.revenueMesaPix / stats.mesaCount : 0),
            quantidade: stats.mesaCount,
            color: 'cyan', 
            icon: BilliardIcon
        },
        { 
            label: 'Jukeboxes',
            faturamentoTotal: chartView === 'total' ? stats.totalRevenueJukebox : stats.averageRevenueJukebox,
            saldo: chartView === 'total' ? stats.balanceJukebox : stats.averageProfitJukebox,
            despesas: chartView === 'total' ? stats.expensesJukebox : (stats.jukeboxCount > 0 ? stats.expensesJukebox / stats.jukeboxCount : 0),
            receitaDinheiro: chartView === 'total' ? stats.revenueJukeboxDinheiro : (stats.jukeboxCount > 0 ? stats.revenueJukeboxDinheiro / stats.jukeboxCount : 0),
            receitaPix: chartView === 'total' ? stats.revenueJukeboxPix : (stats.jukeboxCount > 0 ? stats.revenueJukeboxPix / stats.jukeboxCount : 0),
            quantidade: stats.jukeboxCount,
            color: 'fuchsia', 
            icon: JukeboxIcon
        },
        { 
            label: 'Gruas',
            faturamentoTotal: chartView === 'total' ? stats.totalRevenueGrua : stats.averageRevenueGrua,
            saldo: chartView === 'total' ? stats.balanceGrua : stats.averageProfitGrua,
            despesas: chartView === 'total' ? stats.expensesGrua : (stats.gruaCount > 0 ? stats.expensesGrua / stats.gruaCount : 0),
            receitaDinheiro: chartView === 'total' ? stats.revenueGruaEspecie : (stats.gruaCount > 0 ? stats.revenueGruaEspecie / stats.gruaCount : 0),
            receitaPix: chartView === 'total' ? stats.revenueGruaPix : (stats.gruaCount > 0 ? stats.revenueGruaPix / stats.gruaCount : 0),
            quantidade: stats.gruaCount,
            color: 'orange', 
            icon: CraneIcon
        },
    ], [stats, chartView]);

    const maxValue = useMemo(() => {
        const values = chartData.map(d => d.faturamentoTotal);
        const max = Math.max(...values);
        return max > 0 ? max : 1;
    }, [chartData]);
    
    const bestPerformerLabel = useMemo(() => {
        if (chartData.every(d => d.saldo <= 0)) return null;
        return chartData.reduce((best, current) => current.saldo > best.saldo ? current : best).label;
    }, [chartData]);

    const colorClasses = {
        cyan: { revenue: 'bg-cyan-500/30', profit: 'bg-cyan-500', text: 'text-cyan-400', border: 'border-cyan-500' },
        fuchsia: { revenue: 'bg-fuchsia-500/30', profit: 'bg-fuchsia-500', text: 'text-fuchsia-400', border: 'border-fuchsia-500' },
        orange: { revenue: 'bg-orange-500/30', profit: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500' },
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
                <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <ChartBarIcon className="w-6 h-6 text-indigo-500" />
                        <span className="hidden sm:inline">Desempenho Financeiro</span>
                        <span className="sm:hidden">Desempenho</span>
                    </h3>
                     <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Análise de COBRANÇA Bruta vs. Saldo Líquido.</p>
                </div>
                 <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg self-end sm:self-center">
                    <button onClick={() => onChartViewChange('total')} className={`px-2 sm:px-3 py-1 text-xs font-bold rounded-md transition-colors ${chartView === 'total' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400'}`}>Total</button>
                    <button onClick={() => onChartViewChange('average')} className={`px-2 sm:px-3 py-1 text-xs font-bold rounded-md transition-colors ${chartView === 'average' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400'}`}>Média</button>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex justify-around items-end h-40 sm:h-48 pt-4">
                {chartData.map(item => {
                    const revenueHeight = areValuesHidden ? '50%' : `${(item.faturamentoTotal / maxValue) * 100}%`;
                    const profitHeight = areValuesHidden ? '50%' : item.faturamentoTotal > 0 ? `${(item.saldo / item.faturamentoTotal) * 100}%` : '0%';
                    const colors = colorClasses[item.color as keyof typeof colorClasses];
                    
                    return (
                        <div key={item.label} className="flex flex-col items-center w-1/4 h-full text-center">
                            <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 mb-1 break-words">
                                {areValuesHidden ? 'R$ •••' : `R$ ${(chartView === 'total' ? item.saldo : item.saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </div>
                            <div 
                                className={`w-8 sm:w-12 md:w-16 rounded-t-md ${colors.revenue} relative transition-all duration-700 ease-out`} 
                                style={{ height: revenueHeight }}
                                title={areValuesHidden ? 'Valor Oculto' : `COBRANÇA: R$ ${item.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            >
                                <div 
                                    className={`absolute bottom-0 left-0 right-0 rounded-t-md ${colors.profit}`} 
                                    style={{ height: profitHeight }}
                                    title={areValuesHidden ? 'Valor Oculto' : `Saldo: R$ ${item.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Details Area */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                {chartData.map(item => {
                    const colors = colorClasses[item.color as keyof typeof colorClasses];
                    const isBest = item.label === bestPerformerLabel;
                    return (
                        <div key={item.label} className={`p-3 sm:p-4 rounded-lg transition-all duration-300 ${isBest && !areValuesHidden ? 'bg-amber-50 dark:bg-amber-900/30 ring-2 ring-amber-400 shadow-lg shadow-amber-500/20' : 'bg-slate-50 dark:bg-slate-900/50'}`}>
                            <div className="flex justify-between items-start">
                                <h4 className={`font-bold flex items-center gap-2 ${colors.text}`}>
                                    <item.icon className="w-5 h-5" />
                                    {item.label}
                                </h4>
                                {isBest && !areValuesHidden && <span className="text-xs font-bold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">Destaque</span>}
                            </div>
                            <div className="mt-2 text-xs space-y-1 font-mono">
                               <InfoRow label="Receita (Dinheiro):" value={areValuesHidden ? 'R$ •••,••' : `R$ ${item.receitaDinheiro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} valueColor="text-sky-600 dark:text-sky-400" />
                               <InfoRow label="Receita (PIX):" value={areValuesHidden ? 'R$ •••,••' : `R$ ${item.receitaPix.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} valueColor="text-lime-600 dark:text-lime-400" />
                               <InfoRow label="Despesas:" value={areValuesHidden ? 'R$ •••,••' : `- R$ ${item.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} valueColor="text-red-600 dark:text-red-400" />
                               <InfoRow label="Saldo Líquido:" value={areValuesHidden ? 'R$ •••,••' : `R$ ${item.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} valueColor={item.saldo >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'} />
                               <InfoRow label="Quantidade:" value={`${item.quantidade} unid.`} valueColor="text-slate-500 dark:text-slate-400" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});


interface InfoCardProps {
    title: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
}
const InfoCard: React.FC<InfoCardProps> = React.memo(({ title, children, icon, className }) => (
    <div className={`bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 h-full ${className}`}>
        <div className="flex items-center gap-3 text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">
          {icon}
          <h3>{title}</h3>
        </div>
        <dl className="space-y-3">
            {children}
        </dl>
    </div>
));

interface InfoRowProps {
    label: string;
    value: string;
    valueColor?: string;
    className?: string;
}
const InfoRow: React.FC<InfoRowProps> = React.memo(({ label, value, valueColor = 'text-slate-600 dark:text-slate-300', className }) => (
    <div className={`flex justify-between items-baseline gap-2 ${className}`}>
        <dt className="text-slate-500 dark:text-slate-400 break-words">{label}</dt>
        <dd className={`font-mono font-bold ${valueColor} text-right break-words`}>{value}</dd>
    </div>
));

const StatCircle: React.FC<{ percentage: number; colorClass: string }> = ({ percentage, colorClass }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20">
      <svg className="w-full h-full" viewBox="0 0 66 66">
        <circle
          className="text-slate-200 dark:text-slate-700"
          strokeWidth="7"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="33"
          cy="33"
        />
        <circle
          className={colorClass}
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="33"
          cy="33"
          transform="rotate(-90 33 33)"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base sm:text-lg font-bold text-slate-700 dark:text-slate-200">
        {`${Math.round(percentage)}%`}
      </span>
    </div>
  );
};

const EquipmentVisitationStat: React.FC<{
  label: string;
  icon: React.ReactNode;
  visited: number;
  total: number;
  colorClass: string;
  areValuesHidden: boolean;
}> = ({ label, icon, visited, total, colorClass, areValuesHidden }) => {
  const percentage = total > 0 ? (visited / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="flex-shrink-0">
        <StatCircle percentage={areValuesHidden ? 50 : percentage} colorClass={colorClass} />
      </div>
      <div>
        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
          {icon} {label}
        </h4>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {areValuesHidden ? 'Visitados: ? / ?' : `Visitados: ${visited} / ${total}`}
        </p>
      </div>
    </div>
  );
};


const VisitationCard: React.FC<{
  customers: Customer[];
  currentDate: Date;
  areValuesHidden: boolean;
}> = ({ customers, currentDate, areValuesHidden }) => {
    const visitationStats = useMemo(() => {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

        const stats = {
            mesa: { total: 0, visited: 0 },
            jukebox: { total: 0, visited: 0 },
            grua: { total: 0, visited: 0 },
        };

        customers.forEach(customer => {
            const equipmentTypes = new Set(customer.equipment.map(e => e.type));
            
            const wasVisitedInPeriod = customer.lastVisitedAt &&
                                       new Date(customer.lastVisitedAt) >= startOfMonth &&
                                       new Date(customer.lastVisitedAt) <= endOfMonth;

            if (equipmentTypes.has('mesa')) {
                stats.mesa.total++;
                if (wasVisitedInPeriod) stats.mesa.visited++;
            }
            if (equipmentTypes.has('jukebox')) {
                stats.jukebox.total++;
                if (wasVisitedInPeriod) stats.jukebox.visited++;
            }
            if (equipmentTypes.has('grua')) {
                stats.grua.total++;
                if (wasVisitedInPeriod) stats.grua.visited++;
            }
        });

        return stats;
    }, [customers, currentDate]);

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 h-full flex flex-col">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <LocationMarkerIcon className="w-6 h-6 text-green-500" />
                Visitação no Período
            </h3>
            <div className="flex-grow flex flex-col md:flex-row justify-around gap-4 sm:gap-6 py-4">
                <EquipmentVisitationStat
                    label="Mesas de Sinuca"
                    icon={<BilliardIcon className="w-5 h-5 text-cyan-500" />}
                    visited={visitationStats.mesa.visited}
                    total={visitationStats.mesa.total}
                    colorClass="text-cyan-500"
                    areValuesHidden={areValuesHidden}
                />
                <EquipmentVisitationStat
                    label="Jukeboxes"
                    icon={<JukeboxIcon className="w-5 h-5 text-fuchsia-500" />}
                    visited={visitationStats.jukebox.visited}
                    total={visitationStats.jukebox.total}
                    colorClass="text-fuchsia-500"
                    areValuesHidden={areValuesHidden}
                />
                <EquipmentVisitationStat
                    label="Gruas de Pelúcia"
                    icon={<CraneIcon className="w-5 h-5 text-orange-500" />}
                    visited={visitationStats.grua.visited}
                    total={visitationStats.grua.total}
                    colorClass="text-orange-500"
                    areValuesHidden={areValuesHidden}
                />
            </div>
        </div>
    );
};

const RentalChangesCard: React.FC<{
  customers: Customer[];
  deletedCustomersLog: { customer: Customer, deletedAt: Date }[];
  currentDate: Date;
}> = ({ customers, deletedCustomersLog, currentDate }) => {

    const { newRentals, removedRentals } = useMemo(() => {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

        const newRentals = customers.filter(c => {
            if (!c.createdAt) return false;
            const createdAt = new Date(c.createdAt);
            return createdAt >= startOfMonth && createdAt <= endOfMonth;
        });
        
        const removedRentals = deletedCustomersLog.filter(log => {
            const deletedAt = new Date(log.deletedAt);
            return deletedAt >= startOfMonth && deletedAt <= endOfMonth;
        }).map(log => log.customer);

        return { newRentals, removedRentals };
    }, [customers, deletedCustomersLog, currentDate]);
    
    const getEquipmentSummary = (equipments: Equipment[]) => {
        if (!equipments || equipments.length === 0) return 'Nenhum equipamento';
        const counts = equipments.reduce((acc, eq) => {
            const type = eq.type.charAt(0).toUpperCase() + eq.type.slice(1);
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).map(([type, count]) => `${count}x ${type}`).join(', ');
    };

    const ChangeList: React.FC<{items: Customer[]}> = ({ items }) => (
        <ul className="space-y-2">
            {items.map(customer => (
                <li key={customer.id} className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-slate-800 dark:text-white truncate">{customer.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{getEquipmentSummary(customer.equipment)}</p>
                </li>
            ))}
        </ul>
    );

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 h-full">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <ArrowsRightLeftIcon className="w-6 h-6 text-slate-500" />
                Movimentação de Locações
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                    <h4 className="font-bold text-green-500 dark:text-green-400 mb-2">Novas Locações ({newRentals.length})</h4>
                    <div className="max-h-48 overflow-y-auto pr-2">
                       {newRentals.length > 0 ? <ChangeList items={newRentals} /> : <p className="text-sm text-slate-400 italic">Nenhum cliente novo.</p>}
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-red-500 dark:text-red-400 mb-2">Locações Retiradas ({removedRentals.length})</h4>
                    <div className="max-h-48 overflow-y-auto pr-2">
                       {removedRentals.length > 0 ? <ChangeList items={removedRentals} /> : <p className="text-sm text-slate-400 italic">Nenhum cliente removido.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Main View Component ---

// Add a specific type for the stats object to avoid using 'any'
type MonthlyStats = {
    revenueMesaDinheiro: number;
    revenueMesaPix: number;
    totalRevenueMesa: number;
    expensesMesa: number;
    balanceMesa: number;
    revenueJukeboxDinheiro: number;
    revenueJukeboxPix: number;
    totalRevenueJukebox: number;
    expensesJukebox: number;
    balanceJukebox: number;
    revenueGruaEspecie: number;
    revenueGruaPix: number;
    totalRevenueGrua: number;
    expensesGrua: number;
    expensesGeral: number;
    balanceGrua: number;
    totalOutstandingDebt: number;
    totalDebtReceived: number;
    mesaCount: number;
    jukeboxCount: number;
    gruaCount: number;
    averageProfitMesa: number;
    averageProfitJukebox: number;
    averageProfitGrua: number;
    averageRevenueMesa: number;
    averageRevenueJukebox: number;
    averageRevenueGrua: number;
    totalExpenses: number;
};

const DashboardView: React.FC<DashboardViewProps> = React.memo(({ billings, expenses, customers, debtPayments, warnings, lastBackupDate, onExportData, onNavigateToSettings, areValuesHidden, deletedCustomersLog }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [chartView, setChartView] = useState<ChartView>('total');



    const handleMonthChange = useCallback((month: number) => {
        setCurrentDate(prevDate => new Date(prevDate.getFullYear(), month, 1));
    }, []);

    const handleYearChange = useCallback((year: number) => {
        setCurrentDate(prevDate => new Date(year, prevDate.getMonth(), 1));
    }, []);

    const stats: MonthlyStats = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const monthlyBillings = billings.filter(b => {
            const date = new Date(b.settledAt);
            return date.getFullYear() === year && date.getMonth() === month;
        });
        
        const monthlyExpenses = expenses.filter(e => {
            const date = new Date(e.date);
            return date.getFullYear() === year && date.getMonth() === month;
        });

        const monthlyDebtPayments = debtPayments.filter(p => {
            const date = new Date(p.paidAt);
            return date.getFullYear() === year && date.getMonth() === month;
        });

        const totalDebtReceived = monthlyDebtPayments.reduce((sum, p) => sum + p.amountPaid, 0);

        // Agregação de dívidas por equipamento para unificação no faturamento
        // Filtramos para ignorar pagamentos vinculados a cobranças (!p.billingId), pois estes já estão no valorPago da cobrança
        const debtMesaDinheiro = monthlyDebtPayments.filter(p => p.equipmentType === 'mesa' && !p.billingId).reduce((sum, p) => sum + (p.amountPaidDinheiro || 0), 0);
        const debtMesaPix = monthlyDebtPayments.filter(p => p.equipmentType === 'mesa' && !p.billingId).reduce((sum, p) => sum + (p.amountPaidPix || 0), 0);
        
        const debtJukeboxDinheiro = monthlyDebtPayments.filter(p => p.equipmentType === 'jukebox' && !p.billingId).reduce((sum, p) => sum + (p.amountPaidDinheiro || 0), 0);
        const debtJukeboxPix = monthlyDebtPayments.filter(p => p.equipmentType === 'jukebox' && !p.billingId).reduce((sum, p) => sum + (p.amountPaidPix || 0), 0);
        
        const debtGruaDinheiro = monthlyDebtPayments.filter(p => p.equipmentType === 'grua' && !p.billingId).reduce((sum, p) => sum + (p.amountPaidDinheiro || 0), 0);
        const debtGruaPix = monthlyDebtPayments.filter(p => p.equipmentType === 'grua' && !p.billingId).reduce((sum, p) => sum + (p.amountPaidPix || 0), 0);

        const expensesMesa = monthlyExpenses.filter(e => e.category === 'mesa').reduce((sum, e) => sum + e.amount, 0);
        const expensesJukebox = monthlyExpenses.filter(e => e.category === 'jukebox').reduce((sum, e) => sum + e.amount, 0);
        const expensesGrua = monthlyExpenses.filter(e => e.category === 'grua').reduce((sum, e) => sum + e.amount, 0);
        const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
        const expensesGeral = totalExpenses - (expensesMesa + expensesJukebox + expensesGrua);
        
        // Revenue for Mesas (Direct + Debt Payments)
        const revenueMesaDinheiro = monthlyBillings.filter(b => b.equipmentType === 'mesa').reduce((sum, b) => sum + (b.valorPagoDinheiro || 0), 0) + debtMesaDinheiro;
        const revenueMesaPix = monthlyBillings.filter(b => b.equipmentType === 'mesa').reduce((sum, b) => sum + (b.valorPagoPix || 0), 0) + debtMesaPix;
        const totalRevenueMesa = revenueMesaDinheiro + revenueMesaPix;
        const balanceMesa = totalRevenueMesa - expensesMesa;

        // Revenue for Jukebox (Direct + Debt Payments)
        const revenueJukeboxDinheiro = monthlyBillings.filter(b => b.equipmentType === 'jukebox').reduce((sum, b) => sum + (b.valorPagoDinheiro || 0), 0) + debtJukeboxDinheiro;
        const revenueJukeboxPix = monthlyBillings.filter(b => b.equipmentType === 'jukebox').reduce((sum, b) => sum + (b.valorPagoPix || 0), 0) + debtJukeboxPix;
        const totalRevenueJukebox = revenueJukeboxDinheiro + revenueJukeboxPix;
        const balanceJukebox = totalRevenueJukebox - expensesJukebox;
        
        // Revenue for Gruas (Direct + Debt Payments)
        const revenueGruaEspecie = monthlyBillings.filter(b => b.equipmentType === 'grua').reduce((sum, b) => sum + (b.recebimentoEspecie || 0), 0) + debtGruaDinheiro;
        const revenueGruaPix = monthlyBillings.filter(b => b.equipmentType === 'grua').reduce((sum, b) => sum + (b.recebimentoPix || 0), 0) + debtGruaPix;
        const totalRevenueGrua = revenueGruaEspecie + revenueGruaPix;
        const balanceGrua = totalRevenueGrua - expensesGrua;
        
        const totalOutstandingDebt = customers.reduce((sum, c) => sum + (c.debtAmount || 0), 0);
        
        const allEquipment = customers.flatMap(c => c.equipment);
        const mesaCount = allEquipment.filter(e => e.type === 'mesa').length;
        const jukeboxCount = allEquipment.filter(e => e.type === 'jukebox').length;
        const gruaCount = allEquipment.filter(e => e.type === 'grua').length;
        
        const averageProfitMesa = mesaCount > 0 ? balanceMesa / mesaCount : 0;
        const averageProfitJukebox = jukeboxCount > 0 ? balanceJukebox / jukeboxCount : 0;
        const averageProfitGrua = gruaCount > 0 ? balanceGrua / gruaCount : 0;
        
        const averageRevenueMesa = mesaCount > 0 ? totalRevenueMesa / mesaCount : 0;
        const averageRevenueJukebox = jukeboxCount > 0 ? totalRevenueJukebox / jukeboxCount : 0;
        const averageRevenueGrua = gruaCount > 0 ? totalRevenueGrua / gruaCount : 0;

        return {
            revenueMesaDinheiro,
            revenueMesaPix,
            totalRevenueMesa,
            expensesMesa,
            balanceMesa,
            revenueJukeboxDinheiro,
            revenueJukeboxPix,
            totalRevenueJukebox,
            expensesJukebox,
            balanceJukebox,
            revenueGruaEspecie,
            revenueGruaPix,
            totalRevenueGrua,
            expensesGrua,
            expensesGeral,
            balanceGrua,
            totalOutstandingDebt,
            totalDebtReceived,
            mesaCount,
            jukeboxCount,
            gruaCount,
            averageProfitMesa,
            averageProfitJukebox,
            averageProfitGrua,
            averageRevenueMesa,
            averageRevenueJukebox,
            averageRevenueGrua,
            totalExpenses,
        };
    }, [billings, expenses, customers, debtPayments, currentDate]);
    
    // Automatic backup every 7 days
    useEffect(() => {
        if (customers.length === 0) return; // Wait until data is loaded to avoid exporting empty files
        
        let shouldBackup = false;
        if (!lastBackupDate) {
            shouldBackup = true;
        } else {
            const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
            const lastBackupTime = new Date(lastBackupDate).getTime();
            const now = new Date().getTime();
            if (now - lastBackupTime > sevenDaysInMillis) {
                shouldBackup = true;
            }
        }

        if (shouldBackup) {
            onExportData();
        }
    }, [customers, lastBackupDate, onExportData]);

    return (
        <div className="space-y-6 sm:space-y-8 p-2 sm:p-0 overflow-x-hidden">
            <PageHeader 
                title="INÍCIO"
                subtitle="Visão geral e desempenho do seu negócio."
            />

            <div className="space-y-6 sm:space-y-8">
                <DebtReminders customers={customers} areValuesHidden={areValuesHidden} />
                <WarningsReminders warnings={warnings} />
            </div>
            
            <DateFilter 
                currentDate={currentDate}
                onMonthChange={handleMonthChange}
                onYearChange={handleYearChange}
            />

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 sm:gap-8">
                <div className="lg:col-span-6">
                    <FinancialPerformanceCard stats={stats} chartView={chartView} onChartViewChange={setChartView} areValuesHidden={areValuesHidden} />
                </div>
                
                <div className="lg:col-span-6">
                    <VisitationCard customers={customers} currentDate={currentDate} areValuesHidden={areValuesHidden} />
                </div>
                
                <div className="lg:col-span-6">
                    <RentalChangesCard customers={customers} deletedCustomersLog={deletedCustomersLog} currentDate={currentDate} />
                </div>

                <InfoCard title="Contas a Receber" icon={<CreditCardIcon className="w-6 h-6 text-amber-500" />} className="lg:col-span-3 xl:col-span-3">
                    <InfoRow 
                        label="Total em Dívidas (Negativo)"
                        value={areValuesHidden ? 'R$ •••,••' : `R$ ${stats.totalOutstandingDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                        valueColor="text-amber-600 dark:text-amber-400 text-xl sm:text-2xl"
                        className="flex-col !items-start"
                    />
                </InfoCard>
                <InfoCard title="Despesas no Período" icon={<CalculatorIcon className="w-6 h-6 text-red-500" />} className="lg:col-span-3 xl:col-span-3">
                    <InfoRow
                        label="Mesa de Sinuca"
                        value={areValuesHidden ? 'R$ •••,••' : `R$ ${stats.expensesMesa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        valueColor="text-slate-500 dark:text-slate-400"
                    />
                    <InfoRow
                        label="Jukebox"
                        value={areValuesHidden ? 'R$ •••,••' : `R$ ${stats.expensesJukebox.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        valueColor="text-slate-500 dark:text-slate-400"
                    />
                    <InfoRow
                        label="Grua de Pelúcia"
                        value={areValuesHidden ? 'R$ •••,••' : `R$ ${stats.expensesGrua.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        valueColor="text-slate-500 dark:text-slate-400"
                    />
                    <InfoRow
                        label="Geral"
                        value={areValuesHidden ? 'R$ •••,••' : `R$ ${stats.expensesGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        valueColor="text-slate-500 dark:text-slate-400"
                    />
                     <div className="border-t border-slate-200 dark:border-slate-700 my-3"></div>
                    <InfoRow
                        label="Total"
                        value={areValuesHidden ? 'R$ •••,••' : `R$ ${stats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        valueColor="text-red-600 dark:text-red-400 text-lg sm:text-xl"
                        className="!items-baseline"
                    />
                </InfoCard>



            </div>
        </div>
    );
});

export default DashboardView;
