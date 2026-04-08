// components/CustomerForm.tsx
import React, { useState, useCallback } from 'react';
import { Customer, Equipment } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { BilliardIcon } from './icons/BilliardIcon';
import { JukeboxIcon } from './icons/JukeboxIcon';
import { CraneIcon } from './icons/CraneIcon';
import { LocationMarkerIcon } from './icons/LocationMarkerIcon';
import SignatureModal from './SignatureModal';
import { ImageIcon } from './icons/ImageIcon';
import { safeParseFloat } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { Geolocation } from '@capacitor/geolocation';

interface CustomerFormProps {
  customers: Customer[];
  initialData?: Customer;
  onSubmit: (formData: Omit<Customer, 'id' | 'createdAt' | 'debtAmount' | 'lastVisitedAt' | 'equipment'> & { debtAmount?: string | number } & { equipment: Partial<Equipment>[] }) => Promise<void>;
  isSaving: boolean;
  showNotification: (message: string, type?: 'success' | 'error') => void;
  onCancel: () => void;
  submitButtonText: string;
  isEditMode?: boolean;
  areValuesHidden?: boolean;
}

const initialFormState = {
    name: '',
    cpfRg: '',
    cidade: '',
    endereco: '',
    telefone: '',
    linhaNumero: '',
    assinaturaFirma: '',
    assinaturaCliente: '',
    equipment: [],
    latitude: null,
    longitude: null,
    mercadoPagoStoreId: '',
};

const FormField: React.FC<{ 
  label: string; 
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; 
  required?: boolean; 
  step?: string;
  isEditMode?: boolean;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  placeholder?: string;
}> = React.memo(({ label, name, value, onChange, type = 'text', required = false, step, isEditMode, inputMode, placeholder }) => (
    <div>
        <label htmlFor={`${isEditMode ? 'edit-' : ''}${name}`} className={`block text-sm font-medium ${isEditMode ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'} mb-1`}>{label}</label>
        <input 
            type={type} 
            id={`${isEditMode ? 'edit-' : ''}${name}`} 
            name={name} 
            value={value} 
            onChange={onChange} 
            required={required} 
            step={step} 
            inputMode={inputMode}
            placeholder={placeholder}
            className={`w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-lime-500 ${isEditMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'}`} 
        />
    </div>
));

const CustomerForm: React.FC<CustomerFormProps> = ({ customers, initialData, onSubmit, isSaving, showNotification, onCancel, submitButtonText, isEditMode = false, areValuesHidden = false }) => {
  const [formData, setFormData] = useState(() => {
    // FIX: Explicitly type `equipment` as `Partial<Equipment>[]` to handle both full and partial equipment objects during form manipulation. This resolves the type error when updating the state.
    const equipment: Partial<Equipment>[] = initialData?.equipment ? [...initialData.equipment] : [];
    return {
      ...initialFormState,
      ...initialData,
      equipment,
    };
  });
  
  const [openEquipmentIndex, setOpenEquipmentIndex] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'online' | 'offline' | 'error'>('idle');
  const [signatureModalFor, setSignatureModalFor] = useState<'cliente' | 'firma' | null>(null);

  const handleBaseChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleEquipmentChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
        const newEquipment = [...(prev.equipment || [])];
        const currentItem = { ...newEquipment[index] };

        if (name === 'aluguelTipo') {
            if (value === 'percentual') {
                currentItem.aluguelPercentual = currentItem.aluguelPercentual ?? 50;
                delete currentItem.aluguelValor;
            } else {
                currentItem.aluguelValor = currentItem.aluguelValor ?? 0;
                delete currentItem.aluguelPercentual;
            }
        } else {
            (currentItem as any)[name] = value;
        }
        
        if (name === 'billingType' && value === 'monthly') {
          delete currentItem.valorFicha;
          delete currentItem.parteFirma;
          delete currentItem.parteCliente;
        } else if (name === 'billingType' && value === 'perPlay') {
          delete currentItem.monthlyFeeValue;
        }

        const numericValue = safeParseFloat(value);
        if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
            const remaining = 100 - numericValue;
            if (name === 'parteFirma') currentItem.parteCliente = parseFloat(remaining.toFixed(2));
            else if (name === 'parteCliente') currentItem.parteFirma = parseFloat(remaining.toFixed(2));
            else if (name === 'porcentagemJukeboxFirma') currentItem.porcentagemJukeboxCliente = parseFloat(remaining.toFixed(2));
            else if (name === 'porcentagemJukeboxCliente') currentItem.porcentagemJukeboxFirma = parseFloat(remaining.toFixed(2));
        }

        newEquipment[index] = currentItem;
        return { ...prev, equipment: newEquipment };
    });
  }, []);

  const addEquipment = useCallback((type: 'mesa' | 'jukebox' | 'grua') => {
      let newEquipment: Partial<Equipment>;
      if (type === 'mesa') {
          newEquipment = { id: uuidv4(), type: 'mesa', billingType: 'perPlay', numero: '', relogioNumero: '', relogioAnterior: 0, valorFicha: 2, parteFirma: 50, parteCliente: 50, monthlyFeeValue: 0 };
      } else if (type === 'jukebox') {
          newEquipment = { id: uuidv4(), type: 'jukebox', numero: '', relogioNumero: '', relogioAnterior: 0, porcentagemJukeboxFirma: 50, porcentagemJukeboxCliente: 50 };
      } else {
          newEquipment = { id: uuidv4(), type: 'grua', numero: '', relogioAnterior: 0, aluguelValor: 0, saldo: 0, reposicaoPelucia: 0, recebimentoEspecie: 0, recebimentoPix: 0 };
      }
      setFormData(prev => {
          const newEquipmentList = [...(prev.equipment || []), newEquipment];
          setOpenEquipmentIndex(newEquipmentList.length - 1);
          return { ...prev, equipment: newEquipmentList };
      });
  }, []);

  const removeEquipment = useCallback((index: number) => {
    setFormData(prev => ({...prev, equipment: (prev.equipment || []).filter((_, i) => i !== index)}));
    setOpenEquipmentIndex(prev => (prev === index ? null : prev !== null && prev > index ? prev - 1 : prev));
  }, []);

  const handleCityChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, cidade: value }));
  }, []);

  const handleGeolocate = useCallback(async () => {
    setIsLocating(true);
    setLocationStatus('idle');
    try {
        const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000
        });
        
        const { latitude, longitude } = position.coords;
        
        if (!navigator.onLine) {
            setFormData(prev => ({ ...prev, latitude, longitude }));
            setLocationStatus('offline');
            showNotification("Coordenadas capturadas Offline (GPS Ativo)", "success");
            setIsLocating(false);
            return;
        }

        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        if (!response.ok) {
            setFormData(prev => ({ ...prev, latitude, longitude }));
            setLocationStatus('offline');
            showNotification("Coordenadas capturadas via GPS! (Erro ao buscar endereço online)", "success");
            return;
        }
        const data = await response.json();
        
        if (data?.address) {
            const { road, house_number, city, town, village, state, suburb } = data.address;
            const street = `${road || ''}${house_number ? `, ${house_number}` : ''}`;
            const cityName = city || town || village || suburb || '';
            const fullCity = `${cityName}, ${state || ''}`.replace(/^, |^ | ,$/g, '');
            setFormData(prev => ({ ...prev, endereco: street, cidade: fullCity, latitude, longitude }));
            setLocationStatus('online');
            showNotification("Endereço e coordenadas capturados com sucesso!", "success");
        } else {
            setFormData(prev => ({ ...prev, latitude, longitude }));
            setLocationStatus('offline');
            showNotification("Coordenadas salvas, mas o endereço não foi encontrado.", "success");
        }
    } catch (error: any) {
        console.error("Localização erro:", error);
        setLocationStatus('error');
        let message = "Erro ao obter localização.";
        if (error.code === 1 || error.message?.toLowerCase().includes("denied")) {
            message = "Permissão de localização negada pelo sistema.";
        } else if (error.message?.toLowerCase().includes("timeout")) {
            message = "Tempo esgotado ao buscar localização. Tente novamente em local aberto.";
        }
        showNotification(message, "error");
    } finally {
        setIsLocating(false);
    }
  }, [showNotification]);

  const handleSubmitWrapper = async (e: React.FormEvent) => {
    e.preventDefault();

    const allOtherNumbers = new Set<string>();
    customers.forEach(c => {
        if (c.id !== formData.id) {
            (c.equipment || []).forEach(e => {
                if (e.numero) allOtherNumbers.add(e.numero);
            });
        }
    });

    const formNumbers = new Set<string>();
    for (const equip of (formData.equipment || [])) {
        if (!equip.numero) continue;
        if (allOtherNumbers.has(equip.numero)) {
            showNotification(`O número de equipamento '${equip.numero}' já está em uso.`, "error");
            return;
        }
        if (formNumbers.has(equip.numero)) {
            showNotification(`Número de equipamento '${equip.numero}' duplicado.`, "error");
            return;
        }
        formNumbers.add(equip.numero);
    }

    await onSubmit(formData as any);
  };
  
  const SignatureCapture: React.FC<{ label: string, signature: string, onSign: () => void, onClear: () => void }> = ({ label, signature, onSign, onClear }) => (
      <div>
          <label className={`block text-sm font-medium ${isEditMode ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'} mb-2`}>{label}</label>
          <div className={`w-full h-24 rounded-md border-2 border-dashed flex items-center justify-center p-2 ${isEditMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600'}`}>
              {signature ? <img src={signature} alt={label} className="max-h-full max-w-full" /> : <div className="text-center text-slate-400 dark:text-slate-500"><ImageIcon className="w-8 h-8 mx-auto" /><p className="text-xs mt-1">Nenhuma assinatura</p></div>}
          </div>
          <div className="flex gap-2 mt-2">
              <button type="button" onClick={onSign} className="flex-1 bg-sky-600 text-white font-bold text-sm py-2 px-3 rounded-md hover:bg-sky-500">{signature ? 'Assinar Novamente' : 'Coletar Assinatura'}</button>
              {signature && <button type="button" onClick={onClear} className="p-2 bg-red-600 text-white rounded-md hover:bg-red-500" title="Limpar Assinatura"><TrashIcon className="w-5 h-5" /></button>}
          </div>
      </div>
  );

  return (
    <>
      <form onSubmit={handleSubmitWrapper} className="space-y-6">
        {/* Fields and logic from AddCustomerForm and EditCustomerModal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3">
                <h3 className={`text-lg font-semibold ${isEditMode ? 'text-white' : 'text-slate-900 dark:text-white'} border-b ${isEditMode ? 'border-slate-700' : 'border-slate-200 dark:border-slate-700'} pb-2 mb-4`}>Informações do Cliente</h3>
            </div>
            <FormField label="Nome Completo" name="name" required value={formData.name || ''} onChange={handleBaseChange} isEditMode={isEditMode}/>
            <FormField label="CPF/RG" name="cpfRg" value={formData.cpfRg || ''} onChange={handleBaseChange} isEditMode={isEditMode}/>
            <FormField label="Telefone" name="telefone" value={formData.telefone || ''} onChange={handleBaseChange} type="tel" inputMode="tel" isEditMode={isEditMode}/>
            <div>
                <label htmlFor={`${isEditMode ? 'edit-' : ''}endereco`} className={`block text-sm font-medium ${isEditMode ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'} mb-1`}>Endereço</label>
                <div className="relative flex items-center">
                    <input type="text" id={`${isEditMode ? 'edit-' : ''}endereco`} name="endereco" value={formData.endereco || ''} onChange={handleBaseChange} className={`w-full border rounded-md py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-lime-500 ${isEditMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'}`} />
                    <button 
                        type="button" 
                        onClick={handleGeolocate} 
                        disabled={isLocating} 
                        className={`absolute right-0 top-0 h-full px-3 transition-all duration-500 rounded-r-md flex items-center
                            ${isLocating ? 'text-slate-600 cursor-wait' : 
                              locationStatus === 'online' ? 'bg-emerald-500 text-white' : 
                              locationStatus === 'offline' ? 'bg-red-500 text-white' : 
                              locationStatus === 'error' ? 'text-red-400' : 'text-slate-400 hover:text-lime-400'}`}
                        title="Preencher endereço com localização atual"
                    >
                        {isLocating ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <LocationMarkerIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>
            <FormField label="Cidade" name="cidade" value={formData.cidade || ''} onChange={handleBaseChange} required isEditMode={isEditMode} />
            <FormField label="Cobrador" name="linhaNumero" value={formData.linhaNumero || ''} onChange={handleBaseChange} isEditMode={isEditMode}/>
            <FormField label="ID Loja Mercado Pago" name="mercadoPagoStoreId" value={formData.mercadoPagoStoreId || ''} onChange={handleBaseChange} placeholder="Ex: 12345678" isEditMode={isEditMode}/>
            {isEditMode && !areValuesHidden && (
                <FormField label="Dívida Atual (R$)" name="debtAmount" value={String(formData.debtAmount || '')} onChange={handleBaseChange} type="text" inputMode="decimal" isEditMode={isEditMode}/>
            )}
        </div>
        
        <div className={`pt-4 border-t ${isEditMode ? 'border-slate-700' : 'border-slate-200 dark:border-slate-700'}`}>
            <h3 className={`text-lg font-semibold ${isEditMode ? 'text-white' : 'text-slate-900 dark:text-white'} mb-4`}>Equipamentos</h3>
            <div className="space-y-2">
                {(formData.equipment || []).map((equip, index) => {
                    const EquipmentIcon = equip.type === 'mesa' ? BilliardIcon : equip.type === 'jukebox' ? JukeboxIcon : CraneIcon;
                    const equipmentTitle = equip.type === 'mesa' ? `Mesa de Sinuca` : equip.type === 'jukebox' ? `Jukebox` : `Grua de Pelúcia`;
                    const colorMap = { mesa: 'text-cyan-400', jukebox: 'text-fuchsia-400', grua: 'text-orange-400' };
                    const equipmentColor = colorMap[equip.type!] || 'text-slate-400';
                    return (
                        <div key={equip.id} className={`rounded-lg border overflow-hidden transition-all duration-300 ${isEditMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'}`}>
                            <button type="button" onClick={() => setOpenEquipmentIndex(openEquipmentIndex === index ? null : index)} className={`w-full flex justify-between items-center p-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lime-500 ${isEditMode ? 'hover:bg-slate-700/20' : 'hover:bg-slate-100 dark:hover:bg-slate-700/20'}`}>
                                <div className="flex items-center gap-3">
                                    <EquipmentIcon className={`w-5 h-5 ${equipmentColor}`} />
                                    <h4 className={`text-md font-bold capitalize ${isEditMode ? 'text-white' : 'text-slate-900 dark:text-white'}`}><span className={equipmentColor}>{equipmentTitle}</span>: <span className="font-normal text-slate-300">{equip.numero || '(Novo)'}</span></h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); removeEquipment(index); }} className="text-slate-500 hover:text-red-500 p-1 rounded-full hover:bg-red-500/10"><TrashIcon className="w-5 h-5" /></button>
                                    <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${openEquipmentIndex === index ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openEquipmentIndex === index && (
                                <div className={`p-4 border-t ${isEditMode ? 'border-slate-700 bg-slate-800/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/20'}`}>
                                    {/* Equipment fields */}
                                    {equip.type === 'mesa' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className={`block text-sm font-medium ${isEditMode ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'} mb-1`}>Tipo de Cobrança</label>
                                                <select name="billingType" value={equip.billingType || 'perPlay'} onChange={e => handleEquipmentChange(index, e)} className={`w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-lime-500 ${isEditMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'}`}><option value="perPlay">Por Ficha</option><option value="monthly">Mensal Fixo</option></select>
                                            </div>
                                            <FormField label="ID Heroku (ESP32)" name="herokuId" value={String(equip.herokuId || '')} onChange={e => handleEquipmentChange(index, e)} placeholder="Ex: heroku-app-name" isEditMode={isEditMode} />
                                            <div/>
                                            <FormField label="Número da Mesa" name="numero" value={String(equip.numero || '')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} />
                                            <FormField label="Nº Relógio da Mesa" name="relogioNumero" value={String(equip.relogioNumero || '')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} />
                                            <FormField label="Leitura Anterior" name="relogioAnterior" type="number" inputMode="numeric" value={String(equip.relogioAnterior || '0')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} />
                                            {equip.billingType === 'monthly' ? <FormField label="Valor Mensal (R$)" name="monthlyFeeValue" type="text" inputMode="numeric" value={String(equip.monthlyFeeValue || '0')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} /> : <> <div>
                                                <label className={`block text-sm font-medium ${isEditMode ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'} mb-1`}>Valor da Ficha (R$)</label>
                                                <select name="valorFicha" value={String(equip.valorFicha || '2')} onChange={e => handleEquipmentChange(index, e)} className={`w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-lime-500 ${isEditMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'}`}>
                                                    {["1.00", "1.50", "2.00", "2.50", "3.00", "3.50", "4.00", "4.50", "5.00"].includes(String(equip.valorFicha)) ? null : <option value={String(equip.valorFicha)}>{`R$ ${Number(equip.valorFicha).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</option>}
                                                    <option value="1.00">R$ 1,00</option>
                                                    <option value="1.50">R$ 1,50</option>
                                                    <option value="2.00">R$ 2,00</option>
                                                    <option value="2.50">R$ 2,50</option>
                                                    <option value="3.00">R$ 3,00</option>
                                                    <option value="3.50">R$ 3,50</option>
                                                    <option value="4.00">R$ 4,00</option>
                                                    <option value="4.50">R$ 4,50</option>
                                                    <option value="5.00">R$ 5,00</option>
                                                </select>
                                            </div> <FormField label="Parte da Firma (%)" name="parteFirma" type="number" inputMode="numeric" value={String(equip.parteFirma || '50')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} /> <FormField label="Parte do Cliente (%)" name="parteCliente" type="number" inputMode="numeric" value={String(equip.parteCliente || '50')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} /> </> }
                                        </div>
                                    ) : equip.type === 'jukebox' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField label="Número da Jukebox" name="numero" value={String(equip.numero || '')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} />
                                            <FormField label="Nº Relógio da Jukebox" name="relogioNumero" value={String(equip.relogioNumero || '')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} />
                                            <FormField label="Leitura Anterior" name="relogioAnterior" type="number" inputMode="numeric" value={String(equip.relogioAnterior || '0')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} />
                                            <FormField label="% da Firma" name="porcentagemJukeboxFirma" type="number" inputMode="numeric" value={String(equip.porcentagemJukeboxFirma || '50')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} />
                                            <FormField label="% do Cliente" name="porcentagemJukeboxCliente" type="number" inputMode="numeric" value={String(equip.porcentagemJukeboxCliente || '50')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} />
                                            <FormField label="ID Heroku (ESP32)" name="herokuId" value={String(equip.herokuId || '')} onChange={e => handleEquipmentChange(index, e)} placeholder="Ex: heroku-app-name" isEditMode={isEditMode} />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField label="Número da Grua" name="numero" value={String(equip.numero || '')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} />
                                            <FormField label="Leitura Anterior" name="relogioAnterior" type="number" inputMode="numeric" value={String(equip.relogioAnterior || '')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} />
                                            <FormField label="Qtd. Pelúcias (Capacidade)" name="quantidadePelucia" type="number" inputMode="numeric" value={String(equip.quantidadePelucia ?? '')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} />
                                            <div>
                                                <label className={`block text-sm font-medium ${isEditMode ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'} mb-1`}>Tipo de Aluguel</label>
                                                <select name="aluguelTipo" value={equip.aluguelPercentual != null ? 'percentual' : 'fixo'} onChange={e => handleEquipmentChange(index, e)} className={`w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-lime-500 ${isEditMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'}`}><option value="fixo">Valor Fixo (R$)</option><option value="percentual">Percentual (%)</option></select>
                                            </div>
                                            {equip.aluguelPercentual != null ? <FormField label="Aluguel (%)" name="aluguelPercentual" type="number" inputMode="numeric" value={String(equip.aluguelPercentual ?? '')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} /> : <FormField label="Aluguel Fixo (R$)" name="aluguelValor" type="text" inputMode="numeric" value={String(equip.aluguelValor || '')} onChange={e => handleEquipmentChange(index, e)} isEditMode={isEditMode} />}
                                            <FormField label="ID Heroku (ESP32)" name="herokuId" value={String(equip.herokuId || '')} onChange={e => handleEquipmentChange(index, e)} placeholder="Ex: heroku-app-name" isEditMode={isEditMode} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
                <button type="button" onClick={() => addEquipment('mesa')} className="bg-sky-600 text-white font-bold py-2 px-4 rounded-md hover:bg-sky-500">Adicionar Mesa</button>
                <button type="button" onClick={() => addEquipment('jukebox')} className="bg-fuchsia-600 text-white font-bold py-2 px-4 rounded-md hover:bg-fuchsia-500">Adicionar Jukebox</button>
                <button type="button" onClick={() => addEquipment('grua')} className="bg-orange-600 text-white font-bold py-2 px-4 rounded-md hover:bg-orange-500">Adicionar Grua</button>
            </div>
        </div>

        <div className={`pt-4 border-t ${isEditMode ? 'border-slate-700' : 'border-slate-200 dark:border-slate-700'}`}>
            <h3 className={`text-lg font-semibold ${isEditMode ? 'text-white' : 'text-slate-900 dark:text-white'} mb-4`}>Assinaturas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SignatureCapture label="Assinatura do Cliente" signature={formData.assinaturaCliente || ''} onSign={() => setSignatureModalFor('cliente')} onClear={() => setFormData(prev => ({...prev, assinaturaCliente: ''}))} />
                <SignatureCapture label="Assinatura da Firma" signature={formData.assinaturaFirma || ''} onSign={() => setSignatureModalFor('firma')} onClear={() => setFormData(prev => ({...prev, assinaturaFirma: ''}))} />
            </div>
        </div>

        <div className={`flex justify-end gap-4 pt-4 border-t ${isEditMode ? 'border-slate-700 mt-6' : 'border-slate-200 dark:border-slate-700'}`}>
          <button type="button" onClick={onCancel} className="text-white font-bold py-2 px-6 rounded-md transition-colors animate-blink-cancel">Cancelar</button>
          <button type="submit" disabled={isSaving} className="bg-lime-500 text-white font-bold py-2 px-6 rounded-md hover:bg-lime-600 disabled:bg-slate-500 disabled:cursor-wait">{isSaving ? 'Salvando...' : submitButtonText}</button>
        </div>
      </form>
      <SignatureModal
        isOpen={!!signatureModalFor}
        onClose={() => setSignatureModalFor(null)}
        onSave={(dataUrl) => {
          if (signatureModalFor === 'cliente') setFormData(prev => ({ ...prev, assinaturaCliente: dataUrl }));
          else if (signatureModalFor === 'firma') setFormData(prev => ({ ...prev, assinaturaFirma: dataUrl }));
          setSignatureModalFor(null);
        }}
        title={`Assinatura ${signatureModalFor === 'cliente' ? 'do Cliente' : 'da Firma'}`}
      />
    </>
  );
};

export default CustomerForm;