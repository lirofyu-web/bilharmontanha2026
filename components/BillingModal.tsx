// components/BillingModal.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Customer, Equipment, Billing } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { AlertIcon } from './icons/AlertIcon';
import { safeParseFloat } from '../utils';
import { XIcon } from './icons/XIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';

type FormState = {
  relogioAtual: string;
  totalArrecadadoJukebox: string; // Jukebox specific
  descontoPartidas: string; // Mesa specific
  // Grua specific
  aluguelPercentual: string;
  aluguelValor: string;
  saldo: string;
  quantidadePelucia: string;
  sobraPelucia: string;
  reposicaoPelucia: string;
  recebimentoEspecie: string;
  recebimentoPix: string;
};

type PaymentState = {
  dinheiro: string;
  pix: string;
  desconto: string;
};

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (billing: Billing) => void;
  customer: Customer;
  equipment: Equipment;
  onTriggerProvisionalReceiptAction: (billing: Billing, onComplete: () => void) => void;
}

const FormField: React.FC<{
    label: string;
    name: keyof FormState;
    value: string;
    type?: string;
    step?: string;
    equipmentId: string;
    isReadingInvalid?: boolean;
    readOnly?: boolean;
    autoFocus?: boolean;
    inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
    onChange: (field: keyof FormState, value: string) => void;
}> = React.memo(({ label, name, value, type = 'text', step, equipmentId, isReadingInvalid, readOnly, autoFocus, inputMode, onChange }) => (
    <div>
        <label htmlFor={`${equipmentId}-${name}`} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input
            type={type}
            id={`${equipmentId}-${name}`}
            value={value}
            step={step}
            inputMode={inputMode}
            readOnly={readOnly}
            autoFocus={autoFocus}
            onChange={(e) => !readOnly && onChange(name, e.target.value)}
            className={`w-full bg-slate-700 border rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 ${isReadingInvalid && name === 'relogioAtual' ? 'border-red-500 ring-red-500' : 'border-slate-600 focus:ring-lime-500'} ${readOnly ? 'bg-slate-600 cursor-not-allowed' : ''}`}
        />
    </div>
));

const PaymentField: React.FC<{
    label: string;
    name: keyof PaymentState;
    value: string;
    onChange: (field: keyof PaymentState, value: string) => void;
    readOnly?: boolean;
}> = React.memo(({ label, name, value, onChange, readOnly = false }) => (
    <div>
        <label htmlFor={`payment-${name}`} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input
            type="text"
            id={`payment-${name}`}
            value={value}
            placeholder="0"
            inputMode="decimal"
            readOnly={readOnly}
            onChange={(e) => !readOnly && onChange(name, e.target.value)}
            className={`w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-500 ${readOnly ? 'bg-slate-600 cursor-not-allowed' : ''}`}
        />
    </div>
));


const BillingModal: React.FC<BillingModalProps> = ({ isOpen, onClose, onConfirm, customer, equipment, onTriggerProvisionalReceiptAction }) => {
  const [formState, setFormState] = useState<FormState>({
    relogioAtual: '',
    totalArrecadadoJukebox: '',
    descontoPartidas: '',
    aluguelPercentual: '',
    aluguelValor: '',
    saldo: '',
    quantidadePelucia: '',
    sobraPelucia: '',
    reposicaoPelucia: '',
    recebimentoEspecie: '',
    recebimentoPix: ''
  });
  const [paymentValues, setPaymentValues] = useState<PaymentState>({ 
    dinheiro: '', 
    pix: '', 
    desconto: '' 
  });
  const [error, setError] = useState<string | null>(null);
  const [mesaStep, setMesaStep] = useState(1);
  const [jukeboxStep, setJukeboxStep] = useState(1);
  const [gruaStep, setGruaStep] = useState(1);
  
  const isMonthlyFee = equipment.type === 'mesa' && equipment.billingType === 'monthly';

  useEffect(() => {
    if (isOpen) {
      const initialState: FormState = {
        relogioAtual: '',
        totalArrecadadoJukebox: '',
        descontoPartidas: '0',
        aluguelPercentual: String(equipment.aluguelPercentual || ''),
        aluguelValor: String(equipment.aluguelValor || '0'),
        saldo: '',
        quantidadePelucia: String(equipment.quantidadePelucia || ''),
        sobraPelucia: '',
        reposicaoPelucia: String(equipment.reposicaoPelucia || ''),
        recebimentoEspecie: '',
        recebimentoPix: '',
      };
      setFormState(initialState);
      setPaymentValues({ dinheiro: '', pix: '', desconto: '' });
      setError(null);
      setGruaStep(1);
      setMesaStep(1);
      setJukeboxStep(1);
    }
  }, [isOpen, equipment]);

  const calculation = useMemo(() => {
    let result: Partial<Billing> = {};
    const relogioAtual = safeParseFloat(formState.relogioAtual);
    const relogioAnterior = equipment.relogioAnterior || 0;

    const isInvalidReading = relogioAtual < relogioAnterior;
    
    const partidasJogadas = isInvalidReading ? 0 : relogioAtual - relogioAnterior;

    if (equipment.type === 'mesa') {
      if (equipment.billingType === 'monthly') {
          result = {
            valorTotal: equipment.monthlyFeeValue || 0,
            billingType: 'monthly',
            partidasJogadas: partidasJogadas,
            relogioAnterior: relogioAnterior,
            relogioAtual: relogioAtual,
          };
      } else { // 'perPlay'
        const descontoPartidas = safeParseFloat(formState.descontoPartidas);
        const partidasCobradas = Math.max(0, partidasJogadas - descontoPartidas);
        const valorFicha = equipment.valorFicha || 0;
        const valorBruto = partidasCobradas * valorFicha;
        
        let firmaPercent = 0;
        if (typeof equipment.parteFirma === 'number') {
            firmaPercent = equipment.parteFirma;
        } else if (typeof equipment.parteCliente === 'number') {
            firmaPercent = 100 - equipment.parteCliente;
        }
        firmaPercent = Math.max(0, Math.min(100, firmaPercent));

        const parteFirma = valorBruto * (firmaPercent / 100);
        const parteCliente = valorBruto - parteFirma;

        result = { 
            billingType: 'perPlay', 
            partidasJogadas,
            descontoPartidas, 
            partidasCobradas, 
            valorFicha, 
            valorBruto: parseFloat(valorBruto.toFixed(2)),
            parteFirma: parseFloat(parteFirma.toFixed(2)), 
            parteCliente: parseFloat(parteCliente.toFixed(2)),
            valorTotal: parseFloat(parteFirma.toFixed(2)),
        };
      }
    } else if (equipment.type === 'jukebox') {
        const valorBruto = safeParseFloat(formState.totalArrecadadoJukebox);

        let firmaPercent = 0;
        if (typeof equipment.porcentagemJukeboxFirma === 'number') {
            firmaPercent = equipment.porcentagemJukeboxFirma;
        } else if (typeof equipment.porcentagemJukeboxCliente === 'number') {
            firmaPercent = 100 - equipment.porcentagemJukeboxCliente;
        }
        firmaPercent = Math.max(0, Math.min(100, firmaPercent));

        const parteFirma = valorBruto * (firmaPercent / 100);
        const parteCliente = valorBruto - parteFirma;
        
        const relogioAtualJukebox = safeParseFloat(formState.relogioAtual);
        const partidasJogadasJukebox = (formState.relogioAtual !== '' && relogioAtualJukebox >= relogioAnterior) 
                                ? relogioAtualJukebox - relogioAnterior
                                : 0;

        result = { 
            valorBruto: parseFloat(valorBruto.toFixed(2)),
            parteFirma: parseFloat(parteFirma.toFixed(2)), 
            parteCliente: parseFloat(parteCliente.toFixed(2)),
            valorTotal: parseFloat(parteFirma.toFixed(2)),
            partidasJogadas: partidasJogadasJukebox
        };
    } else if (equipment.type === 'grua') {
      const saldoAutoCalculado = isInvalidReading ? 0 : relogioAtual - relogioAnterior;
      // If the user manually overrode the saldo, use that; otherwise use the auto-calculated value
      const saldoBruto = (formState.saldo !== '' && safeParseFloat(formState.saldo) !== saldoAutoCalculado)
          ? safeParseFloat(formState.saldo)
          : saldoAutoCalculado;
      
      let finalAluguelValor = safeParseFloat(formState.aluguelValor);
      
      if (equipment.aluguelPercentual != null && equipment.aluguelPercentual > 0) {
          finalAluguelValor = saldoBruto * (equipment.aluguelPercentual / 100);
      }
      
      const valorTotalFirma = saldoBruto - finalAluguelValor;

      result = { 
          partidasJogadas,
          saldo: parseFloat(saldoBruto.toFixed(2)),
          aluguelPercentual: equipment.aluguelPercentual,
          aluguelValor: parseFloat(finalAluguelValor.toFixed(2)),
          valorTotal: parseFloat(valorTotalFirma.toFixed(2)),
          recebimentoEspecie: safeParseFloat(formState.recebimentoEspecie),
          recebimentoPix: safeParseFloat(formState.recebimentoPix),
          sobraPelucia: safeParseFloat(formState.sobraPelucia),
          reposicaoPelucia: safeParseFloat(formState.reposicaoPelucia),
          quantidadePelucia: safeParseFloat(formState.quantidadePelucia),
      };
    }
    
    if (result.relogioAnterior === undefined) {
        result.relogioAnterior = relogioAnterior;
    }
    if (result.relogioAtual === undefined) {
        result.relogioAtual = relogioAtual;
    }

    return result;
  }, [formState, equipment]);
  
  const valorTotalParaFirma = useMemo(() => calculation.valorTotal || 0, [calculation]);
  
  const handleFormChange = useCallback((field: keyof FormState, value: string) => {
    setFormState(prev => {
        const newState = { ...prev, [field]: value };

        if (equipment.type === 'grua') {
            if (['sobraPelucia', 'quantidadePelucia'].includes(field)) {
                const quantidadeTotal = Math.round(safeParseFloat(newState.quantidadePelucia));
                const sobras = Math.round(safeParseFloat(newState.sobraPelucia));
                newState.reposicaoPelucia = String(Math.max(0, quantidadeTotal - sobras));
            }

            // Auto-calculate saldo only if relogioAtual changed
            if (field === 'relogioAtual') {
                const relogioAtualNum = safeParseFloat(newState.relogioAtual);
                const relogioAnteriorNum = equipment.relogioAnterior || 0;
                const saldoBruto = (relogioAtualNum >= relogioAnteriorNum) ? relogioAtualNum - relogioAnteriorNum : 0;
                newState.saldo = String(saldoBruto);
            }

            // Always update aluguelValor if saldo or aluguelPercentual changed
            const currentSaldo = safeParseFloat(newState.saldo);
            if (equipment.aluguelPercentual != null) {
                const aluguelValorNum = Math.round((currentSaldo * (equipment.aluguelPercentual / 100)) * 100) / 100;
                newState.aluguelValor = String(aluguelValorNum);
            }
            
            const valorTotalFirma = currentSaldo - safeParseFloat(newState.aluguelValor);
            
            if (field === 'recebimentoEspecie') {
                const recebimentoEspecieNum = safeParseFloat(value);
                const pixCalculado = Math.max(0, valorTotalFirma - recebimentoEspecieNum);
                // Only auto-fill PIX if PIX field is empty
                if (!newState.recebimentoPix || newState.recebimentoPix === '0') {
                    newState.recebimentoPix = String(parseFloat(pixCalculado.toFixed(2)));
                }
            } else if (field === 'recebimentoPix') {
                const recebimentoPixNum = safeParseFloat(value);
                const especieCalculado = Math.max(0, valorTotalFirma - recebimentoPixNum);
                // Only auto-fill Especie if Especie field is empty
                if (!newState.recebimentoEspecie || newState.recebimentoEspecie === '0') {
                    newState.recebimentoEspecie = String(parseFloat(especieCalculado.toFixed(2)));
                }
            }
        }
        
        return newState;
    });
  }, [equipment]);

  const handlePaymentChange = useCallback((field: keyof PaymentState, value: string) => {
    setPaymentValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const financialSummary = useMemo(() => {
    const vTotal = valorTotalParaFirma;
    const vDinheiro = safeParseFloat(paymentValues.dinheiro);
    const vPix = safeParseFloat(paymentValues.pix);
    const vDesconto = safeParseFloat(paymentValues.desconto);
    
    const totalPago = vDinheiro + vPix;
    const valorNecessario = vTotal - vDesconto;
    const saldoTransacao = totalPago - valorNecessario;
    
    // If saldoTransacao is negative, it adds to debt. If positive, it pays off old debt.
    const novoSaldoDivida = (customer.debtAmount || 0) - saldoTransacao;
    
    return {
        totalPago,
        novoSaldoDivida,
        saldoTransacao,
        vDesconto
    };
  }, [paymentValues.dinheiro, paymentValues.pix, paymentValues.desconto, valorTotalParaFirma, customer.debtAmount]);

  const generateBillingObject = useCallback((): Billing | null => {
    const relogioAtual = safeParseFloat(formState.relogioAtual);

    if (equipment.type !== 'jukebox' && relogioAtual < equipment.relogioAnterior) {
      return null; // Safeguard for non-jukebox
    }
    const baseBillingData = {
        id: uuidv4(),
        customerId: customer.id,
        customerName: customer.name,
        equipmentId: equipment.id,
        equipmentType: equipment.type,
        equipmentNumero: equipment.numero,
        relogioAnterior: equipment.relogioAnterior,
        relogioAtual: Math.round(relogioAtual),
        settledAt: new Date(),
        ...calculation,
        valorTotal: calculation.valorTotal || 0,
        partidasJogadas: calculation.partidasJogadas || 0,
    };

    if (equipment.type === 'grua') {
        const recebimentoEspecie = safeParseFloat(formState.recebimentoEspecie);
        const recebimentoPix = safeParseFloat(formState.recebimentoPix);
        let paymentMethod: Billing['paymentMethod'] = 'dinheiro';
        if (recebimentoEspecie > 0 && recebimentoPix > 0) {
            paymentMethod = 'misto';
        } else if (recebimentoPix > 0) {
            paymentMethod = 'pix';
        }
        const totalFirma = calculation.valorTotal || 0;
        const totalRecebido = recebimentoEspecie + recebimentoPix;
        const valorGorjeta = totalRecebido > totalFirma ? parseFloat((totalRecebido - totalFirma).toFixed(2)) : 0;

        const finalBilling: Billing = {
            ...baseBillingData,
            paymentMethod,
            recebimentoEspecie,
            recebimentoPix,
            valorGorjeta: valorGorjeta > 0 ? valorGorjeta : undefined,
        };
        return finalBilling;
      } else {
        const valorPagoDinheiro = safeParseFloat(paymentValues.dinheiro);
        const valorPagoPix = safeParseFloat(paymentValues.pix);
        const valorBonus = safeParseFloat(paymentValues.desconto);
        
        const totalPago = valorPagoDinheiro + valorPagoPix;
        const totalParaFirma = (calculation.valorTotal || 0) - valorBonus;
        
        const difference = totalPago - totalParaFirma;
        const valorDividaPaga = difference > 0 ? parseFloat(difference.toFixed(2)) : 0;
        const valorDebitoNegativo = difference < 0 ? parseFloat(Math.abs(difference).toFixed(2)) : 0;

        const methodsUsed: ('dinheiro' | 'pix' | 'debito_negativo')[] = [];
        if (valorPagoDinheiro > 0) methodsUsed.push('dinheiro');
        if (valorPagoPix > 0) methodsUsed.push('pix');
        if (valorDebitoNegativo > 0) methodsUsed.push('debito_negativo');

        let paymentMethod: Billing['paymentMethod'] = 'dinheiro'; 
        if (methodsUsed.length > 1) {
            paymentMethod = 'misto';
        } else if (methodsUsed.length === 1) {
            paymentMethod = methodsUsed[0];
        }

        const finalBilling: Billing = {
            ...baseBillingData,
            paymentMethod,
        };
        
        if (valorPagoDinheiro > 0) finalBilling.valorPagoDinheiro = valorPagoDinheiro;
        if (valorPagoPix > 0) finalBilling.valorPagoPix = valorPagoPix;
        if (valorDebitoNegativo > 0) finalBilling.valorDebitoNegativo = valorDebitoNegativo;
        if (valorDividaPaga > 0) finalBilling.valorDividaPaga = valorDividaPaga;
        if (valorBonus > 0) finalBilling.valorBonus = valorBonus;

        return finalBilling;
    }
  }, [formState, calculation, equipment, customer, paymentValues]);

  const validateAndProceed = useCallback(() => {
    if(equipment.type === 'jukebox') return true;

    if (!formState.relogioAtual && formState.relogioAtual !== '0') {
      setError("Nenhuma leitura inserida. Preencha o campo de Leitura Atual.");
      return false;
    }
    const relogioAtual = safeParseFloat(formState.relogioAtual);
    if (relogioAtual < equipment.relogioAnterior) {
      setError(`Leitura atual (${relogioAtual}) não pode ser menor que a anterior (${equipment.relogioAnterior}).`);
      return false;
    }
    setError(null);
    return true;
  }, [formState.relogioAtual, equipment.relogioAnterior, equipment.type]);

  const handleProvisionalAction = () => {
    if (!validateAndProceed()) return;
    const billing = generateBillingObject();
    if (billing) {
        onTriggerProvisionalReceiptAction(billing, () => setMesaStep(2));
    }
  };
  
  const handleGoToPayment = () => {
    if (validateAndProceed()) {
        const amountToPay = valorTotalParaFirma;
        setPaymentValues(prev => ({ ...prev, dinheiro: amountToPay > 0 ? String(amountToPay) : '', pix: '', desconto: '' }));
        setMesaStep(2);
    }
  };

  const handleWaitForPayment = () => {
    if (!validateAndProceed()) return;
  
    const totalFirma = calculation.valorTotal || 0;
    const bonusDesconto = safeParseFloat(paymentValues.bonus);
  
    const billing: Billing = {
      id: uuidv4(),
      customerId: customer.id,
      customerName: customer.name,
      equipmentId: equipment.id,
      equipmentType: equipment.type,
      equipmentNumero: equipment.numero,
      relogioAnterior: equipment.relogioAnterior,
      relogioAtual: Math.round(safeParseFloat(formState.relogioAtual)),
      settledAt: new Date(), 
      ...calculation,
      partidasJogadas: calculation.partidasJogadas || 0,
      valorTotal: totalFirma,
      paymentMethod: 'pending_payment',
      valorBonus: safeParseFloat(paymentValues.desconto) > 0 ? safeParseFloat(paymentValues.desconto) : undefined,
    };
  
    onConfirm(billing);
  };

  const validateJukeboxStep1 = useCallback(() => {
    const valorBruto = safeParseFloat(formState.totalArrecadadoJukebox);
    if (valorBruto <= 0) {
      setError("O total arrecadado deve ser maior que zero.");
      return false;
    }
    setError(null);
    return true;
  }, [formState.totalArrecadadoJukebox]);

  const handleJukeboxNextStep = () => {
      if (validateJukeboxStep1()) {
          const amountToPay = valorTotalParaFirma;
          setPaymentValues(prev => ({ ...prev, dinheiro: amountToPay > 0 ? String(amountToPay) : '', pix: '', desconto: '' }));
          setJukeboxStep(2);
      }
  };

  const handleFinalize = () => {
    if (equipment.type === 'jukebox') {
        if (!validateJukeboxStep1()) return;
        const relogioAtual = safeParseFloat(formState.relogioAtual);
        if (isNaN(relogioAtual) || formState.relogioAtual.trim() === '') {
            setError("Por favor, insira a Leitura Atual para confirmação.");
            return;
        }
        if (relogioAtual < equipment.relogioAnterior) {
            setError(`Leitura atual (${relogioAtual}) não pode ser menor que a anterior (${equipment.relogioAnterior}).`);
            return;
        }
    } else {
        if (!validateAndProceed()) return;
    }

    if (equipment.type === 'grua') {
        // Allow any amount (more or less than firma total)
    } else if (error) {
      return;
    }

    const billing = generateBillingObject();
    if (billing) onConfirm(billing);
  };
  
  const handleGruaNextStep = useCallback(() => {
    if (gruaStep === 1) {
        if (!validateAndProceed()) return;
        setGruaStep(2); // Go to summary
    } else if (gruaStep === 2) {
        // Pre-fill PIX payment when moving to payment step
        const totalFirma = calculation.valorTotal || 0;
        setFormState(prev => ({
            ...prev,
            recebimentoEspecie: '', // Cash field starts empty
            recebimentoPix: String(totalFirma > 0 ? totalFirma.toFixed(2) : '0') // PIX is pre-filled
        }));
        setGruaStep(3); // Go to payment
    } else if (gruaStep === 3) {
        const recebimentoEspecie = safeParseFloat(formState.recebimentoEspecie);
        const recebimentoPix = safeParseFloat(formState.recebimentoPix);
        const totalRecebido = recebimentoEspecie + recebimentoPix;
        
        setError('');
        setGruaStep(4); // Go to plush toys
    }
  }, [gruaStep, validateAndProceed, formState, calculation, valorTotalParaFirma]);
  
  const handleGruaPrevStep = useCallback(() => {
    setError(''); // Clear errors when navigating back
    setGruaStep(prev => Math.max(1, prev - 1));
  }, []);

  if (!isOpen) return null;

  const isGrua = equipment.type === 'grua';
  const isJukebox = equipment.type === 'jukebox';
  const isReadingInvalid = (safeParseFloat(formState.relogioAtual)) < equipment.relogioAnterior;
  const showMesaStep2Layout = !isGrua && !isJukebox && mesaStep === 2;

  const renderJukeboxStep1 = () => (
    <div className="space-y-4">
        <FormField 
            label="Total Arrecadado na Jukebox (R$)" 
            name="totalArrecadadoJukebox" 
            value={formState.totalArrecadadoJukebox} 
            type="text" 
            inputMode="decimal"
            equipmentId={equipment.id} 
            onChange={(field, val) => handleFormChange(field, val)} 
            autoFocus 
        />
        {formState.totalArrecadadoJukebox && (
            <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700 rounded-lg space-y-2 text-sm animate-fade-in">
                <h4 className="text-md font-bold text-white mb-3 text-center">Resumo do Rateio</h4>
                <div className="flex justify-between font-bold text-lg text-white">
                    <span>VALOR BRUTO TOTAL:</span>
                    <span className="font-mono">R$ {(calculation.valorBruto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <hr className="border-dashed border-slate-600 my-2" />
                <div className="flex justify-between text-slate-300">
                    <span>Parte Cliente ({100 - (equipment.porcentagemJukeboxFirma || 0)}%):</span>
                    <span className="font-mono">R$ {(calculation.parteCliente || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-lime-400">
                    <span>Parte Firma ({equipment.porcentagemJukeboxFirma}%):</span>
                    <span className="font-mono">R$ {(calculation.parteFirma || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            </div>
        )}
    </div>
  );

  const renderJukeboxStep2 = () => (
      <div className="space-y-4 animate-fade-in">
          <div className="flex gap-3 mb-4">
              <div className="flex-1 p-3 bg-slate-900/50 rounded-lg border border-lime-500/20 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Entrada Hoje</p>
                  <p className="text-xl font-black text-lime-400 font-mono">R$ {financialSummary.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="flex-1 p-3 bg-slate-900/50 rounded-lg border border-red-500/20 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Saldo Dívida</p>
                  <p className={`text-xl font-black font-mono ${financialSummary.novoSaldoDivida > 0 ? 'text-red-400' : 'text-slate-400'}`}>R$ {Math.max(0, financialSummary.novoSaldoDivida).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
          </div>

          <div>
              <h4 className="text-md font-bold text-lime-400">Leitura Anterior: {equipment.relogioAnterior}</h4>
              <FormField 
                  label="Leitura Atual (Confirmação)" 
                  name="relogioAtual" 
                  value={formState.relogioAtual} 
                  type="text" 
                  inputMode="numeric"
                  equipmentId={equipment.id}
                  isReadingInvalid={isReadingInvalid && !!formState.relogioAtual}
                  onChange={(field, val) => handleFormChange(field, val)}
              />
          </div>
          <hr className="border-slate-700" />
          <div className="grid grid-cols-3 gap-2">
            <PaymentField label="Dinheiro (R$)" name="dinheiro" value={paymentValues.dinheiro} onChange={handlePaymentChange} />
            <PaymentField label="PIX (R$)" name="pix" value={paymentValues.pix} onChange={handlePaymentChange} />
            <PaymentField label="Desconto (R$)" name="desconto" value={paymentValues.desconto} onChange={handlePaymentChange} />
          </div>
      </div>
  );
  
  const renderGruaStep1_Reading = () => {
    const saldoCalculado = (safeParseFloat(formState.relogioAtual) >= (equipment.relogioAnterior || 0))
        ? safeParseFloat(formState.relogioAtual) - (equipment.relogioAnterior || 0)
        : 0;
    return (
    <div className="space-y-4">
      <h4 className="text-md font-bold text-lime-400">Leitura Anterior: {equipment.relogioAnterior}</h4>
      <FormField label="Leitura Atual" name="relogioAtual" value={formState.relogioAtual} type="text" inputMode="numeric" equipmentId={equipment.id} isReadingInvalid={isReadingInvalid} onChange={(field, val) => handleFormChange(field, val)} autoFocus/>
      {formState.relogioAtual !== '' && !isReadingInvalid && (
        <div className="space-y-2">
          <div className="p-3 bg-slate-900/50 rounded-lg flex justify-between items-center text-sm">
            <span className="text-slate-400">Saldo Calculado (Atual - Anterior):</span>
            <span className="font-mono font-bold text-white text-lg">R$ {saldoCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Ajustar Saldo Bruto (opcional)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder={String(saldoCalculado)}
              value={formState.saldo !== String(saldoCalculado) && formState.saldo !== '' ? formState.saldo : ''}
              onChange={(e) => handleFormChange('saldo', e.target.value)}
              className="w-full bg-slate-700 border border-amber-500/50 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
            />
            <p className="text-xs text-slate-500 mt-1">Deixe em branco para usar o valor calculado automaticamente.</p>
          </div>
        </div>
      )}
    </div>
  );
  };
  
  const renderGruaStep2_Summary = () => (
    <div className="flex flex-col items-center justify-center text-center p-4">
      <h3 className="text-xl text-slate-400 mb-2">Demonstrativo para o Cliente</h3>
      <p className="text-2xl font-bold text-white">{customer.name}</p>
      <p className="text-lg text-slate-300 mb-8">Grua Nº {equipment.numero}</p>
      
      <div className="w-full space-y-6">
        <div className="bg-slate-900/50 p-4 rounded-lg">
          <p className="text-lg text-slate-400">Saldo Bruto (Total Arrecadado)</p>
          <p className="text-5xl font-mono font-black text-white">
            R$ {(calculation.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-slate-900/50 p-4 rounded-lg">
          <p className="text-lg text-slate-400">Aluguel (Parte do Cliente)</p>
          <p className="text-4xl font-mono font-bold text-amber-400">
            - R$ {(calculation.aluguelValor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
  
        <div className="bg-lime-900/50 p-6 rounded-lg border-2 border-lime-500">
          <p className="text-xl font-bold text-lime-300">TOTAL DA FIRMA</p>
          <p className="text-6xl font-mono font-black text-lime-400">
            R$ {(calculation.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );

  const renderGruaStep3_Payment = () => (
    <div className="space-y-4">
        <h4 className="text-md font-bold text-lime-400">Recebimento</h4>
        <div className="p-4 bg-slate-900/50 rounded-lg text-center">
            <p className="text-slate-400 text-sm">Total para a Firma</p>
            <p className="text-lime-400 font-mono font-bold text-2xl">R$ {valorTotalParaFirma.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <FormField label="Recebimento em Espécie (R$)" name="recebimentoEspecie" value={formState.recebimentoEspecie} type="text" inputMode="decimal" equipmentId={equipment.id} onChange={(field, val) => handleFormChange(field, val)} />
        <FormField label="Recebimento em PIX (R$)" name="recebimentoPix" value={formState.recebimentoPix} type="text" inputMode="decimal" equipmentId={equipment.id} onChange={(field, val) => handleFormChange(field, val)} />
    </div>
  );

  const renderGruaStep4_Plush = () => (
    <div className="space-y-4">
        <h4 className="text-md font-bold text-lime-400">Controle de Pelúcias</h4>
        <FormField label="Qtd. Pelúcias (Capacidade)" name="quantidadePelucia" value={formState.quantidadePelucia} type="text" inputMode="numeric" equipmentId={equipment.id} onChange={(field, val) => handleFormChange(field, val)} />
        <FormField label="Sobra de Pelúcias" name="sobraPelucia" value={formState.sobraPelucia} type="text" inputMode="numeric" equipmentId={equipment.id} onChange={(field, val) => handleFormChange(field, val)} />
        <FormField label="Reposição de Pelúcias" name="reposicaoPelucia" value={formState.reposicaoPelucia} type="text" inputMode="numeric" equipmentId={equipment.id} onChange={(field, val) => handleFormChange(field, val)} readOnly />
    </div>
  );

  const renderMesaStep1 = () => {
    const parteClientePercent = 100 - (equipment.parteFirma || 100);
    return (
      <div className="space-y-4">
        <h4 className="text-md font-bold text-lime-400">Leitura Anterior: {equipment.relogioAnterior}</h4>
        <FormField label="Leitura Atual" name="relogioAtual" value={formState.relogioAtual} type="text" inputMode="numeric" equipmentId={equipment.id} isReadingInvalid={isReadingInvalid} onChange={(field, val) => handleFormChange(field, val)} autoFocus />
        {!isMonthlyFee && <FormField label="Partidas de Desconto" name="descontoPartidas" value={formState.descontoPartidas} type="text" inputMode="numeric" equipmentId={equipment.id} onChange={(field, val) => handleFormChange(field, val)} />}
        {formState.relogioAtual && !isReadingInvalid && (
            <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700 rounded-lg space-y-2 text-sm animate-fade-in">
                <h4 className="text-md font-bold text-white mb-3 text-center">Resumo do Rateio</h4>
                {isMonthlyFee ? (
                     <div className="flex justify-between font-bold text-lg text-lime-400">
                        <span>MENSALIDADE FIXA:</span>
                        <span className="font-mono">R$ {(calculation.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between font-bold text-lg text-white">
                            <span>VALOR BRUTO TOTAL:</span>
                            <span className="font-mono">R$ {(calculation.valorBruto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <hr className="border-dashed border-slate-600 my-2" />
                        <div className="flex justify-between text-slate-300">
                            <span>Partidas Jogadas:</span>
                            <span className="font-mono">{calculation.partidasJogadas || 0}</span>
                        </div>
                         <div className="flex justify-between text-slate-300">
                            <span>Partidas Cobradas:</span>
                            <span className="font-mono">{calculation.partidasCobradas || 0}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                            <span>Parte Cliente ({parteClientePercent}%):</span>
                            <span className="font-mono">R$ {(calculation.parteCliente || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lime-400">
                            <span>Parte Firma ({equipment.parteFirma}%):</span>
                            <span className="font-mono">R$ {(calculation.parteFirma || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </>
                )}
            </div>
        )}
      </div>
  )};

  const renderMesaStep2 = () => (
    <div className="space-y-4 animate-fade-in">
        <div className="flex gap-3 mb-2">
            <div className="flex-1 p-3 bg-slate-900/50 rounded-lg border border-lime-500/20 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Entrada Hoje</p>
                <p className="text-xl font-black text-lime-400 font-mono">R$ {financialSummary.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="flex-1 p-3 bg-slate-900/50 rounded-lg border border-red-500/20 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Saldo Dívida</p>
                <p className={`text-xl font-black font-mono ${financialSummary.novoSaldoDivida > 0 ? 'text-red-400' : 'text-slate-400'}`}>R$ {Math.max(0, financialSummary.novoSaldoDivida).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
            <PaymentField label="Dinheiro (R$)" name="dinheiro" value={paymentValues.dinheiro} onChange={handlePaymentChange} />
            <PaymentField label="PIX (R$)" name="pix" value={paymentValues.pix} onChange={handlePaymentChange} />
            <PaymentField label="Desconto (R$)" name="desconto" value={paymentValues.desconto} onChange={handlePaymentChange} />
        </div>
        
        <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-700/50 text-center">
            <p className="text-xs text-slate-500">Valor da Cobrança: <span className="text-slate-300 font-bold">R$ {valorTotalParaFirma.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
            <p className="text-xs text-slate-500">Dívida Anterior: <span className="text-slate-300 font-bold">R$ {(customer.debtAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
        </div>
    </div>
  );


  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-modal-title"
    >
      <div className={`bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg border border-slate-700 animate-fade-in-up max-h-[90vh] flex flex-col ${isGrua && gruaStep === 2 ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="p-6 border-b border-slate-700 flex justify-between items-start">
            <div>
                <h2 id="billing-modal-title" className="text-2xl font-bold text-white capitalize">
                    COBRANÇA {equipment.type} {isGrua ? `(Etapa ${gruaStep}/4)` : ''}
                </h2>
                <p className="text-slate-400 break-words">{customer.name} - {equipment.type} {equipment.numero}</p>
            </div>
             <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-white"><XIcon className="w-6 h-6"/></button>
        </div>
        
        <div className={`p-6 overflow-y-auto ${isGrua && gruaStep === 2 ? 'flex-grow flex items-center justify-center' : ''}`}>
            {error && <div className="mb-4 text-center text-sm p-3 rounded-md bg-red-900/50 text-red-300 flex items-center gap-2"><AlertIcon className="w-5 h-5"/>{error}</div>}
            
            {isGrua && (
                <>
                    {gruaStep === 1 && renderGruaStep1_Reading()}
                    {gruaStep === 2 && renderGruaStep2_Summary()}
                    {gruaStep === 3 && renderGruaStep3_Payment()}
                    {gruaStep === 4 && renderGruaStep4_Plush()}
                </>
            )}

            {isJukebox && (
                <>
                    {jukeboxStep === 1 && renderJukeboxStep1()}
                    {jukeboxStep === 2 && renderJukeboxStep2()}
                </>
            )}

            {!isGrua && !isJukebox && (
                <>
                    {mesaStep === 1 && renderMesaStep1()}
                    {mesaStep === 2 && renderMesaStep2()}
                </>
            )}

        </div>
        
        <div className="p-6 bg-slate-800/50 rounded-b-lg flex flex-wrap justify-between items-center gap-3">
             {showMesaStep2Layout ? (
                <button onClick={() => setMesaStep(1)} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500">Voltar</button>
             ) : isJukebox && jukeboxStep === 2 ? (
                <button onClick={() => setJukeboxStep(1)} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500">Voltar</button>
             ) : isGrua && gruaStep > 1 ? (
                <button onClick={handleGruaPrevStep} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500">Voltar</button>
             ) : <div />}
             
             <div className="flex flex-wrap gap-3 justify-end flex-grow">
                {!isGrua && !isJukebox && mesaStep === 1 && <button type="button" onClick={handleProvisionalAction} className="bg-sky-600 text-white font-bold py-2 px-4 rounded-md hover:bg-sky-500">Recibo Provisório</button>}
                {!isGrua && !isJukebox && mesaStep === 1 && <button type="button" onClick={handleGoToPayment} className="bg-lime-500 text-white font-bold py-2 px-4 rounded-md hover:bg-lime-600 flex-grow">Ir para Pagamento &rarr;</button>}
                
                {showMesaStep2Layout && <button type="button" onClick={handleWaitForPayment} className="bg-amber-600 text-white font-bold py-2 px-4 rounded-md hover:bg-amber-500">Pgto. Pendente</button>}
                {showMesaStep2Layout && <button type="button" onClick={handleFinalize} className="bg-lime-500 text-white font-bold py-2 px-4 rounded-md hover:bg-lime-600">Finalizar</button>}

                {isJukebox && jukeboxStep === 1 && <button type="button" onClick={handleJukeboxNextStep} className="bg-lime-500 text-white font-bold py-2 px-4 rounded-md hover:bg-lime-600 flex-grow">Ir para Confirmação &rarr;</button>}
                {isJukebox && jukeboxStep === 2 && <button type="button" onClick={handleWaitForPayment} className="bg-amber-600 text-white font-bold py-2 px-4 rounded-md hover:bg-amber-500">Pgto. Pendente</button>}
                {isJukebox && jukeboxStep === 2 && <button type="button" onClick={handleFinalize} className="bg-lime-500 text-white font-bold py-2 px-4 rounded-md hover:bg-lime-600">Finalizar</button>}

                {isGrua && gruaStep < 4 && <button type="button" onClick={handleGruaNextStep} className="bg-lime-500 text-white font-bold py-2 px-4 rounded-md hover:bg-lime-600 flex-grow">{gruaStep === 2 ? 'Continuar para Pagamento' : 'Avançar'} &rarr;</button>}
                {isGrua && gruaStep === 4 && <button type="button" onClick={handleFinalize} className="bg-lime-500 text-white font-bold py-2 px-4 rounded-md hover:bg-lime-600">Finalizar</button>}
             </div>
        </div>
      </div>
       <style>{`
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default BillingModal;
