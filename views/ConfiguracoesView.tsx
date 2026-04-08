import React, { useState, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { auth } from '../firebase';
import PageHeader from '../components/PageHeader';
import { CloudUploadIcon, PlusIcon, StarIcon, TrashIcon, UserIcon, XIcon, LockClosedIcon, DatabaseIcon, SunIcon, MoonIcon, InstallIcon } from '../components/icons';
import { Theme, SavedUser, PixKey, UserProfile } from '../types';
import { applyThemeColors, defaultColors, AppThemeColors } from '../utils/theme';
import { v4 as uuidv4 } from 'uuid';

interface ConfiguracoesViewProps {
  userProfile: UserProfile | null;
  onUpdateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onExportData: () => void;
  onMergeData: (file: File) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  showNotification: (message: string, type?: 'success' | 'error') => void;
  deferredPrompt: any;
  onInstallPrompt: () => void;
  onDeleteAllData: () => void;
  onLogout: () => void;
  onSwitchAccount: (email: string) => void;
  onAddNewAccount: () => void;
  isPrivacyModeEnabled: boolean;
  onActivatePrivacyMode: () => void;
  onDeactivatePrivacyMode: () => void;
  isIndustrialMode: boolean;
  onToggleIndustrialMode: (enabled: boolean) => void;
}

const ColorPicker: React.FC<{ label: string, color: string, onChange: (color: string) => void }> = ({ label, color, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
        <div className="flex items-center gap-2">
            <input type="color" value={color} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 p-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md cursor-pointer" />
            <span className="font-mono text-slate-500 dark:text-slate-400">{color}</span>
        </div>
    </div>
);

const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  userProfile,
  onUpdateUserProfile,
  onExportData,
  onMergeData,
  theme,
  setTheme,
  showNotification,
  deferredPrompt,
  onInstallPrompt,
  onDeleteAllData,
  onLogout,
  onSwitchAccount,
  onAddNewAccount,
  isPrivacyModeEnabled,
  onActivatePrivacyMode,
  onDeactivatePrivacyMode,
  isIndustrialMode,
  onToggleIndustrialMode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savedUsers, setSavedUsers] = useState<SavedUser[]>([]);
  const currentUserEmail = auth.currentUser?.email;
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);
  
  // PIX Key State
  const [pixKeys, setPixKeys] = useState<PixKey[]>(userProfile?.pixKeys || []);
  const [newPixName, setNewPixName] = useState('');
  const [newPixKey, setNewPixKey] = useState('');

  useEffect(() => {
    if (userProfile?.pixKeys) {
        setPixKeys(userProfile.pixKeys);
    }
  }, [userProfile]);

  useEffect(() => {
    try {
        const usersStr = localStorage.getItem('savedUsers');
        const users: SavedUser[] = usersStr ? JSON.parse(usersStr) : [];
        setSavedUsers(users.filter((user) => user.email !== currentUserEmail));
    } catch (error) {
        console.error("Failed to load saved users:", error);
    }
  }, [currentUserEmail]);
  
  useEffect(() => {
    const getStorageEstimate = async () => {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                setStorageInfo({ usage: estimate.usage || 0, quota: estimate.quota || 0 });
            } catch (error) {
                console.error('Erro ao estimar o armazenamento:', error);
            } finally {
                setIsLoadingStorage(false);
            }
        } else {
            setIsLoadingStorage(false);
        }
    };
    getStorageEstimate();
  }, []);

  const [themeColors, setThemeColors] = useState<AppThemeColors>(() => {
    const savedColors = localStorage.getItem('appThemeColors');
    try {
        return savedColors ? JSON.parse(savedColors) : defaultColors;
    } catch (e) {
        return defaultColors;
    }
  });
  
  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onMergeData(file);
    event.target.value = '';
  };

  const handleColorChange = (colorType: keyof AppThemeColors, value: string) => {
    const newColors = { ...themeColors, [colorType]: value };
    setThemeColors(newColors);
    applyThemeColors(newColors);
  };

  const saveThemeColors = () => {
    localStorage.setItem('appThemeColors', JSON.stringify(themeColors));
    showNotification('Tema de cores salvo com sucesso!', 'success');
  };

  const restoreDefaultColors = () => {
    setThemeColors(defaultColors);
    applyThemeColors(defaultColors);
    localStorage.removeItem('appThemeColors');
    showNotification('Cores padrão restauradas.', 'success');
  };

  const handleThemeChange = () => setTheme(theme === 'light' ? 'dark' : 'light');
  
  const handleRemoveAccount = (emailToRemove: string) => {
    if (window.confirm(`Tem certeza que deseja remover a conta '${emailToRemove}' da lista de acesso rápido?`)) {
      try {
        const usersStr = localStorage.getItem('savedUsers');
        const allUsers: SavedUser[] = usersStr ? JSON.parse(usersStr) : [];
        const newAllUsers = allUsers.filter(user => user.email !== emailToRemove);
        localStorage.setItem('savedUsers', JSON.stringify(newAllUsers));
        setSavedUsers(newAllUsers.filter(user => user.email !== currentUserEmail));
        showNotification(`Conta ${emailToRemove} removida da lista.`, 'success');
      } catch(e) {
        showNotification('Erro ao remover conta.', 'error');
      }
    }
  };
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024; const dm = decimals < 0 ? 0 : decimals; const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };
  
  const handleAddPixKey = async () => {
      if (!newPixName.trim() || !newPixKey.trim()) {
          showNotification('O nome e a chave PIX são obrigatórios.', 'error');
          return;
      }
      const newKey: PixKey = {
          id: uuidv4(),
          name: newPixName.trim(),
          key: newPixKey.trim(),
          isDefault: pixKeys.length === 0, // Set as default if it's the first key
      };
      const updatedKeys = [...pixKeys, newKey];
      try {
        await onUpdateUserProfile({ pixKeys: updatedKeys });
        setPixKeys(updatedKeys);
        setNewPixName('');
        setNewPixKey('');
        showNotification('Chave PIX adicionada com sucesso!', 'success');
      } catch (error) {
          showNotification('Erro ao salvar a chave PIX.', 'error');
      }
  };

  const handleSetDefaultPixKey = async (id: string) => {
      const updatedKeys = pixKeys.map(key => ({ ...key, isDefault: key.id === id }));
      try {
        await onUpdateUserProfile({ pixKeys: updatedKeys });
        setPixKeys(updatedKeys);
        showNotification('Chave PIX padrão atualizada!', 'success');
      } catch (error) {
          showNotification('Erro ao definir chave padrão.', 'error');
      }
  };

  const handleDeletePixKey = async (id: string) => {
      if (!window.confirm('Tem certeza que deseja excluir esta chave PIX?')) return;
      const keyToDelete = pixKeys.find(key => key.id === id);
      let updatedKeys = pixKeys.filter(key => key.id !== id);

      if (keyToDelete?.isDefault && updatedKeys.length > 0) {
          updatedKeys[0].isDefault = true;
      }

      try {
        await onUpdateUserProfile({ pixKeys: updatedKeys });
        setPixKeys(updatedKeys);
        showNotification('Chave PIX excluída.', 'success');
      } catch (error) {
          showNotification('Erro ao excluir a chave PIX.', 'error');
      }
  };

  return (
    <>
      <PageHeader title="Configurações e Dados" subtitle="Gerencie os dados do aplicativo, realize backups e importe informações." />

      <div className="space-y-12">
        {/* PIX Keys Section */}
        <section>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Chaves PIX</h2>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Adicionar Nova Chave PIX</h3>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <input type="text" placeholder="Nome (ex: PIX Principal)" value={newPixName} onChange={e => setNewPixName(e.target.value)} className="flex-grow bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <input type="text" placeholder="Chave PIX (Copia e Cola)" value={newPixKey} onChange={e => setNewPixKey(e.target.value)} className="flex-grow bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <button onClick={handleAddPixKey} className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-2 px-4 rounded-md hover:bg-emerald-500 transition-colors"><PlusIcon className="w-5 h-5" /><span>Adicionar</span></button>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Minhas Chaves PIX</h3>
                    {pixKeys.length > 0 ? (
                        <ul className="space-y-3">
                            {pixKeys.map(key => (
                                <li key={key.id} className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex-grow w-full">
                                        <p className="font-bold text-slate-800 dark:text-slate-200">{key.name} {key.isDefault && <span className="text-xs font-normal text-amber-500">(Padrão)</span>}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 break-all">{key.key}</p>
                                    </div>
                                    <div className="flex gap-3 w-full sm:w-auto">
                                        {!key.isDefault && <button onClick={() => handleSetDefaultPixKey(key.id)} title="Definir como Padrão" className="flex-1 sm:flex-initial bg-amber-500/20 text-amber-500 font-bold py-2 px-3 rounded-md hover:bg-amber-500/40 transition-colors"><StarIcon className="w-5 h-5 mx-auto"/></button>}
                                        <button onClick={() => handleDeletePixKey(key.id)} title="Excluir Chave" className="flex-1 sm:flex-initial bg-red-600/20 text-red-400 font-bold py-2 px-3 rounded-md hover:bg-red-600/40 transition-colors"><TrashIcon className="w-5 h-5 mx-auto"/></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-500 dark:text-slate-400 text-center py-4">Nenhuma chave PIX cadastrada.</p>
                    )}
                </div>
            </div>
        </section>
        
        {/* Mercado Pago Integration Section */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6 border-b border-slate-700 pb-2">Integrações Mercado Pago</h2>
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-2">Token de Acesso (API)</h3>
            <p className="text-slate-400 mb-4">Insira o seu <strong>Access Token</strong> de Produção do Mercado Pago para habilitar consultas de faturamento e geração de QR Codes.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Mercado Pago Access Token</label>
                <div className="flex gap-2">
                    <input 
                      type="password" 
                      placeholder="APP_USR-..." 
                      defaultValue={userProfile?.mercadoPagoToken || ''} 
                      onBlur={async (e) => {
                        const token = e.target.value.trim();
                        if (token !== (userProfile?.mercadoPagoToken || '')) {
                          await onUpdateUserProfile({ mercadoPagoToken: token });
                          showNotification('Token Mercado Pago atualizado!', 'success');
                        }
                      }}
                      className="flex-grow bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">ID da Loja (PIX MONTANHA - Frota)</label>
                  <input 
                      type="text" 
                      placeholder="Ex: 12345678" 
                      defaultValue={userProfile?.mercadoPagoStoreId || ''} 
                      onBlur={async (e) => {
                        const storeId = e.target.value.trim();
                        if (storeId !== (userProfile?.mercadoPagoStoreId || '')) {
                          await onUpdateUserProfile({ mercadoPagoStoreId: storeId });
                          showNotification('ID da Loja Global atualizado!', 'success');
                        }
                      }}
                      className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                  />
                </div>
            </div>
          </div>
        </section>
        
        {/* Account Section */}
        <section>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Gerenciamento de Contas</h2>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Conta Ativa</h3>
              <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-lime-500/20 rounded-full"><UserIcon className="w-6 h-6 text-lime-400"/></div>
                      <div>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Conectado como:</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{currentUserEmail}</p>
                      </div>
                  </div>
                  <button onClick={onLogout} className="w-full sm:w-auto bg-slate-500 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-400 transition-colors">Sair</button>
              </div>

              {savedUsers.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Outras contas salvas</h3>
                    <ul className="space-y-3">
                        {savedUsers.map(user => (
                            <li key={user.email} className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                                <span className="font-medium text-slate-700 dark:text-slate-300 break-all">{user.email}</span>
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button onClick={() => handleRemoveAccount(user.email)} title="Remover da lista" className="flex-1 sm:flex-initial bg-red-600/20 text-red-400 font-bold py-2 px-3 rounded-md hover:bg-red-600/40 transition-colors"><XIcon className="w-5 h-5 mx-auto"/></button>
                                    <button onClick={() => onSwitchAccount(user.email)} className="flex-1 sm:flex-initial bg-sky-600 text-white font-bold py-2 px-4 rounded-md hover:bg-sky-500 transition-colors text-sm">Trocar</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <button onClick={onAddNewAccount} className="w-full sm:w-auto bg-lime-500 text-white font-bold py-2 px-4 rounded-md hover:bg-lime-600 transition-colors">+ Adicionar nova conta</button>
              </div>

            </div>
        </section>

        {/* Security Section */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Segurança</h2>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Modo de Privacidade</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">Oculte todos os valores financeiros do aplicativo. Um PIN será necessário para desbloquear a visualização dos valores temporariamente.</p>
            {isPrivacyModeEnabled ? (
              <button onClick={onDeactivatePrivacyMode} className="inline-flex items-center gap-2 bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 transition-colors"><LockClosedIcon className="w-5 h-5" /><span>Desativar Modo de Privacidade</span></button>
            ) : (
              <button onClick={onActivatePrivacyMode} className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-500 transition-colors"><LockClosedIcon className="w-5 h-5" /><span>Ativar Modo de Privacidade</span></button>
            )}
          </div>
        </section>

        {/* Industrial Mode Section */}
        <section>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Modo de Operação</h2>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Modo Industrial (Sunmi P2)</h3>
                        <p className="text-slate-500 dark:text-slate-400">Ativa a interface de alto contraste e botões ampliados para terminais de hardware. Ideal para uso em campo.</p>
                    </div>
                    <button 
                        onClick={() => onToggleIndustrialMode(!isIndustrialMode)}
                        className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isIndustrialMode ? 'bg-yellow-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isIndustrialMode ? 'translate-x-6' : 'translate-x-0'}`}></span>
                    </button>
                </div>
            </div>
        </section>

        {/* Storage Section */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Armazenamento</h2>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2"><DatabaseIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />Uso de Armazenamento Offline</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">O aplicativo armazena dados localmente para funcionar offline. Este é o espaço utilizado no seu dispositivo.</p>
            {isLoadingStorage ? (
              <p className="text-slate-500 dark:text-slate-400">Calculando uso de armazenamento...</p>
            ) : storageInfo && (storageInfo.usage > 0 || storageInfo.quota > 0) ? (
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Usado: {formatBytes(storageInfo.usage || 0)}</span>
                  {storageInfo.quota > 0 && <span className="text-sm text-slate-500 dark:text-slate-400">Total: {formatBytes(storageInfo.quota)}</span>}
                </div>
                {storageInfo.quota > 0 && (
                  <>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                      <div className="bg-lime-500 h-4 rounded-full transition-all duration-500" style={{ width: `${(storageInfo.usage / storageInfo.quota) * 100}%` }}></div>
                    </div>
                    <p className="text-right text-xs text-slate-500 dark:text-slate-400 mt-1">{((storageInfo.usage / storageInfo.quota) * 100).toFixed(2)}% utilizado</p>
                  </>
                )}
              </div>
            ) : (
              <div>
                  <p className="text-amber-500 dark:text-amber-400 font-medium">Leitura gráfica não suportada neste dispositivo.</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">O seu hardware ou sistema operacional restringe a leitura de contagem de bytes via Aplicativo Nativo. Não se preocupe, o armazenamento offline funciona perfeitamente utilizando a capacidade total do aparelho.</p>
              </div>
            )}
          </div>
        </section>
        
        {/* Install App Section */}
        {deferredPrompt && (
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Instalação do Aplicativo</h2>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Instalar na Área de Trabalho</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">Instale este aplicativo em seu computador ou celular para um acesso mais rápido e para habilitar funcionalidades offline, como um aplicativo nativo.</p>
              <button onClick={onInstallPrompt} className="inline-flex items-center gap-2 bg-lime-500 text-white font-bold py-2 px-4 rounded-md hover:bg-lime-600 transition-colors"><InstallIcon className="w-5 h-5" /><span>Instalar Aplicativo</span></button>
            </div>
          </section>
        )}
        
        {/* Appearance Section */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Aparência</h2>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Tema do Aplicativo</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">Escolha entre o tema claro ou escuro.</p>
            <div className="flex items-center gap-4">
              <span className="text-slate-500 dark:text-slate-400">Claro</span>
              <button onClick={handleThemeChange} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 ${theme === 'dark' ? 'bg-[var(--color-primary)]' : 'bg-slate-300'}`}>
                <span className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`}>
                  <span className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity ${theme === 'light' ? 'opacity-100 ease-in duration-200' : 'opacity-0 ease-out duration-100'}`}><SunIcon className="h-3 w-3 text-slate-500" /></span>
                  <span className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity ${theme === 'dark' ? 'opacity-100 ease-in duration-200' : 'opacity-0 ease-out duration-100'}`}><MoonIcon className="h-3 w-3 text-[var(--color-primary)]" /></span>
                </span>
              </button>
              <span className="text-slate-500 dark:text-slate-400">Escuro</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Cores do Tema</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">Personalize as cores primária e de destaque do aplicativo.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <ColorPicker label="Cor Primária" color={themeColors.primary} onChange={(c) => handleColorChange('primary', c)} />
                 <ColorPicker label="Cor de Destaque" color={themeColors.accent} onChange={(c) => handleColorChange('accent', c)} />
            </div>
             <div className="flex flex-col sm:flex-row gap-4 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button onClick={restoreDefaultColors} className="flex-1 bg-slate-500 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-400">Restaurar Padrão</button>
                <button onClick={saveThemeColors} className="flex-1 bg-lime-500 text-white font-bold py-2 px-4 rounded-md hover:bg-lime-600">Salvar Cores</button>
             </div>
          </div>
        </section>

        {/* Data Management Section */}
        <section>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Backup e Restauração</h2>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Backup e Importação de Dados</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">A importação mesclará os dados do arquivo de backup com os dados existentes no aplicativo. Itens com o mesmo ID serão atualizados. Use com cuidado.</p>
              <div className="flex flex-wrap gap-4">
                <button onClick={onExportData} className="inline-flex items-center gap-2 bg-sky-600 text-white font-bold py-2 px-4 rounded-md hover:bg-sky-500 transition-colors"><CloudUploadIcon className="w-5 h-5 transform rotate-180" /><span>Exportar Dados (Backup)</span></button>
                <button onClick={handleImportClick} className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold py-2 px-4 rounded-md hover:bg-emerald-500 transition-colors"><CloudUploadIcon className="w-5 h-5" /><span>Importar e Mesclar Dados</span></button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/json" className="hidden" />
              </div>
            </div>
        </section>

         {/* Danger Zone Section */}
        <section>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">Zona de Perigo</h2>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border-2 border-red-500 dark:border-red-700">
              <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Apagar Todos os Dados</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">Esta ação é <strong className="font-bold">permanente e irreversível</strong>. Todos os seus clientes, cobranças, despesas e históricos serão excluídos da sua conta.</p>
              <button onClick={onDeleteAllData} className="inline-flex items-center gap-2 bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 transition-colors"><TrashIcon className="w-5 h-5" /><span>Apagar Tudo Permanentemente</span></button>
            </div>
        </section>
      </div>
    </>
  );
};

export default ConfiguracoesView;
