import { Capacitor } from '@capacitor/core';
import { User } from "firebase/auth";
import { View } from '../types';
import { HomeIcon, UsersIcon, ReceiptIcon, CalculatorIcon, ChartBarIcon, MapIcon, CogIcon, BilliardIcon, ArrowsPointingOutIcon, AndroidIcon, DatabaseIcon } from './icons';
import AppLogo from './AppLogo';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onOpenFastBilling: () => void;
  user: User | null;
}

const isAndroid = Capacitor.getPlatform() === 'android';

const navItems = [
    { view: 'DASHBOARD' as View, label: 'Início', icon: HomeIcon },
    { view: 'CLIENTES' as View, label: 'Clientes', icon: UsersIcon },
    { view: 'COBRANCAS' as View, label: 'Cobranças', icon: ReceiptIcon },
    { view: 'DESPESAS' as View, label: 'Despesas', icon: CalculatorIcon },
    { view: 'ROTAS' as View, label: 'Rotas', icon: MapIcon },
    { view: 'RELATORIOS' as View, label: 'Relatórios', icon: ChartBarIcon },
];

const secondaryNavItems = [
    { view: 'CONFIGURACOES' as View, label: 'Configurações', icon: CogIcon },
]

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, setIsOpen, onOpenFastBilling, user }) => {

    const handleViewChange = (view: View) => {
        setView(view);
        setIsOpen(false);
    };
    
    const handleFastBillingClick = () => {
        onOpenFastBilling();
        setIsOpen(false);
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const NavButton: React.FC<{item: {view: View, label: string, icon: React.FC<any>}}> = ({ item }) => {
        const Icon = item.icon;
        const isActive = currentView === item.view;
        return (
             <li key={item.view} className="mb-2">
                <button 
                    onClick={() => handleViewChange(item.view)}
                    className={`w-full flex items-center rounded-md p-3 transition-colors text-sm font-medium ${
                        isActive 
                        ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)] shadow-lg' 
                        : 'text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Icon className="w-5 h-5 mr-4" />
                    <span>{item.label}</span>
                </button>
            </li>
        );
    };


    return (
        <>
            {/* Overlay for mobile - Z-index updated to 30 */}
            <div
                onClick={() => setIsOpen(false)}
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            ></div>

            {/* Sidebar - Z-index updated to 40 */}
            <aside className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 p-4 flex flex-col border-r border-slate-200 dark:border-slate-700 z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 no-print ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between mb-4">
                    <AppLogo />
                    <button 
                        onClick={toggleFullScreen}
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-500/10 focus:outline-none focus:ring-2 focus:ring-slate-500"
                        title="Tela Cheia"
                    >
                        <ArrowsPointingOutIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="mb-6">
                    <button 
                        onClick={handleFastBillingClick}
                        className="w-full flex items-center justify-center rounded-md p-3 transition-all text-sm font-bold text-white shadow-lg bg-pink-600 hover:bg-pink-500 active:scale-95 shadow-pink-500/20"
                    >
                        <BilliardIcon className="w-5 h-5 mr-3" />
                        <span>INICIAR COBRANÇA</span>
                    </button>
                </div>
                <nav className="flex-grow">
                    <ul>
                        {navItems.map(item => <NavButton key={item.view} item={item} />)}
                    </ul>
                </nav>
                <div className="mt-auto">
                     <nav>
                        <ul>
                            {secondaryNavItems.map(item => <NavButton key={item.view} item={item} />)}
                        </ul>
                    </nav>
                    <div className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                         <p className="truncate">{user?.email}</p>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
