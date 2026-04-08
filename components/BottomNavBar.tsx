import React from 'react';
import { HomeIcon, UsersIcon, ReceiptIcon, CalculatorIcon } from './icons';
import { View } from '../types';

interface BottomNavBarProps {
  currentView: View;
  setView: (view: View) => void;
}

const navItems = [
    { view: 'DASHBOARD' as View, label: 'Início', icon: HomeIcon },
    { view: 'CLIENTES' as View, label: 'Clientes', icon: UsersIcon },
    { view: 'COBRANCAS' as View, label: 'Cobranças', icon: ReceiptIcon },
    { view: 'DESPESAS' as View, label: 'Despesas', icon: CalculatorIcon },
];

const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentView, setView }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg md:hidden z-20 no-print">
            <div className="flex justify-around items-center h-16 pb-[env(safe-area-inset-bottom)]">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentView === item.view;
                    return (
                        <button
                            key={item.view}
                            onClick={() => setView(item.view)}
                            className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${
                                isActive ? 'text-lime-500 dark:text-lime-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Icon className="w-6 h-6 mb-1" />
                            <span className="text-xs font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNavBar;
