import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, onSnapshot, Timestamp, getDocs, deleteDoc, doc, setDoc, addDoc, updateDoc, getDoc, writeBatch } from "firebase/firestore";
import ReactDOMServer from 'react-dom/server';

import QRCode from 'qrcode';
import { auth, db, processFirestoreDoc } from './firebase';

import { Customer, Billing, Expense, DebtPayment, Equipment, Warning, View, Theme, UserProfile, SavedUser, Route } from './types';
import { processPayloadForFirestore } from './utils/firestoreUtils';
import { v4 as uuidv4 } from 'uuid';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { Geolocation } from '@capacitor/geolocation';

import Sidebar from './components/Sidebar';
import DashboardView from './views/DashboardView';
import ClientesView from './views/ClientesView';
import CobrancasView from './views/CobrancasView';
import DespesasView from './views/DespesasView';
import RotasView from './views/RotasView';
import RelatoriosView from './views/RelatoriosView';
import ConfiguracoesView from './views/ConfiguracoesView';
import BottomNavBar from './components/BottomNavBar';
import MobileHeader from './components/MobileHeader';
import InstallPwaBanner from './components/InstallPwaBanner';
import { generateBillingText, generateDebtText } from './utils/receiptGenerator';
import { generateCustomerDataText } from './utils/customerDataGenerator';
import { applyThemeColors, defaultColors } from './utils/theme';
import LoginView from './views/LoginView';
import ReceiptSheet from './components/ReceiptSheet';
import DebtReceiptSheet from './components/DebtReceiptSheet';
import ActionFeedbackOverlay from './components/SuccessAnimationOverlay';
import { optimizeRoute } from './utils/routeOptimizer';
import { playSuccessSound, unlockAudio } from './utils/soundPlayer';
import DebtStatementSheet from './components/DebtStatementSheet';
import { nativePrintPDF } from './utils/nativePrint';

// Modals & Views
import BillingModal from './components/BillingModal';
import EditCustomerModal from './components/EditCustomerModal';
import DebtPaymentModal from './components/DebtPaymentModal';
import ActionModal from './components/ActionModal';
import EquipmentSelectionModal from './components/EquipmentSelectionModal';
import ReceiptActionsModal from './components/ReceiptActionsModal';
import DebtReceiptActionsModal from './components/DebtReceiptActionsModal';
import LabelGenerationModal from './components/LabelGenerationModal';
import EditBillingModal from './components/EditBillingModal';
import FastBillingModal from './components/FastBillingModal';
import LocationActionsModal from './components/LocationActionsModal';
import AddPhoneModal from './components/AddPhoneModal';
import WhatsAppActionsModal from './components/WhatsAppActionsModal';
import FichaActionsModal from './components/FichaActionsModal';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import FinalizePaymentModal from './components/FinalizePaymentModal';
import PrivacyPinModal from './components/PrivacyPinModal';
import PendingPaymentActionModal from './components/PendingPaymentActionModal';
import RouteCreationModal from './components/RouteCreationModal';
import PrintableCustomerSheetView from './components/PrintableCustomerSheetView';
import IndustrialView from './views/IndustrialView';
import DigitalBillingModal from './components/DigitalBillingModal';
import { HerokuNativeDashboard } from './components/HerokuNativeDashboard';
import WarningsManager from './components/WarningsManager';
import LoadingScreen from './components/LoadingScreen';

const viewTitles: Record<View, string> = {
    'DASHBOARD': 'Início',
    'CLIENTES': 'Clientes',
    'COBRANCAS': 'Cobranças',
    'DESPESAS': 'Despesas',
    'ROTAS': 'Rotas',
    'RELATORIOS': 'Relatórios',
    'CONFIGURACOES': 'Configurações',
    'INDUSTRIAL': 'Modo Industrial',
    'MAQUINAS': 'PIX MONTANHA',
};

const generatePrintableHtml = (title: string, content: string): string => {
  return `
      <html><head><title>${title}</title><style>
        body { 
          font-family: 'Courier New', Courier, monospace;
          width: 72mm;
          font-size: 16pt;
          font-weight: 700;
          color: #000;
          margin: 0 auto;
          padding: 3mm;
        }
        .header { text-align: center; margin-bottom: 15px; }
        .header h3, .font-black { 
          margin: 0; 
          font-size: 20pt;
          font-weight: 900; 
        }
        .font-bold { font-weight: 900; }
        .text-lg { font-size: 20pt; }
        .text-xl { font-size: 22pt; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        hr { border-top: 2px dashed #000; margin: 10px 0; border-bottom: 0; }
        .text-center { text-align: center; }
        .mt-1 { margin-top: 0.25rem; } .mt-2 { margin-top: 0.5rem; } .mt-4 { margin-top: 1rem; }
        .my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
        .pt-1 { padding-top: 0.25rem; } .pt-2 { padding-top: 0.5rem; }
        .border-t { border-top: 2px dashed #000; }
        .border-b { border-bottom: 2px dashed #000; }
        .border-dashed { border-style: dashed; } .border-black { border-color: #000; }
        .text-base { font-size: 18pt; line-height: 1.5rem; }
        .text-sm { font-size: 16pt; line-height: 1.25rem; }
        .text-xs { font-size: 12pt; line-height: 1rem; }
        .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem; }
        img { display: block; margin: 8px auto; border: 4px solid black; }

        .receipt-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: baseline;
          gap: 0.5ch;
        }
        .receipt-row .filler {
          border-bottom: 2px dotted #000;
          position: relative;
          bottom: 0.2em;
        }
        .receipt-row .value {
          white-space: nowrap;
        }

        @page { size: auto; margin: 3mm; }
      </style></head><body>${content}</body></html>
  `;
};

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [billings, setBillings] = useState<Billing[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
    const [debtPaymentsState, setDebtPaymentsState] = useState<DebtPayment[]>([]); // Added to track locally if needed, but the effect uses setDebtPayments
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [deletedCustomersLog, setDeletedCustomersLog] = useState<{ customer: Customer, deletedAt: Date }[]>([]);
    
    const [currentView, setCurrentView] = useState<View>(() => (localStorage.getItem('lastActiveView') as View) || 'DASHBOARD');
    
    const [isSharing, setIsSharing] = useState(false);
    const [lastBackupTimestamp, setLastBackupTimestamp] = useState<string | null>(localStorage.getItem('lastBackupTimestamp'));
    const [actionFeedbackState, setActionFeedbackState] = useState<{ isOpen: boolean; variant: 'success' | 'edit' | 'delete' | 'pending'; message: string; onEnd?: () => void }>({ isOpen: false, variant: 'success', message: '' });

    // Privacy Mode State
    const isPrivacyModeEnabled = useMemo(() => !!userProfile?.privacyPinHash, [userProfile]);
    const [isPrivacyUnlocked, setIsPrivacyUnlocked] = useState<boolean>(() => localStorage.getItem('privacyUnlocked') === 'true');
    const areValuesHidden = useMemo(() => isPrivacyModeEnabled && !isPrivacyUnlocked, [isPrivacyModeEnabled, isPrivacyUnlocked]);
    const [privacyPinModalState, setPrivacyPinModalState] = useState<{ isOpen: boolean; mode: 'create' | 'enter'; title: string; onConfirm: (pin: string) => void; error?: string }>({ isOpen: false, mode: 'enter', title: '', onConfirm: () => {} });

    // Sync & Offline State
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline' | 'pending'>('idle');
    const [hasPendingChanges, setHasPendingChanges] = useState(false);

    useEffect(() => {
        const handleOffline = () => {
            setIsOnline(false);
            setSyncStatus('offline');
        };
        const handleOnline = () => {
            setIsOnline(true);
            setSyncStatus('synced');
            setTimeout(() => setSyncStatus('idle'), 3000);
        };
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);
    
    // Theme and PWA states
    const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallBannerVisible, setIsInstallBannerVisible] = useState(true);
    
    // Modal States
    const [billingModalState, setBillingModalState] = useState<{ isOpen: boolean; customer: Customer | null; equipment: Equipment | null; }>({ isOpen: false, customer: null, equipment: null });
    const [editCustomerModalState, setEditCustomerModalState] = useState<{ isOpen: boolean; customer: Customer | null; }>({ isOpen: false, customer: null });
    const [debtPaymentModalState, setDebtPaymentModalState] = useState<{ isOpen: boolean; customer: Customer | null; }>({ isOpen: false, customer: null });
    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; customer: Customer | null; }>({ isOpen: false, customer: null });
    const [equipmentSelectionModalState, setEquipmentSelectionModalState] = useState<{ isOpen: boolean; customer: Customer | null; }>({ isOpen: false, customer: null });
    const [receiptActionsModalState, setReceiptActionsModalState] = useState<{ isOpen: boolean; billing: Billing | null; isProvisional: boolean; }>({ isOpen: false, billing: null, isProvisional: false });
    const [debtReceiptActionsModalState, setDebtReceiptActionsModalState] = useState<{ isOpen: boolean; debtPayment: DebtPayment | null; customer: Customer | null }>({ isOpen: false, debtPayment: null, customer: null });
    const [labelGenerationModalState, setLabelGenerationModalState] = useState<{ isOpen: boolean; }>({ isOpen: false });
    const [editBillingModalState, setEditBillingModalState] = useState<{ isOpen: boolean; billing: Billing | null; }>({ isOpen: false, billing: null });
    const [isFastBillingModalOpen, setIsFastBillingModalOpen] = useState(false);
    const [locationActionsModalState, setLocationActionsModalState] = useState<{ isOpen: boolean; customer: Customer | null; }>({ isOpen: false, customer: null });
    const [saveLocationModalState, setSaveLocationModalState] = useState<{ isOpen: boolean; customer: Customer | null; }>({ isOpen: false, customer: null });
    const [addPhoneModalState, setAddPhoneModalState] = useState<{ isOpen: boolean; customer: Customer | null; }>({ isOpen: false, customer: null });
    const [whatsAppActionsModalState, setWhatsAppActionsModalState] = useState<{ isOpen: boolean; customer: Customer | null; }>({ isOpen: false, customer: null });
    const [fichaActionsModalState, setFichaActionsModalState] = useState<{ isOpen: boolean; customer: Customer | null; }>({ isOpen: false, customer: null });
    const [isDeleteAllDataModalOpen, setIsDeleteAllDataModalOpen] = useState(false);
    const [isGeolocating, setIsGeolocating] = useState(false);
    const [finalizePaymentModalState, setFinalizePaymentModalState] = useState<{ isOpen: boolean; billing: Billing | null; }>({ isOpen: false, billing: null });
    const [forgiveDebtModalState, setForgiveDebtModalState] = useState<{ isOpen: boolean; customer: Customer | null; }>({ isOpen: false, customer: null });
    const [pendingPaymentActionModalState, setPendingPaymentActionModalState] = useState<{ isOpen: boolean; customer: Customer | null; pendingBilling: Billing | null; }>({ isOpen: false, customer: null, pendingBilling: null });
    const [isRouteCreationModalOpen, setIsRouteCreationModalOpen] = useState(false);
    const [printableCustomerSheet, setPrintableCustomerSheet] = useState<Customer | null>(null);

    // Industrial Mode State
    const [isIndustrialMode, setIsIndustrialMode] = useState(() => localStorage.getItem('industrialMode') === 'true');
    useEffect(() => {
        localStorage.setItem('industrialMode', isIndustrialMode.toString());
    }, [isIndustrialMode]);

    // Digital Billing Modal State
    const [digitalBillingModalState, setDigitalBillingModalState] = useState<{ isOpen: boolean; customer: Customer | null }>({ isOpen: false, customer: null });

    // Heroku Dashboard State
    const [herokuDashboardState, setHerokuDashboardState] = useState<{ isOpen: boolean; herokuId: string; machineName: string; customerMpStoreId?: string }>({ isOpen: false, herokuId: '', machineName: '' });

    // Saving state for UI feedback
    const [isSaving, setIsSaving] = useState(false);

    // Back button handling
    const backButtonPressedOnce = useRef(false);
    
    // --- Audio Unlock Effect ---
    useEffect(() => {
        const unlock = () => {
            unlockAudio();
            window.removeEventListener('mousedown', unlock);
            window.removeEventListener('touchstart', unlock);
        };

        window.addEventListener('mousedown', unlock);
        window.addEventListener('touchstart', unlock);

        return () => {
            window.removeEventListener('mousedown', unlock);
            window.removeEventListener('touchstart', unlock);
        };
    }, []);

    // --- Fullscreen Mode on First Interaction (Web Fallback) ---
    useEffect(() => {
        if (Capacitor.isNativePlatform()) return; // Capacitor handles this above

        const requestFullScreen = () => {
            const element = document.documentElement;
            if (element.requestFullscreen && !document.fullscreenElement) {
                element.requestFullscreen().catch(err => {
                    console.warn(`Could not enter full-screen mode automatically: ${err.message}`);
                });
            }
        };
    
        const handleFirstInteraction = () => {
            requestFullScreen();
            window.removeEventListener('click', handleFirstInteraction);
            window.removeEventListener('touchstart', handleFirstInteraction);
        };
    
        window.addEventListener('click', handleFirstInteraction);
        window.addEventListener('touchstart', handleFirstInteraction);
    
        return () => {
            window.removeEventListener('click', handleFirstInteraction);
            window.removeEventListener('touchstart', handleFirstInteraction);
        };
    }, []);

    // --- Handlers ---
    const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        if (type === 'error') {
            alert(`ERRO: ${message}`);
            console.error(`Notification: ${message}`);
        } else {
            console.log(`Notification: ${message}`);
        }
    }, []);
    
    // --- Back button exit confirmation ---
    useEffect(() => {
      const handleBackButton = (event: PopStateEvent) => {
        if (currentView !== 'DASHBOARD') {
          return;
        }

        if (backButtonPressedOnce.current) {
          return;
        }

        event.preventDefault();
        backButtonPressedOnce.current = true;
        showNotification("Pressione 'voltar' novamente para sair.", 'success');

        history.pushState(null, '', location.href);
        setTimeout(() => { backButtonPressedOnce.current = false; }, 2000);
      };
      window.addEventListener('popstate', handleBackButton);
      return () => window.removeEventListener('popstate', handleBackButton);
    }, [currentView, showNotification]);

    useEffect(() => {
        const path = window.location.pathname;
        if (path === '/dashboard-maquinas' || path === '/maquinas') setCurrentView('MAQUINAS');
    }, []);

    useEffect(() => {
        // Fallback: If industrial mode is off but we are stuck on INDUSTRIAL view, return to Dashboard
        const savedIndustrial = localStorage.getItem('industrialMode') === 'true';
        if (!savedIndustrial && currentView === 'INDUSTRIAL') {
            setCurrentView('DASHBOARD');
            localStorage.setItem('lastActiveView', 'DASHBOARD');
        }
    }, [currentView]);

    useEffect(() => {
        // Check for specific views that might need platform-specific handling or just allow them all for refining
        // Removed the isAndroid restriction for INDUSTRIAL and MAQUINAS as requested for web refining
        
        localStorage.setItem('lastActiveView', currentView);
        if (!isIndustrialMode) {
            const path = currentView === 'MAQUINAS' ? '/dashboard-maquinas' : 
                         currentView === 'DASHBOARD' ? '/' : `/${currentView.toLowerCase()}`;
            window.history.replaceState({}, '', path);
        }
    }, [currentView, isIndustrialMode]);

    const handleUpdateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
        if (!user) return;
        const userDocRef = doc(db, "users", user.uid);
        try {
            await updateDoc(userDocRef, updates);
            setUserProfile(prev => prev ? { ...prev, ...updates } : null);
        } catch (error) {
            console.error("Error updating user profile:", error);
            throw error; 
        }
    }, [user]);

    // --- Privacy & Kiosk Mode Handlers ---
    const openPinModal = useCallback((mode: 'create' | 'enter', title: string, onConfirm: (pin: string) => void) => {
        setPrivacyPinModalState({ isOpen: true, mode, title, onConfirm, error: '' });
    }, []);

    const handleSetPin = useCallback(async (pin: string) => {
        const pinHash = btoa(pin);
        try {
            await handleUpdateUserProfile({ privacyPinHash: pinHash });
            setIsPrivacyUnlocked(true);
            localStorage.setItem('privacyUnlocked', 'true');
            setPrivacyPinModalState({ isOpen: false, mode: 'create', title: '', onConfirm: () => {} });
            showNotification('Modo de privacidade ativado! Seu dispositivo atual está desbloqueado.', 'success');
        } catch (error) {
            showNotification('Erro ao salvar o PIN.', 'error');
        }
    }, [handleUpdateUserProfile, showNotification]);

    const handleUnlock = useCallback((pin: string) => {
        const pinHash = btoa(pin);
        if (userProfile?.privacyPinHash && userProfile.privacyPinHash === pinHash) {
            setIsPrivacyUnlocked(true);
            localStorage.setItem('privacyUnlocked', 'true');
            setPrivacyPinModalState({ isOpen: false, mode: 'enter', title: '', onConfirm: () => {} });
            showNotification('Valores visíveis neste dispositivo.', 'success');
        } else {
            setPrivacyPinModalState(prev => ({ ...prev, error: 'PIN incorreto.' }));
        }
    }, [userProfile, showNotification]);

    const handleRemovePin = useCallback(async (pin: string) => {
        if (!userProfile?.privacyPinHash) return;
        const pinHash = btoa(pin);
        if (userProfile.privacyPinHash !== pinHash) {
            setPrivacyPinModalState(prev => ({ ...prev, error: 'PIN incorreto.' }));
            return;
        }
        
        try {
            await handleUpdateUserProfile({ privacyPinHash: "" });
            setIsPrivacyUnlocked(false);
            localStorage.removeItem('privacyUnlocked');
            setPrivacyPinModalState({ isOpen: false, mode: 'enter', title: '', onConfirm: () => {} });
            showNotification('Modo de privacidade desativado globalmente.', 'success');
        } catch (error) {
            showNotification('Erro ao desativar o modo de privacidade.', 'error');
        }
    }, [userProfile, handleUpdateUserProfile, showNotification]);

    const handleToggleLock = useCallback(() => {
        if (isPrivacyUnlocked) {
            setIsPrivacyUnlocked(false);
            localStorage.removeItem('privacyUnlocked');
            showNotification('Valores ocultados neste dispositivo.', 'success');
        } else {
            openPinModal('enter', 'Desbloquear Valores', handleUnlock);
        }
    }, [isPrivacyUnlocked, openPinModal, handleUnlock, showNotification]);

    const handleActivatePrivacyMode = useCallback(() => {
        openPinModal('create', 'Criar PIN de Privacidade', handleSetPin);
    }, [openPinModal, handleSetPin]);

    const handleDeactivatePrivacyMode = useCallback(() => {
        openPinModal('enter', 'Confirmar PIN para Desativar', handleRemovePin);
    }, [openPinModal, handleRemovePin]);

    // --- Offline & Sync Logic ---
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setSyncStatus('synced');
            setTimeout(() => setSyncStatus('idle'), 3000);
        };
        const handleOffline = () => {
            setIsOnline(false);
            setSyncStatus('offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (!isOnline) setSyncStatus('offline');

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [isOnline]);

    // --- Native Network Monitoring ---
    useEffect(() => {
        let handler: any;
        
        const setupNetwork = async () => {
            if (Capacitor.isNativePlatform()) {
                const status = await Network.getStatus();
                setIsOnline(status.connected);
                if (!status.connected) setSyncStatus('offline');

                handler = await Network.addListener('networkStatusChange', status => {
                    setIsOnline(status.connected);
                    if (status.connected) {
                        setSyncStatus('synced');
                        setTimeout(() => setSyncStatus('idle'), 3000);
                    } else {
                        setSyncStatus('offline');
                    }
                });
            }
        };

        setupNetwork();
        return () => {
            if (handler) handler.remove();
        };
    }, []);

    // --- Firebase Auth & Data Sync Effects ---
    const handleLoginSuccess = useCallback((email: string, password?: string, rememberMe?: boolean) => {
      try {
        const usersStr = localStorage.getItem('savedUsers');
        const users: SavedUser[] = usersStr ? JSON.parse(usersStr) : [];
        const userIndex = users.findIndex(u => u.email === email);

        if (rememberMe && password) {
            const newUser: SavedUser = { email, pass: btoa(password) };
            if (userIndex > -1) {
                users[userIndex] = newUser;
            } else {
                users.push(newUser);
            }
        } else {
             const newUser: SavedUser = { email };
             if (userIndex > -1) {
                 users[userIndex] = newUser;
             } else {
                users.push(newUser);
             }
        }
        localStorage.setItem('savedUsers', JSON.stringify(users));
      } catch (error) {
        console.error("Failed to update saved users list:", error);
      }
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            await signOut(auth);
            setUserProfile(null);
            setIsPrivacyUnlocked(false);
            localStorage.removeItem('privacyUnlocked');
        } catch (error) {
            showNotification('Erro ao sair da conta.', 'error');
        }
    }, [showNotification]);

    const handleSwitchAccount = useCallback(async (email: string) => {
        setIsPrivacyUnlocked(false);
        sessionStorage.setItem('switchAccountEmail', email);
        await handleLogout();
    }, [handleLogout]);

    const handleAddNewAccount = useCallback(async () => {
        setIsPrivacyUnlocked(false);
        sessionStorage.removeItem('switchAccountEmail');
        await handleLogout();
    }, [handleLogout]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            if (!user) {
                setUserProfile(null);
                setIsPrivacyUnlocked(false);
                localStorage.removeItem('privacyUnlocked');
            }
            setIsLoadingAuth(false);
        });
        return unsubscribe;
    }, []);
    
    useEffect(() => {
        if (user && !userProfile) { 
            const fetchProfile = async () => {
                try {
                    const profileDoc = await getDoc(doc(db, "users", user.uid));
                    if (profileDoc.exists()) {
                        setUserProfile(processFirestoreDoc(profileDoc) as UserProfile);
                    } else {
                        const defaultProfileData = { email: user.email!, createdAt: Timestamp.now(), privacyPinHash: "", pixKeys: [] };
                        await setDoc(doc(db, "users", user.uid), defaultProfileData);
                        setUserProfile({ id: user.uid, email: user.email!, createdAt: new Date(), privacyPinHash: "", pixKeys: [] });
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    showNotification("Erro ao carregar perfil do usuário.", "error");
                }
            };
            fetchProfile();
        }
    }, [user, userProfile, showNotification]);
    
    // PWA Install Prompt
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallBannerVisible(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);
    
    // Set Theme
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    // Apply custom colors on load
    useEffect(() => {
        try {
            const savedColors = localStorage.getItem('appThemeColors');
            const colors = savedColors ? JSON.parse(savedColors) : defaultColors;
            applyThemeColors(colors);
        } catch(e) {
            console.error("Error applying saved theme:", e);
            applyThemeColors(defaultColors);
        }
    }, []);
    
    // Fetch data from Firestore
    useEffect(() => {
        if (!user) {
            setCustomers([]);
            setBillings([]);
            setExpenses([]);
            setDebtPayments([]);
            setWarnings([]);
            setRoutes([]);
            return;
        }
    
        const collections = ['customers', 'billings', 'expenses', 'debtPayments', 'warnings', 'routes'];
        const setters: Record<string, React.Dispatch<React.SetStateAction<any[]>>> = {
            customers: setCustomers,
            billings: setBillings,
            expenses: setExpenses,
            debtPayments: setDebtPayments,
            warnings: setWarnings,
            routes: setRoutes,
        };
        const pendingWrites = new Set<string>();

        const unsubscribers = collections.map(col => {
            const q = query(collection(db, `users/${user.uid}/${col}`));
            return onSnapshot(q, { includeMetadataChanges: true }, (querySnapshot) => {
                const data = querySnapshot.docs.map(processFirestoreDoc);
                setters[col](data as any);
                
                // Track pending writes globally for the sync indicator
                if (querySnapshot.metadata.hasPendingWrites) {
                    pendingWrites.add(col);
                } else {
                    pendingWrites.delete(col);
                }
                setHasPendingChanges(pendingWrites.size > 0);
            }, (error) => {
                console.error(`Error fetching ${col}:`, error);
                showNotification(`Erro ao buscar dados de ${col}.`, 'error');
            });
        });
    
        return () => unsubscribers.forEach(unsub => unsub());
    }, [user, showNotification]);
    
    const handleAnimationEnd = useCallback(() => {
        if (actionFeedbackState.onEnd) {
            actionFeedbackState.onEnd();
        }
        setActionFeedbackState({ isOpen: false, variant: 'success', message: '', onEnd: undefined });
    }, [actionFeedbackState]);

    // --- Data Handlers (Add, Update, Delete) ---
    
    const handleAddCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'debtAmount' | 'lastVisitedAt'>) => {
        if (!user) return;
        setIsSaving(true);
        const customerWithId: Customer = {
            id: uuidv4(),
            ...customerData,
            createdAt: new Date(),
            debtAmount: 0,
            lastVisitedAt: null,
        };
    
        const originalCustomers = customers;
        setCustomers(prev => [...prev, customerWithId].sort((a,b) => a.name.localeCompare(b.name)));
    
        try {
            let latitude = customerData.latitude ?? 0;
            let longitude = customerData.longitude ?? 0;
            
            if (!latitude && !longitude) {
                try {
                    const position = await Promise.race<any>([
                        Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 3000 }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('GPS Timeout')), 3000))
                    ]);
                    latitude = position.coords.latitude;
                    longitude = position.coords.longitude;
                } catch (e) {
                    console.warn("Could not get GPS coordinates:", e);
                }
            }

            const customerWithCoords = { ...customerWithId, latitude, longitude };
            const { id, ...payload } = customerWithCoords;
            const firestorePayload = processPayloadForFirestore(payload);
            
            setDoc(doc(db, `users/${user.uid}/customers`, id), firestorePayload).catch(e => console.error('bg sync err:', e));
            
            playSuccessSound();
            const msg = isOnline ? 'Cliente Adicionado!' : 'CLIENTE SALVO OFFLINE! 💾';
            setActionFeedbackState({ isOpen: true, variant: 'success', message: msg });
        } catch (error) {
            showNotification('Erro ao adicionar cliente. Alteração desfeita.', 'error');
            setCustomers(originalCustomers);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }, [customers, isOnline, user, showNotification]);

    const handleUpdateCustomerPartial = useCallback(async (updateData: Partial<Customer> & { id: string }) => {
        if (!user) return;
        setIsSaving(true);
        const originalCustomers = customers;
        const { id, ...payload } = updateData;

        const customerToUpdate = originalCustomers.find(c => c.id === id);
        if (!customerToUpdate) {
            showNotification('Cliente não encontrado para atualizar.', 'error');
            setIsSaving(false);
            return;
        }
        const updatedCustomer = { ...customerToUpdate, ...payload };

        setCustomers(prev => prev.map(c => c.id === id ? updatedCustomer : c));

        try {
            const firestorePayload = processPayloadForFirestore(payload);
            updateDoc(doc(db, `users/${user.uid}/customers`, id), firestorePayload).catch(e => console.error('bg sync err:', e));
            
            playSuccessSound();
            const msg = isOnline ? 'Cliente Atualizado!' : 'ATUALIZADO OFFLINE! 💾';
            setActionFeedbackState({ isOpen: true, variant: 'edit', message: msg });
        } catch (error) {
            showNotification('Erro ao atualizar cliente.', 'error');
            setCustomers(originalCustomers);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }, [customers, isOnline, user, showNotification]);

    const handleUpdateCustomer = useCallback(async (customer: Customer) => {
        setEditCustomerModalState({ isOpen: false, customer: null });
        await handleUpdateCustomerPartial(customer);
    }, [handleUpdateCustomerPartial]);
    
    const handleDeleteCustomer = useCallback(async (customerToDelete: Customer) => {
        if (!user) return;
        setIsSaving(true);
        const originalCustomers = customers;
    
        setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
        setDeletedCustomersLog(prev => [...prev, { customer: customerToDelete, deletedAt: new Date() }]);
        setDeleteModalState({ isOpen: false, customer: null });
    
        try {
            deleteDoc(doc(db, `users/${user.uid}/customers`, customerToDelete.id)).catch(e => console.error('bg sync err:', e));
            
            playSuccessSound();
            const msg = isOnline ? 'Cliente Excluído!' : 'EXCLUÍDO OFFLINE! 💾';
            setActionFeedbackState({ isOpen: true, variant: 'delete', message: msg });
        } catch (error) {
            showNotification('Erro ao excluir cliente. Alteração desfeita.', 'error');
            setCustomers(originalCustomers);
            setDeletedCustomersLog(prev => prev.filter(log => log.customer.id !== customerToDelete.id));
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }, [customers, isOnline, user, showNotification]);

    const handleAddBilling = useCallback(async (billing: Billing) => {
        if (!user) return;
        setIsSaving(true);
        const originalCustomers = customers;
        const originalBillings = billings;
    
        const customerToUpdate = originalCustomers.find(c => c.id === billing.customerId);
        if (!customerToUpdate) {
            showNotification('Cliente não encontrado para COBRANÇA.', 'error');
            setIsSaving(false);
            return;
        }
    
        const updatedEquipment = customerToUpdate.equipment.map(e =>
            e.id === billing.equipmentId ? { ...e, relogioAnterior: billing.relogioAtual } : e
        );
        
        const debtToAdd = billing.paymentMethod === 'pending_payment' ? 0 : (billing.valorDebitoNegativo || 0);
        const debtPaid = billing.valorDividaPaga || 0;

        const updatedCustomerData = {
            equipment: updatedEquipment,
            lastVisitedAt: new Date(),
            debtAmount: (customerToUpdate.debtAmount || 0) + debtToAdd - debtPaid
        };
        const updatedCustomer = { ...customerToUpdate, ...updatedCustomerData };
    
        setBillings(prev => [...prev, billing]);
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        setBillingModalState({ isOpen: false, customer: null, equipment: null });
    
        try {
            const { id: billingId, ...billingPayload } = billing;
            const { id: customerId, ...customerPayload } = updatedCustomer;
            
            const firestoreBillingPayload = processPayloadForFirestore(billingPayload);
            const firestoreCustomerPayload = processPayloadForFirestore(customerPayload);

            const batch = writeBatch(db);
            batch.set(doc(db, `users/${user.uid}/billings`, billingId), firestoreBillingPayload);
            batch.update(doc(db, `users/${user.uid}/customers`, customerId), firestoreCustomerPayload);

            if (debtPaid > 0) {
                const debtPaymentId = uuidv4();
                const debtPayment: DebtPayment = {
                    id: debtPaymentId,
                    customerId: billing.customerId,
                    customerName: billing.customerName,
                    amountPaid: debtPaid,
                    paidAt: new Date(),
                    paymentMethod: billing.paymentMethod === 'debito_negativo' ? 'dinheiro' : (billing.paymentMethod as any), // Fallback if necessary
                    equipmentType: billing.equipmentType
                };
                const { id: dId, ...debtPayload } = debtPayment;
                batch.set(doc(db, `users/${user.uid}/debtPayments`, dId), processPayloadForFirestore(debtPayload));
            }

            batch.commit().catch(e => console.error('bg sync err:', e));
            
            if (billing.paymentMethod !== 'pending_payment') {
                playSuccessSound();
                const msg = isOnline ? 'Cobrança Realizada!' : 'COBRANÇA SALVA OFFLINE! 💾';
                setActionFeedbackState({ isOpen: true, variant: 'success', message: msg, onEnd: () => setReceiptActionsModalState({ isOpen: true, billing, isProvisional: false }) });
            } else {
                const msg = isOnline ? 'Pagamento Pendente' : 'PENDENTE SALVO OFFLINE! 💾';
                setActionFeedbackState({ isOpen: true, variant: 'pending', message: msg });
            }
        } catch (error) {
            showNotification('Erro ao salvar COBRANÇA. Alterações desfeitas.', 'error');
            setCustomers(originalCustomers);
            setBillings(originalBillings);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }, [billings, customers, isOnline, user, showNotification]);
    
    const handleUpdateBilling = useCallback(async (billing: Billing) => {
        if (!user) return;
        setIsSaving(true);
        const originalBillings = billings;
        const originalCustomers = customers;

        const oldBilling = originalBillings.find(b => b.id === billing.id);
        if (!oldBilling) {
            showNotification('Cobrança original não encontrada.', 'error');
            setIsSaving(false);
            return;
        }

        const customerToUpdate = customers.find(c => c.id === billing.customerId);
        if (!customerToUpdate) {
            showNotification('Cliente não encontrado.', 'error');
            setIsSaving(false);
            return;
        }

        const oldDebtChange = oldBilling.valorDebitoNegativo || 0;
        const newDebtChange = billing.valorDebitoNegativo || 0;
        const debtDifference = newDebtChange - oldDebtChange;
        
        const nextBillingForEquipment = billings
            .filter(b => b.equipmentId === billing.equipmentId && new Date(b.settledAt) > new Date(billing.settledAt))
            .sort((a,b) => new Date(a.settledAt).getTime() - new Date(b.settledAt).getTime())[0];

        const updatedCustomer = { ...customerToUpdate, debtAmount: customerToUpdate.debtAmount + debtDifference };
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        setBillings(prev => prev.map(b => b.id === billing.id ? billing : b));
        setEditBillingModalState({ isOpen: false, billing: null });

        try {
            const { id: billingId, ...billingPayload } = billing;
            const { id: customerId, ...customerPayload } = updatedCustomer;

            let nextBillingPayload: any = null;
            let nextBillingId: string | undefined;

            if (nextBillingForEquipment) {
                const updatedNextBilling = { ...nextBillingForEquipment, relogioAnterior: billing.relogioAtual };
                setBillings(prev => prev.map(b => b.id === updatedNextBilling.id ? updatedNextBilling : b));
                nextBillingId = updatedNextBilling.id;
                const { id, ...payload } = updatedNextBilling;
                nextBillingPayload = payload;
            }

            const batch = writeBatch(db);
            batch.update(doc(db, `users/${user.uid}/billings`, billingId), processPayloadForFirestore(billingPayload));
            batch.update(doc(db, `users/${user.uid}/customers`, customerId), processPayloadForFirestore(customerPayload));
            if (nextBillingId && nextBillingPayload) batch.update(doc(db, `users/${user.uid}/billings`, nextBillingId), processPayloadForFirestore(nextBillingPayload));
            batch.commit().catch(e => console.error('bg sync err:', e));

            playSuccessSound();
            const msg = isOnline ? 'Cobrança Atualizada!' : 'ATUALIZADO OFFLINE! 💾';
            setActionFeedbackState({ isOpen: true, variant: 'edit', message: msg });
        } catch (error) {
            showNotification('Erro ao atualizar cobrança.', 'error');
            setBillings(originalBillings);
            setCustomers(originalCustomers);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }, [billings, customers, isOnline, user, showNotification]);

    const handleDeleteBilling = useCallback(async (billingId: string) => {
        if (!user) return;
        setIsSaving(true);
        const originalBillings = billings;
        const originalCustomers = customers;
    
        const billingToDelete = originalBillings.find(b => b.id === billingId);
        if (!billingToDelete) return;
        const customerToUpdate = originalCustomers.find(c => c.id === billingToDelete.customerId);
        if (!customerToUpdate) return;
        
        const restoredRelogioAnterior = billingToDelete.relogioAnterior;
        const debtToRemove = billingToDelete.valorDebitoNegativo || 0;
        const debtToRestore = billingToDelete.valorDividaPaga || 0;
        const updatedCustomerPayload = { 
            debtAmount: (customerToUpdate.debtAmount || 0) - debtToRemove + debtToRestore, 
            equipment: customerToUpdate.equipment.map(e => e.id === billingToDelete.equipmentId ? { ...e, relogioAnterior: restoredRelogioAnterior } : e) 
        };
        const updatedCustomer = { ...customerToUpdate, ...updatedCustomerPayload };
    
        setBillings(prev => prev.filter(b => b.id !== billingId));
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, `users/${user.uid}/billings`, billingId));
            batch.update(doc(db, `users/${user.uid}/customers`, updatedCustomer.id), processPayloadForFirestore(updatedCustomerPayload));
            batch.commit().catch(e => console.error('bg sync err:', e));

            playSuccessSound();
            const msg = isOnline ? 'Cobrança Excluída!' : 'EXCLUÍDO OFFLINE! 💾';
            setActionFeedbackState({ isOpen: true, variant: 'delete', message: msg });
        } catch (error) {
            showNotification('Erro ao excluir cobrança. As alterações foram desfeitas.', 'error');
            setBillings(originalBillings);
            setCustomers(originalCustomers);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }, [billings, customers, isOnline, user, showNotification]);

    const handleDeleteDebtPayment = useCallback(async (paymentId: string) => {
        if (!user) return;
        setIsSaving(true);
        const originalDebtPayments = debtPayments;
        const originalCustomers = customers;

        const paymentToDelete = debtPayments.find(p => p.id === paymentId);
        if (!paymentToDelete) {
            setIsSaving(false);
            return;
        }

        const customerToUpdate = customers.find(c => c.id === paymentToDelete.customerId);
        if (!customerToUpdate) {
            setIsSaving(false);
            return;
        }

        const restoredDebtAmount = (customerToUpdate.debtAmount || 0) + paymentToDelete.amountPaid;
        const updatedCustomer = { ...customerToUpdate, debtAmount: restoredDebtAmount };

        setDebtPayments(prev => prev.filter(p => p.id !== paymentId));
        setCustomers(prev => prev.map(c => c.id === customerToUpdate.id ? updatedCustomer : c));

        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, `users/${user.uid}/debtPayments`, paymentId));
            
            const customerUpdatePayload = { debtAmount: restoredDebtAmount };
            batch.update(doc(db, `users/${user.uid}/customers`, customerToUpdate.id), processPayloadForFirestore(customerUpdatePayload));
            
            await batch.commit();

            playSuccessSound();
            const msg = isOnline ? 'Pagamento de Dívida Excluído!' : 'EXCLUÍDO OFFLINE! 💾';
            setActionFeedbackState({ isOpen: true, variant: 'delete', message: msg });
        } catch (error) {
            showNotification('Erro ao excluir pagamento de dívida.', 'error');
            setDebtPayments(originalDebtPayments);
            setCustomers(originalCustomers);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }, [debtPayments, customers, isOnline, user, showNotification]);

    const handleAddExpense = useCallback(async (description: string, amount: number, category: Expense['category']) => {
        if (!user) return;
        setIsSaving(true);
        const newExpense: Expense = {
            id: uuidv4(),
            description,
            amount,
            category,
            date: new Date(),
        };

        const originalExpenses = expenses;
        setExpenses(prev => [...prev, newExpense].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        
        try {
            const { id, ...payload } = newExpense;
            const firestorePayload = processPayloadForFirestore(payload);
            setDoc(doc(db, `users/${user.uid}/expenses`, id), firestorePayload).catch(e => console.error('bg sync err:', e));

            playSuccessSound();
            const msg = isOnline ? 'Despesa Adicionada!' : 'DESPESA SALVA OFFLINE! 💾';
            setActionFeedbackState({ isOpen: true, variant: 'success', message: msg });
        } catch (error) {
            showNotification('Erro ao adicionar despesa.', 'error');
            setExpenses(originalExpenses);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }, [expenses, isOnline, user, showNotification]);

    const handleDeleteExpense = useCallback(async (expenseId: string) => {
        if (!user) return;
        setIsSaving(true);
        const originalExpenses = expenses;
        setExpenses(prev => prev.filter(e => e.id !== expenseId));

        try {
            deleteDoc(doc(db, `users/${user.uid}/expenses`, expenseId)).catch(e => console.error('bg sync err:', e));
            playSuccessSound();
            setActionFeedbackState({ isOpen: true, variant: 'delete', message: 'Despesa Excluída!' });
        } catch (error) {
            showNotification('Erro ao excluir despesa.', 'error');
            setExpenses(originalExpenses);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }, [expenses, isOnline, user, showNotification]);

    const handleAddDebtPayment = useCallback(async (customerId: string, details: { amountPaidDinheiro: number; amountPaidPix: number; equipmentType: 'mesa' | 'jukebox' | 'grua' } | { amountToAdd: number }) => {
        if (!user) return;
        setIsSaving(true);
        const originalCustomers = customers;
        const customerToUpdate = customers.find(c => c.id === customerId);
        if (!customerToUpdate) {
            setIsSaving(false);
            return;
        }

        let updatedCustomer: Customer;
        let debtPayment: DebtPayment | null = null;
        let isPayingDebt = false;

        if ('amountToAdd' in details) { // Adding debt
            const newDebtAmount = (customerToUpdate.debtAmount || 0) + details.amountToAdd;
            updatedCustomer = { ...customerToUpdate, debtAmount: newDebtAmount };
        } else { // Paying debt
            isPayingDebt = true;
            const { amountPaidDinheiro, amountPaidPix, equipmentType } = details;
            const totalPaid = amountPaidDinheiro + amountPaidPix;
            
            const currentDebt = customerToUpdate.debtAmount || 0;
            const newDebtAmount = Math.max(0, currentDebt - totalPaid);
            
            updatedCustomer = { 
                ...customerToUpdate, 
                debtAmount: newDebtAmount,
                lastVisitedAt: new Date() // Mark as visited when paying debt
            };

            const methodsUsed: ('dinheiro' | 'pix')[] = [];
            if (amountPaidDinheiro > 0) methodsUsed.push('dinheiro');
            if (amountPaidPix > 0) methodsUsed.push('pix');

            let paymentMethod: DebtPayment['paymentMethod'] = methodsUsed.length > 1 ? 'misto' : (methodsUsed[0] || 'dinheiro');

            debtPayment = {
                id: uuidv4(), 
                customerId, 
                customerName: customerToUpdate.name, 
                amountPaid: totalPaid, 
                paidAt: new Date(), 
                paymentMethod,
                amountPaidDinheiro: amountPaidDinheiro || 0,
                amountPaidPix: amountPaidPix || 0,
                equipmentType: equipmentType!
            };
        }
        
        // Optimistic UI updates
        setCustomers(prev => prev.map(c => c.id === customerId ? updatedCustomer : c));
        if (debtPayment) setDebtPayments(prev => [...prev, debtPayment!]);
        setDebtPaymentModalState({isOpen: false, customer: null});

        try {
            const batch = writeBatch(db);
            
            // Only update necessary fields for customer
            const customerUpdatePayload = { 
                debtAmount: updatedCustomer.debtAmount,
                lastVisitedAt: updatedCustomer.lastVisitedAt
            };
            
            const firestoreCustomerPayload = processPayloadForFirestore(customerUpdatePayload);
            batch.update(doc(db, `users/${user.uid}/customers`, customerId), firestoreCustomerPayload);
            
            if (debtPayment) {
                const { id: dpId, ...dpPayload } = debtPayment;
                const firestoreDpPayload = processPayloadForFirestore(dpPayload);
                batch.set(doc(db, `users/${user.uid}/debtPayments`, dpId), firestoreDpPayload);
            }
            
            await batch.commit();
            
            playSuccessSound();
            if (isPayingDebt && debtPayment) {
                const msg = isOnline ? 'Pagamento Recebido!' : 'RECEBIDO OFFLINE! 💾';
                setActionFeedbackState({ isOpen: true, variant: 'success', message: msg, onEnd: () => setDebtReceiptActionsModalState({ isOpen: true, debtPayment, customer: updatedCustomer }) });
            } else {
                const msg = isOnline ? 'Dívida Adicionada!' : 'SALVO OFFLINE! 💾';
                setActionFeedbackState({ isOpen: true, variant: 'edit', message: msg });
            }
        } catch (error) {
            showNotification('Erro ao processar dívida.', 'error');
            setCustomers(originalCustomers);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }, [customers, isOnline, user, showNotification]);


    const handleForgiveDebt = useCallback(async (customer: Customer) => {
        if (!user) return;
        setIsSaving(true);
        const originalCustomers = customers;
        const updatedCustomer = { ...customer, debtAmount: 0 };

        setCustomers(prev => prev.map(c => c.id === customer.id ? updatedCustomer : c));
        setForgiveDebtModalState({ isOpen: false, customer: null });
        setDebtPaymentModalState({ isOpen: false, customer: null });

        try {
            const payload = { debtAmount: 0 };
            updateDoc(doc(db, `users/${user.uid}/customers`, customer.id), payload).catch(e => console.error('bg sync err:', e));

            playSuccessSound();
            const msg = isOnline ? 'Dívida Perdoada!' : 'PERDOADA OFFLINE! 💾';
            setActionFeedbackState({ isOpen: true, variant: 'delete', message: msg });
        } catch (error) {
            setCustomers(originalCustomers);
            showNotification('Erro ao perdoar dívida.', 'error');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }, [customers, isOnline, user, showNotification]);


    const handleAddWarning = useCallback(async (customerId: string, message: string) => {
        if (!user) return;
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;

        const newWarning: Warning = { id: uuidv4(), customerId, customerName: customer.name, message, level: 'medium', createdAt: new Date(), isResolved: false };
        const originalWarnings = warnings;
        setWarnings(prev => [newWarning, ...prev]);

        try {
            const { id, ...payload } = newWarning;
            const firestorePayload = processPayloadForFirestore(payload);
            setDoc(doc(db, `users/${user.uid}/warnings`, id), firestorePayload).catch(e => console.error('bg sync err:', e));
            
            playSuccessSound();
            const msg = isOnline ? 'Aviso Adicionado!' : 'AVISO SALVO OFFLINE! 💾';
            setActionFeedbackState({ isOpen: true, variant: 'success', message: msg });
        } catch (error) {
            setWarnings(originalWarnings);
            showNotification("Erro ao adicionar aviso.", "error");
            console.error(error);
        }
    }, [customers, warnings, isOnline, user, showNotification]);

    const handleResolveWarning = useCallback(async (warningId: string) => {
        if (!user) return;
        const originalWarnings = warnings;
        setWarnings(prev => prev.map(w => w.id === warningId ? { ...w, isResolved: true } : w));

        try {
            const payload = { isResolved: true, resolvedAt: new Date() };
            updateDoc(doc(db, `users/${user.uid}/warnings`, warningId), payload).catch(e => console.error('bg sync err:', e));
            
            playSuccessSound();
            const msg = isOnline ? 'Aviso Resolvido!' : 'RESOLVIDO OFFLINE! 💾';
            setActionFeedbackState({ isOpen: true, variant: 'edit', message: msg });
        } catch (error) {
            setWarnings(originalWarnings);
            showNotification("Erro ao resolver aviso.", "error");
            console.error(error);
        }
    }, [warnings, isOnline, user, showNotification]);

    const handleDeleteWarning = useCallback(async (warningId: string) => {
        if (!user) return;
        const originalWarnings = warnings;
        setWarnings(prev => prev.filter(w => w.id !== warningId));
        
        try {
            await deleteDoc(doc(db, `users/${user.uid}/warnings`, warningId));
            
            playSuccessSound();
            const msg = isOnline ? 'Aviso Excluído!' : 'AVISO EXCLUÍDO OFFLINE! 💾';
            setActionFeedbackState({ isOpen: true, variant: 'delete', message: msg });
        } catch (error) {
            setWarnings(originalWarnings);
            showNotification("Erro ao excluir aviso.", "error");
            console.error(error);
        }
    }, [warnings, isOnline, user, showNotification]);

    // --- GPS Tracking (Real-time position sharing to Firestore) ---
    useEffect(() => {
        if (!user || !userProfile) return;
        const nickname = (userProfile as any).nickname || (userProfile as any).displayName;
        if (!nickname) return;

        const deviceDocRef = doc(db, 'shared_active_devices', user.uid);
        const appTrackerOwnerUid = user.uid;
        let watchId: number | null = null;

        const sendPosition = async (lat: number, lng: number) => {
            const storedOwner = localStorage.getItem('appTrackerOwnerUid');
            if (storedOwner && storedOwner !== appTrackerOwnerUid) return;
            try {
                localStorage.setItem('appTrackerOwnerUid', appTrackerOwnerUid);
                await setDoc(deviceDocRef, {
                    uid: user.uid,
                    nickname,
                    lat,
                    lng,
                    updatedAt: Timestamp.now(),
                    isActive: true,
                }, { merge: true });
            } catch (e) {
                console.warn('GPS share error:', e);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => sendPosition(pos.coords.latitude, pos.coords.longitude),
                err => console.warn('GPS initial fix error:', err),
                { enableHighAccuracy: true, timeout: 15000 }
            );
            watchId = navigator.geolocation.watchPosition(
                pos => sendPosition(pos.coords.latitude, pos.coords.longitude),
                err => console.warn('GPS watch error:', err),
                { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 }
            );
        }

        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            setDoc(deviceDocRef, { isActive: false, updatedAt: Timestamp.now() }, { merge: true }).catch(() => {});
            localStorage.removeItem('appTrackerOwnerUid');
        };
    }, [user, userProfile]);

    // --- Digital Billing Modal ---
    const handleOpenDigitalBilling = useCallback((customer: Customer) => {
        setDigitalBillingModalState({ isOpen: true, customer });
    }, []);

    // --- Heroku Dashboard ---
    const handleOpenEsp32Dashboard = useCallback((herokuId: string, machineName: string, customerMpStoreId?: string) => {
        setHerokuDashboardState({ isOpen: true, herokuId, machineName, customerMpStoreId });
    }, []);

    // --- Industrial Mode Toggle ---
    const handleToggleIndustrialMode = useCallback((enabled: boolean) => {
        setIsIndustrialMode(enabled);
        localStorage.setItem('industrialMode', enabled ? 'true' : 'false');
        if (enabled) {
            setView('INDUSTRIAL');
        } else {
            setView('DASHBOARD');
        }
    }, []);

    const handleFinalizePendingPayment = useCallback(async (updatedBilling: Billing) => {
        if (!user) return;
        setIsSaving(true);
        const originalBillings = billings;
        const originalCustomers = customers;

        const customerToUpdate = customers.find(c => c.id === updatedBilling.customerId);
        if (!customerToUpdate) return;

        const debtToAdd = updatedBilling.valorDebitoNegativo || 0;
        const debtPaid = updatedBilling.valorDividaPaga || 0;
        
        const updatedCustomerEquipment = customerToUpdate.equipment.map(eq => {
            if (eq.id === updatedBilling.equipmentId) {
                if (updatedBilling.equipmentType === 'jukebox' && updatedBilling.relogioAtual !== undefined) {
                     return { ...eq, relogioAnterior: updatedBilling.relogioAtual };
                }
            }
            return eq;
        });

        const updatedCustomer = { 
            ...customerToUpdate, 
            debtAmount: (customerToUpdate.debtAmount || 0) + debtToAdd - debtPaid,
            equipment: updatedCustomerEquipment 
        };

        setBillings(prev => prev.map(b => b.id === updatedBilling.id ? updatedBilling : b));
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        setFinalizePaymentModalState({ isOpen: false, billing: null });

        try {
            const { id: billingId, ...billingPayload } = updatedBilling;
            const { id: customerId, ...customerPayload } = updatedCustomer;
            
            const firestoreBillingPayload = processPayloadForFirestore(billingPayload);
            const firestoreCustomerPayload = processPayloadForFirestore(customerPayload);

            const batch = writeBatch(db);
            batch.update(doc(db, `users/${user.uid}/billings`, billingId), firestoreBillingPayload);
            batch.update(doc(db, `users/${user.uid}/customers`, customerId), firestoreCustomerPayload);

            if (debtPaid > 0) {
                const debtPaymentId = uuidv4();
                const debtPayment: DebtPayment = {
                    id: debtPaymentId,
                    customerId: updatedBilling.customerId,
                    customerName: updatedBilling.customerName,
                    amountPaid: debtPaid,
                    paidAt: new Date(),
                    paymentMethod: updatedBilling.paymentMethod === 'debito_negativo' ? 'dinheiro' : (updatedBilling.paymentMethod as any),
                    equipmentType: updatedBilling.equipmentType
                };
                const { id: dId, ...debtPayload } = debtPayment;
                batch.set(doc(db, `users/${user.uid}/debtPayments`, dId), processPayloadForFirestore(debtPayload));
            }

            await batch.commit();
            
            playSuccessSound();
            const msg = isOnline ? 'Pagamento Finalizado!' : 'FINALIZADO OFFLINE! 💾';
            setActionFeedbackState({ isOpen: true, variant: 'success', message: msg, onEnd: () => setReceiptActionsModalState({ isOpen: true, billing: updatedBilling, isProvisional: false }) });
        } catch (error) {
            showNotification('Erro ao finalizar pagamento.', 'error');
            setBillings(originalBillings);
            setCustomers(originalCustomers);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }, [billings, customers, isOnline, user, showNotification]);
    
    const handleTriggerProvisionalReceiptAction = useCallback((billing: Billing, onComplete: () => void) => {
        setReceiptActionsModalState({ isOpen: true, billing, isProvisional: true });
        onComplete();
    }, []);

    const handleSaveRoute = useCallback(async (name: string, customerIds: string[]) => {
        if (!user) return;
        if (!name.trim()) {
            showNotification("O nome da rota é obrigatório.", "error");
            return;
        }
        if (customerIds.length === 0) {
            showNotification("Selecione pelo menos um cliente para a rota.", "error");
            return;
        }
        
        setIsSaving(true);
        setIsRouteCreationModalOpen(false);
    
        try {
            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 15000
            });
            
            const { latitude, longitude } = position.coords;
            
            const customersToVisit = customers.filter(c => 
                customerIds.includes(c.id) && c.latitude != null && c.longitude != null
            ) as (Customer & { latitude: number; longitude: number; })[];
            
            const orderedCustomers = optimizeRoute(latitude, longitude, customersToVisit);
            const orderedCustomerIds = orderedCustomers.map(c => c.id);
            
            const newRoute: Route = {
                id: uuidv4(),
                name,
                customerIds: orderedCustomerIds,
                createdAt: new Date(),
            };
    
            const { id, ...payload } = newRoute;
            const firestorePayload = processPayloadForFirestore(payload);
            
            await setDoc(doc(db, `users/${user.uid}/routes`, id), firestorePayload);
            
            playSuccessSound();
            const msg = isOnline ? 'Rota Salva!' : 'ROTA SALVA OFFLINE! 💾';
            setActionFeedbackState({ isOpen: true, variant: 'success', message: msg });
    
        } catch (error: any) {
            console.error("Error creating route:", error);
            let message = 'Erro ao criar a rota.';
            if (error.code === 1 || error.message?.toLowerCase().includes("denied")) {
                message = 'Permissão de localização negada. Verifique as configurações do GPS.';
            } else if (error.message?.toLowerCase().includes("timeout")) {
                message = "Tempo esgotado ao buscar localização.";
            }
            showNotification(message, "error");
        } finally {
            setIsSaving(false);
        }
    }, [user, customers, isOnline, showNotification]);

    const handleDeleteRoute = useCallback(async (routeId: string) => {
        if (!user) return;
        
        const originalRoutes = routes;
        setRoutes(prev => prev.filter(r => r.id !== routeId));
        
        try {
            await deleteDoc(doc(db, `users/${user.uid}/routes`, routeId));
            
            playSuccessSound();
            const msg = isOnline ? 'Rota Excluída!' : 'EXCLUÍDA OFFLINE! 💾';
            setActionFeedbackState({ isOpen: true, variant: 'delete', message: msg });
        } catch (error) {
            console.error("Error deleting route:", error);
            showNotification("Erro ao excluir a rota.", "error");
            setRoutes(originalRoutes);
        }
    }, [user, routes, isOnline, showNotification]);

    // --- Modal Triggers ---
    const handleOpenBillingModal = useCallback((customer: Customer, equipment?: Equipment) => {
      if (equipment) {
        setBillingModalState({ isOpen: true, customer, equipment });
      } else if (customer.equipment?.length === 1) {
        setBillingModalState({ isOpen: true, customer, equipment: customer.equipment[0] });
      } else {
        setEquipmentSelectionModalState({ isOpen: true, customer });
      }
    }, []);

    const handleSelectEquipmentForBilling = useCallback((equipment: Equipment) => {
        setBillingModalState({ isOpen: true, customer: equipmentSelectionModalState.customer, equipment });
        setEquipmentSelectionModalState({ isOpen: false, customer: null });
    }, [equipmentSelectionModalState.customer]);
    
    const handleOpenEditBillingModal = useCallback((billing: Billing) => {
        setEditBillingModalState({ isOpen: true, billing });
    }, []);
    
    const handleOpenEditCustomerModal = useCallback((customer: Customer) => {
        setEditCustomerModalState({ isOpen: true, customer });
    }, []);
    
    const handleOpenDeleteModal = useCallback((customer: Customer) => {
        setDeleteModalState({ isOpen: true, customer });
    }, []);

    const handleOpenDebtPaymentModal = useCallback((customer: Customer) => {
        setDebtPaymentModalState({ isOpen: true, customer });
    }, []);
    
    const handleOpenLocationActions = useCallback((customer: Customer) => {
        if (customer.latitude && customer.longitude) {
            setLocationActionsModalState({ isOpen: true, customer });
        } else {
            setSaveLocationModalState({ isOpen: true, customer });
        }
    }, []);

    const handleOpenFichaActionsModal = useCallback((customer: Customer) => {
        setFichaActionsModalState({ isOpen: true, customer });
    }, []);

    const handleConfirmFastBilling = useCallback((equipmentNumber: string) => {
      const lowerCaseNumber = equipmentNumber.toLowerCase();
      let foundCustomer: Customer | null = null;
      let foundEquipment: Equipment | null = null;

      for (const customer of customers) {
          const equipment = customer.equipment.find(e => e.numero.toLowerCase() === lowerCaseNumber);
          if (equipment) {
              foundCustomer = customer;
              foundEquipment = equipment;
              break;
          }
      }

      setIsFastBillingModalOpen(false);

      if (foundCustomer && foundEquipment) {
          handleOpenBillingModal(foundCustomer, foundEquipment);
      } else {
          showNotification(`Equipamento com o número "${equipmentNumber}" não foi encontrado.`, 'error');
      }
    }, [customers, showNotification, handleOpenBillingModal]);

    const handleSaveLocation = useCallback(async (customer: Customer) => {
        if (!navigator.geolocation) {
            showNotification("Geolocalização não é suportada neste navegador.", "error");
            return;
        }
        setIsGeolocating(true);
        setSaveLocationModalState({ isOpen: false, customer: null });
        try {
            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000
            });
            const { latitude, longitude } = position.coords;
            handleUpdateCustomerPartial({ id: customer.id, latitude, longitude });
            showNotification("Localização salva com sucesso!", "success");
        } catch (error: any) {
            let message = "Erro ao obter localização.";
            if (error.code === 1 || error.message?.toLowerCase().includes("denied")) {
                message = "Permissão de localização negada pelo sistema.";
            } else if (error.message?.toLowerCase().includes("timeout")) {
                message = "Tempo esgotado ao buscar localização.";
            }
            showNotification(message, "error");
        } finally {
            setIsGeolocating(false);
        }
    }, [handleUpdateCustomerPartial, showNotification]);
    
    const handleWhatsAppActions = useCallback((customer: Customer) => {
        if (customer.telefone) {
            setWhatsAppActionsModalState({ isOpen: true, customer });
        } else {
            setAddPhoneModalState({ isOpen: true, customer });
        }
    }, []);

    const handleAddPhone = useCallback(async (phone: string) => {
        const customer = addPhoneModalState.customer;
        if (!customer) return;
        await handleUpdateCustomerPartial({ id: customer.id, telefone: phone });
        setAddPhoneModalState({ isOpen: false, customer: null });
    }, [addPhoneModalState.customer, handleUpdateCustomerPartial]);

    const handleInstallPrompt = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                setDeferredPrompt(null);
                setIsInstallBannerVisible(false);
            });
        }
    };
    
    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    const handleExportData = useCallback(() => {
        const dataToExport = {
            customers,
            billings,
            expenses,
            debtPayments,
            warnings,
            routes,
            userProfile
        };
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        a.href = url;
        a.download = `backup-montanha-gestao-${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
        const backupTimestamp = new Date().toISOString();
        localStorage.setItem('lastBackupTimestamp', backupTimestamp);
        setLastBackupTimestamp(backupTimestamp);
        showNotification('Backup exportado com sucesso!', 'success');
    }, [customers, billings, expenses, debtPayments, warnings, routes, userProfile, showNotification]);


    const handleMergeData = useCallback(async (file: File) => {
        if (!user) {
            showNotification("Você precisa estar logado para importar dados.", "error");
            return;
        }
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                
                if (!data.customers || !Array.isArray(data.customers)) {
                    throw new Error("Arquivo de backup inválido. A coleção 'customers' é obrigatória.");
                }

                setIsSaving(true);
                const batch = writeBatch(db);
                const collections = ['customers', 'billings', 'expenses', 'debtPayments', 'warnings', 'routes'];

                for (const colName of collections) {
                    if(data[colName] && Array.isArray(data[colName])) {
                        for (const item of data[colName]) {
                            const { id, ...payload } = item;
                            if (!id || typeof id !== 'string') {
                                console.warn(`Item in ${colName} is missing a valid ID, skipping.`, item);
                                continue;
                            }
                            const firestorePayload = processPayloadForFirestore(payload);
                            const docRef = doc(db, `users/${user.uid}/${colName}`, id);
                            batch.set(docRef, firestorePayload, { merge: true });
                        }
                    }
                }
                
                if (data.userProfile?.pixKeys) {
                    const userDocRef = doc(db, "users", user.uid);
                    batch.update(userDocRef, { pixKeys: data.userProfile.pixKeys });
                }

                await batch.commit();

                showNotification('Dados mesclados com sucesso! A página será recarregada.', 'success');
                setTimeout(() => window.location.reload(), 2000);
            } catch (error) {
                console.error("Erro ao mesclar dados: ", error);
                let errorMessage = 'Ocorreu um erro ao mesclar os dados.';
                if (error instanceof Error) {
                    errorMessage = error.message.includes("permissions") ? "Erro de permissão ao importar." : "O arquivo de backup parece ser inválido.";
                }
                showNotification(errorMessage, 'error');
            } finally {
                setIsSaving(false);
            }
        };
        reader.readAsText(file);
    }, [user, showNotification]);

    const handleDeleteAllData = useCallback(async () => {
        if (!user) {
            showNotification("Você precisa estar logado.", "error");
            return;
        }
        setIsSaving(true);
        setIsDeleteAllDataModalOpen(false);
        try {
            const batch = writeBatch(db);
            const collections = ['customers', 'billings', 'expenses', 'debtPayments', 'warnings', 'routes'];
    
            for (const col of collections) {
                const snapshot = await getDocs(collection(db, `users/${user.uid}/${col}`));
                snapshot.forEach(d => {
                    batch.delete(d.ref);
                });
            }
            
            const userDocRef = doc(db, "users", user.uid);
            batch.update(userDocRef, { pixKeys: [] });
    
            await batch.commit();
            playSuccessSound();
            setActionFeedbackState({ isOpen: true, variant: 'delete', message: 'Todos os Dados Apagados' });
        } catch (error) {
            console.error("Erro ao apagar dados:", error);
            showNotification("Falha ao apagar os dados.", "error");
        } finally {
            setIsSaving(false);
        }
    }, [user, showNotification]);

    const shareText = useCallback(async (text: string, title: string) => {
        setIsSharing(true);
        try {
            if (navigator.share) {
                await navigator.share({ title, text });
            } else {
                await navigator.clipboard.writeText(text);
                showNotification('Copiado para a área de transferência!', 'success');
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                showNotification('Erro ao compartilhar.', 'error');
            }
        } finally {
            setIsSharing(false);
        }
    }, [showNotification]);

    const handleShareReceipt = useCallback(async (receiptData: Billing | DebtPayment) => {
        const isBilling = 'settledAt' in receiptData;
        const text = isBilling
            ? generateBillingText(receiptData as Billing, false)
            : generateDebtText(receiptData as DebtPayment);
            
        const customerName = 'customerName' in receiptData ? receiptData.customerName : 'Cliente';
        const title = isBilling ? `Comprovante - ${customerName}` : `Pagamento - ${customerName}`;
        await shareText(text, title);
    }, [shareText]);

    const handleShareCustomerData = useCallback(async (customer: Customer) => {
        const text = generateCustomerDataText(customer);
        const title = `Dados de ${customer.name}`;
        await shareText(text, title);
    }, [shareText]);

    const handleViewCustomerSheet = useCallback((customer: Customer) => {
        setFichaActionsModalState({ isOpen: false, customer: null });
        setPrintableCustomerSheet(customer);
    }, []);

    const handlePrintPdfReceipt = useCallback(async (receiptData: Billing | DebtPayment | { type: 'debt-statement', customer: Customer }) => {
        try {
            const defaultPixKey = userProfile?.pixKeys?.find(k => k.isDefault);
            const pixPayload = defaultPixKey?.key || "";
            const pixKeyName = defaultPixKey?.name;

            if (!pixPayload) {
                showNotification('Nenhuma chave PIX padrão configurada. Vá para Configurações para adicionar uma.', 'error');
                return;
            }
            
            let title: string;
            let SheetComponent: JSX.Element;
    
            const qrCodeDataUrl = await QRCode.toDataURL(pixPayload, {
                width: 150,
                margin: 1,
                errorCorrectionLevel: 'M',
                color: { dark: '#000000', light: '#FFFFFF' }
            });

        if ('type' in receiptData && receiptData.type === 'debt-statement') {
            title = `Demonstrativo - ${(receiptData as any).customer.name}`;
            SheetComponent = <DebtStatementSheet customer={(receiptData as any).customer} qrCodeDataUrl={qrCodeDataUrl} pixKeyName={pixKeyName} />
        } else if ('settledAt' in receiptData) {
            const billing = receiptData as Billing;
            title = `Comprovante - ${billing.customerName}`;
            SheetComponent = <ReceiptSheet billing={billing} qrCodeDataUrl={qrCodeDataUrl} pixKeyName={pixKeyName} />;
        } else {
            const debtPayment = receiptData as DebtPayment;
            title = `Recibo de Dívida - ${debtPayment.customerName}`;
            SheetComponent = <DebtReceiptSheet debtPayment={debtPayment} qrCodeDataUrl={qrCodeDataUrl} pixKeyName={pixKeyName} />;
        }
            
            const content = ReactDOMServer.renderToString(SheetComponent);
            const printableHtml = generatePrintableHtml(title, content);
            
            // Bridge: Use Native Print on Android, window.open on Web
            try {
                await nativePrintPDF(printableHtml, title);
            } catch (err) {
                console.error("Print error:", err);
                showNotification(err instanceof Error ? err.message : "Erro ao imprimir.", "error");
            }
        } catch (error) {
            console.error("Error generating PDF receipt:", error);
            showNotification('Falha ao gerar PDF para impressão.', 'error');
        }
    }, [userProfile, showNotification]);

    const setView = useCallback((view: View) => {
        setCurrentView(view);
        localStorage.setItem('lastActiveView', view);
    }, []);
    
    const equipmentForFinalization = useMemo(() => {
        const billing = finalizePaymentModalState.billing;
        if (!billing) return null;
        const customer = customers.find(c => c.id === billing.customerId);
        if (!customer) return null;
        return customer.equipment.find(e => e.id === billing.equipmentId) || null;
    }, [finalizePaymentModalState.billing, customers]);

    if (isLoadingAuth) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <LoginView showNotification={showNotification} onLoginSuccess={handleLoginSuccess} />;
    }

    const renderActiveView = () => {
        if (isIndustrialMode) {
            return <IndustrialView 
                        customers={customers} 
                        billings={billings} 
                        debtPayments={debtPayments}
                        warnings={warnings} 
                        onStartBilling={handleOpenBillingModal} 
                        onFinalizeBilling={(billing) => setFinalizePaymentModalState({ isOpen: true, billing })} 
                        onViewBilling={(item) => {
                            if ('relogioAnterior' in item) {
                                setReceiptActionsModalState({ isOpen: true, billing: item as Billing, isProvisional: false });
                            } else {
                                setDebtReceiptActionsModalState({ isOpen: true, debtPayment: item as DebtPayment, customer: customers.find(c => c.id === item.customerId) || null });
                            }
                        }} 
                        onDeleteBilling={(item) => {
                            if ('relogioAnterior' in item) {
                                handleDeleteBilling(item.id);
                            } else {
                                handleDeleteDebtPayment(item.id);
                            }
                        }} 
                        onPayDebtCustomer={handleOpenDebtPaymentModal} 
                        onOpenDigitalBilling={handleOpenDigitalBilling} 
                        onOpenEsp32Dashboard={(id, name, storeId) => setHerokuDashboardState({ isOpen: true, herokuId: id, machineName: name, customerMpStoreId: storeId })} 
                        onResolveWarning={handleResolveWarning} 
                        onPrintDebtStatement={(customer) => handlePrintPdfReceipt({ type: 'debt-statement', customer })} 
                    />;
        }

        switch (currentView) {
            case 'DASHBOARD': return <DashboardView billings={billings} expenses={expenses} customers={customers} debtPayments={debtPayments} warnings={warnings} onAddWarning={handleAddWarning} onResolveWarning={handleResolveWarning} onDeleteWarning={handleDeleteWarning} lastBackupDate={lastBackupTimestamp} onExportData={handleExportData} onNavigateToSettings={() => setView('CONFIGURACOES')} areValuesHidden={areValuesHidden} deletedCustomersLog={deletedCustomersLog} mercadoPagoToken={userProfile?.mercadoPagoToken} onOpenEsp32Dashboard={handleOpenEsp32Dashboard} />;
            case 'CLIENTES': return <ClientesView customers={customers} warnings={warnings} billings={billings} routes={routes} onAddCustomer={handleAddCustomer} onUpdateCustomer={handleUpdateCustomerPartial} isSaving={isSaving} showNotification={showNotification} onFichaActions={handleOpenFichaActionsModal} onBillCustomer={handleOpenBillingModal} onEditCustomer={handleOpenEditCustomerModal} onDeleteCustomer={handleOpenDeleteModal} onPayDebtCustomer={handleOpenDebtPaymentModal} onOpenFastBilling={() => setIsFastBillingModalOpen(true)} onLocationActions={handleOpenLocationActions} onWhatsAppActions={handleWhatsAppActions} onFinalizePendingPayment={(billing) => setFinalizePaymentModalState({ isOpen: true, billing })} areValuesHidden={areValuesHidden} onPendingPaymentAction={(customer, billing) => setPendingPaymentActionModalState({ isOpen: true, customer, pendingBilling: billing })} onOpenRouteCreator={() => setIsRouteCreationModalOpen(true)} onSaveRoute={handleSaveRoute} onDeleteRoute={handleDeleteRoute} onOpenDigitalBilling={handleOpenDigitalBilling} onOpenEsp32Dashboard={handleOpenEsp32Dashboard} />;
            case 'COBRANCAS': return <CobrancasView 
                billings={billings} 
                customers={customers} 
                debtPayments={debtPayments} 
                onShowActions={(billing) => setReceiptActionsModalState({ isOpen: true, billing, isProvisional: false })} 
                onEditBilling={handleOpenEditBillingModal} 
                onDeleteBilling={(item: any) => {
                    if ('relogioAnterior' in item) {
                        handleDeleteBilling(item.id);
                    } else {
                        handleDeleteDebtPayment(item.id);
                    }
                }} 
                onFinalizePayment={(billing) => setFinalizePaymentModalState({ isOpen: true, billing })} 
                onPayDebtCustomer={handleOpenDebtPaymentModal} 
                onPrintDebtStatement={(customer) => handlePrintPdfReceipt({ type: 'debt-statement', customer })} 
                areValuesHidden={areValuesHidden} 
            />;
            case 'DESPESAS': return <DespesasView expenses={expenses} onAddExpense={handleAddExpense} onDeleteExpense={handleDeleteExpense} areValuesHidden={areValuesHidden} />;
            case 'ROTAS': return <RotasView customers={customers} warnings={warnings} />;
            case 'RELATORIOS': return <RelatoriosView customers={customers} billings={billings} expenses={expenses} debtPayments={debtPayments} areValuesHidden={areValuesHidden} showNotification={showNotification} />;
            case 'CONFIGURACOES': return <ConfiguracoesView userProfile={userProfile} onUpdateUserProfile={handleUpdateUserProfile} onExportData={handleExportData} onMergeData={handleMergeData} theme={theme} setTheme={setTheme} showNotification={showNotification} deferredPrompt={deferredPrompt} onInstallPrompt={handleInstallPrompt} onDeleteAllData={() => setIsDeleteAllDataModalOpen(true)} onLogout={handleLogout} onSwitchAccount={handleSwitchAccount} onAddNewAccount={handleAddNewAccount} isPrivacyModeEnabled={isPrivacyModeEnabled} onActivatePrivacyMode={handleActivatePrivacyMode} onDeactivatePrivacyMode={handleDeactivatePrivacyMode} isIndustrialMode={isIndustrialMode} onToggleIndustrialMode={handleToggleIndustrialMode} />;
            case 'MAQUINAS': return (
                <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
                    <HerokuNativeDashboard 
                        isOpen={true} 
                        onClose={() => setCurrentView('DASHBOARD')} 
                        herokuId={""} 
                        machineName={"PAINEL GERAL PIX MONTANHA"} 
                        customerMpStoreId={userProfile?.mercadoPagoStoreId || ""}
                        mercadoPagoToken={userProfile?.mercadoPagoToken}
                    />
                </div>
            );
            default: return <DashboardView billings={billings} expenses={expenses} customers={customers} debtPayments={debtPayments} warnings={warnings} onAddWarning={handleAddWarning} onResolveWarning={handleResolveWarning} onDeleteWarning={handleDeleteWarning} lastBackupDate={lastBackupTimestamp} onExportData={handleExportData} onNavigateToSettings={() => setView('CONFIGURACOES')} areValuesHidden={areValuesHidden} deletedCustomersLog={deletedCustomersLog} mercadoPagoToken={userProfile?.mercadoPagoToken} onOpenEsp32Dashboard={handleOpenEsp32Dashboard} />;
        }
    };

    return (
        <div className={`flex h-full w-full overflow-hidden ${isIndustrialMode ? 'bg-black' : ''}`}>
            {!isIndustrialMode && <Sidebar user={user} currentView={currentView} setView={setView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} onOpenFastBilling={() => setIsFastBillingModalOpen(true)} />}
            <div className="flex-1 flex flex-col h-full min-w-0">
                 {!isIndustrialMode && (
                    <MobileHeader 
                        title={viewTitles[currentView]} 
                        onMenuClick={() => setIsSidebarOpen(true)} 
                        deferredPrompt={deferredPrompt} 
                        onInstallPrompt={handleInstallPrompt} 
                        isPrivacyModeEnabled={isPrivacyModeEnabled} 
                        isPrivacyUnlocked={isPrivacyUnlocked} 
                        onToggleLock={handleToggleLock}
                    />
                 )}
                <main className={`flex-1 overflow-y-auto overflow-x-hidden ${isIndustrialMode ? 'p-0' : 'p-4 md:p-8 bg-slate-100 dark:bg-slate-900 pb-24 md:pb-8 pt-24 md:pt-8 w-full'}`}>
                    {renderActiveView()}
                </main>
            </div>
            
            {!isIndustrialMode && <BottomNavBar currentView={currentView} setView={setView} />}
            {isInstallBannerVisible && deferredPrompt && <InstallPwaBanner onInstall={handleInstallPrompt} onDismiss={() => setIsInstallBannerVisible(false)} />}
            
            <SyncStatusIndicator status={syncStatus} hasPendingChanges={hasPendingChanges} />


            {/* All Modals & Overlays */}
            {billingModalState.isOpen && billingModalState.customer && billingModalState.equipment && <BillingModal isOpen={billingModalState.isOpen} onClose={() => setBillingModalState({ isOpen: false, customer: null, equipment: null })} onConfirm={handleAddBilling} customer={billingModalState.customer} equipment={billingModalState.equipment} onTriggerProvisionalReceiptAction={handleTriggerProvisionalReceiptAction} />}
            {editCustomerModalState.isOpen && editCustomerModalState.customer && <EditCustomerModal isOpen={editCustomerModalState.isOpen} onClose={() => setEditCustomerModalState({ isOpen: false, customer: null })} onConfirm={handleUpdateCustomer} customer={editCustomerModalState.customer} customers={customers} isSaving={isSaving} showNotification={showNotification} areValuesHidden={areValuesHidden} />}
            {debtPaymentModalState.isOpen && debtPaymentModalState.customer && (
                <DebtPaymentModal 
                    isOpen={debtPaymentModalState.isOpen} 
                    onClose={() => setDebtPaymentModalState({ isOpen: false, customer: null })} 
                    onConfirm={(details) => handleAddDebtPayment(debtPaymentModalState.customer!.id, details)} 
                    onForgiveDebt={(customer) => setForgiveDebtModalState({ isOpen: true, customer })} 
                    customer={debtPaymentModalState.customer} 
                    onPrintStatement={(customer) => handlePrintPdfReceipt({ type: 'debt-statement', customer })}
                />
            )}
            {deleteModalState.isOpen && deleteModalState.customer && <ActionModal isOpen={deleteModalState.isOpen} onClose={() => setDeleteModalState({ isOpen: false, customer: null })} onConfirm={() => handleDeleteCustomer(deleteModalState.customer!)} title="Excluir Cliente"><p>Tem certeza? Todos os dados, incluindo histórico de cobranças, serão perdidos.</p></ActionModal>}
            {equipmentSelectionModalState.isOpen && equipmentSelectionModalState.customer && <EquipmentSelectionModal isOpen={equipmentSelectionModalState.isOpen} onClose={() => setEquipmentSelectionModalState({ isOpen: false, customer: null })} customer={equipmentSelectionModalState.customer} onSelect={handleSelectEquipmentForBilling} />}
            {receiptActionsModalState.isOpen && receiptActionsModalState.billing && <ReceiptActionsModal isOpen={receiptActionsModalState.isOpen} onClose={() => setReceiptActionsModalState({ isOpen: false, billing: null, isProvisional: false })} billing={receiptActionsModalState.billing} isProvisional={receiptActionsModalState.isProvisional} isSharing={isSharing} onShare={() => handleShareReceipt(receiptActionsModalState.billing!)} onPrint={() => handlePrintPdfReceipt(receiptActionsModalState.billing!)} showNotification={showNotification} />}
            {debtReceiptActionsModalState.isOpen && debtReceiptActionsModalState.debtPayment && <DebtReceiptActionsModal isOpen={debtReceiptActionsModalState.isOpen} onClose={() => setDebtReceiptActionsModalState({ isOpen: false, debtPayment: null, customer: null })} debtPayment={debtReceiptActionsModalState.debtPayment} isSharing={isSharing} onShare={() => handleShareReceipt(debtReceiptActionsModalState.debtPayment!)} onPrint={() => handlePrintPdfReceipt(debtReceiptActionsModalState.debtPayment!)} showNotification={showNotification} />}
            {labelGenerationModalState.isOpen && <LabelGenerationModal isOpen={labelGenerationModalState.isOpen} onClose={() => setLabelGenerationModalState({isOpen: false})} customers={customers} showNotification={showNotification} onConfirm={() => {}} />}
            {editBillingModalState.isOpen && editBillingModalState.billing && <EditBillingModal isOpen={editBillingModalState.isOpen} onClose={() => setEditBillingModalState({ isOpen: false, billing: null })} onConfirm={handleUpdateBilling} billing={editBillingModalState.billing} customers={customers} billings={billings} />}
            {isFastBillingModalOpen && <FastBillingModal isOpen={isFastBillingModalOpen} onClose={() => setIsFastBillingModalOpen(false)} onConfirm={handleConfirmFastBilling} />}
            {locationActionsModalState.isOpen && locationActionsModalState.customer && <LocationActionsModal isOpen={locationActionsModalState.isOpen} onClose={() => setLocationActionsModalState({ isOpen: false, customer: null })} customer={locationActionsModalState.customer} />}
            {saveLocationModalState.isOpen && saveLocationModalState.customer && <ActionModal isOpen={saveLocationModalState.isOpen} onClose={() => setSaveLocationModalState({ isOpen: false, customer: null })} onConfirm={() => handleSaveLocation(saveLocationModalState.customer!)} title="Salvar Localização" confirmText="Salvar"><p>Deseja salvar a sua localização atual como o endereço para <strong>{saveLocationModalState.customer.name}</strong>?</p></ActionModal>}
            {addPhoneModalState.isOpen && addPhoneModalState.customer && <AddPhoneModal isOpen={addPhoneModalState.isOpen} onClose={() => setAddPhoneModalState({ isOpen: false, customer: null })} onConfirm={handleAddPhone} customer={addPhoneModalState.customer} />}
            {whatsAppActionsModalState.isOpen && whatsAppActionsModalState.customer && <WhatsAppActionsModal isOpen={whatsAppActionsModalState.isOpen} onClose={() => setWhatsAppActionsModalState({ isOpen: false, customer: null })} customer={whatsAppActionsModalState.customer} onShare={shareText} />}
            {fichaActionsModalState.isOpen && fichaActionsModalState.customer && (
                <FichaActionsModal
                    isOpen={fichaActionsModalState.isOpen}
                    onClose={() => setFichaActionsModalState({ isOpen: false, customer: null })}
                    customer={fichaActionsModalState.customer}
                    onShare={handleShareCustomerData}
                    onViewFicha={handleViewCustomerSheet}
                />
            )}
            {isDeleteAllDataModalOpen && <ActionModal isOpen={isDeleteAllDataModalOpen} onClose={() => setIsDeleteAllDataModalOpen(false)} onConfirm={handleDeleteAllData} title="Apagar Todos os Dados" confirmText="Sim, Apagar Tudo"><p className="text-red-400">Esta ação é irreversível. Confirma que deseja apagar todos os dados da sua conta?</p></ActionModal>}
            {finalizePaymentModalState.isOpen && finalizePaymentModalState.billing && (
                <FinalizePaymentModal 
                    isOpen={finalizePaymentModalState.isOpen} 
                    onClose={() => setFinalizePaymentModalState({ isOpen: false, billing: null })} 
                    onConfirm={handleFinalizePendingPayment} 
                    billing={finalizePaymentModalState.billing} 
                    customerDebt={customers.find(c => c.id === finalizePaymentModalState.billing?.customerId)?.debtAmount || 0}
                />
            )}
            {forgiveDebtModalState.isOpen && forgiveDebtModalState.customer && <ActionModal isOpen={forgiveDebtModalState.isOpen} onClose={() => setForgiveDebtModalState({ isOpen: false, customer: null })} onConfirm={() => handleForgiveDebt(forgiveDebtModalState.customer!)} title="Perdoar Dívida" confirmText="Sim, Perdoar"><p>Tem certeza que deseja zerar a dívida de <strong>{forgiveDebtModalState.customer.name}</strong> no valor de <strong>R$ {forgiveDebtModalState.customer.debtAmount.toFixed(2)}</strong>?</p></ActionModal>}
            {pendingPaymentActionModalState.isOpen && (
                <PendingPaymentActionModal
                    isOpen={pendingPaymentActionModalState.isOpen}
                    onClose={() => setPendingPaymentActionModalState({ isOpen: false, customer: null, pendingBilling: null })}
                    onBillNew={() => {
                        if(pendingPaymentActionModalState.customer) {
                            handleOpenBillingModal(pendingPaymentActionModalState.customer);
                        }
                        setPendingPaymentActionModalState({ isOpen: false, customer: null, pendingBilling: null });
                    }}
                    onContinuePending={() => {
                        if(pendingPaymentActionModalState.pendingBilling) {
                            setFinalizePaymentModalState({ isOpen: true, billing: pendingPaymentActionModalState.pendingBilling });
                        }
                        setPendingPaymentActionModalState({ isOpen: false, customer: null, pendingBilling: null });
                    }}
                />
            )}
            {privacyPinModalState.isOpen && <PrivacyPinModal isOpen={privacyPinModalState.isOpen} mode={privacyPinModalState.mode} title={privacyPinModalState.title} error={privacyPinModalState.error} onConfirm={privacyPinModalState.onConfirm} onClose={() => setPrivacyPinModalState(prev => ({ ...prev, isOpen: false, error: '' }))} />}
            {isRouteCreationModalOpen && <RouteCreationModal isOpen={isRouteCreationModalOpen} onClose={() => setIsRouteCreationModalOpen(false)} customers={customers} onConfirm={handleSaveRoute} isSaving={isSaving} />}
            {printableCustomerSheet && <PrintableCustomerSheetView customer={printableCustomerSheet} onCancel={() => setPrintableCustomerSheet(null)} showNotification={showNotification} />}
            {actionFeedbackState.isOpen && <ActionFeedbackOverlay isOpen={actionFeedbackState.isOpen} onEnd={handleAnimationEnd} variant={actionFeedbackState.variant} message={!isOnline && actionFeedbackState.message && !actionFeedbackState.message.toLowerCase().includes('offline') ? `${actionFeedbackState.message} (Offline)` : actionFeedbackState.message} />}

            {/* Legacy & Hardware Modals */}
            {digitalBillingModalState.isOpen && digitalBillingModalState.customer && (
                <DigitalBillingModal 
                    isOpen={digitalBillingModalState.isOpen} 
                    onClose={() => setDigitalBillingModalState({ isOpen: false, customer: null })} 
                    customer={digitalBillingModalState.customer} 
                    mercadoPagoToken={userProfile?.mercadoPagoToken}
                />
            )}
            {herokuDashboardState.isOpen && (
                <HerokuNativeDashboard 
                    isOpen={herokuDashboardState.isOpen}
                    onClose={() => setHerokuDashboardState({ isOpen: false, herokuId: '', machineName: '' })}
                    herokuId={herokuDashboardState.herokuId}
                    machineName={herokuDashboardState.machineName}
                    customerMpStoreId={herokuDashboardState.customerMpStoreId}
                    mercadoPagoToken={userProfile?.mercadoPagoToken}
                />
            )}
        </div>
    );
};

export default App;
