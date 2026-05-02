
import { Timestamp } from "firebase/firestore";

export interface Customer {
    id: string;
    name: string;
    cidade: string;
    bairro: string;
    endereco: string;
    numero: string;
    telefone: string;
    cpfRg?: string;
    linhaNumero: string;
    estado?: string;
    latitude?: number;
    longitude?: number;
    createdAt: Date;
    equipment: Equipment[];
    debtAmount: number;
    lastVisitedAt: Date | null;
    pendingPayment?: boolean;
    pontoReferencia?: string;
}

export interface Equipment {
    id: string;
    type: 'mesa' | 'jukebox' | 'grua';
    numero: string;
    relogioAnterior: number;
    valorFicha?: number;
    billingType?: 'perPlay' | 'monthly';
    monthlyFeeValue?: number;
    parteFirma?: number;
    parteCliente?: number;
    relogioNumero?: string;
    aluguelPercentual?: number | null;
    aluguelValor?: number;
    saldo?: number;
    reposicaoPelucia?: number;
    recebimentoEspecie?: number;
    recebimentoPix?: number;
    porcentagemJukeboxFirma?: number;
    porcentagemJukeboxCliente?: number;
    quantidadePelucia?: number;
    serialNumber?: string;
}

export interface Billing {
    id: string;
    customerId: string;
    customerName: string;
    equipmentId: string;
    equipmentType: 'mesa' | 'jukebox' | 'grua';
    relogioAnterior: number;
    relogioAtual: number;
    totalFichas?: number;
    valorFicha?: number;
    billingType?: 'perPlay' | 'monthly';
    totalBruto?: number;
    comissaoPercentual?: number;
    valorComissao?: number;
    totalLiquido?: number;
    valorRecebido?: number;
    valorDebitoAdicionado?: number;
    valorDebitoNegativo?: number;
    paymentMethod: 'dinheiro' | 'pix' | 'cartao' | 'misto' | 'pending_payment' | 'debito_negativo';
    amountPaidDinheiro?: number;
    amountPaidPix?: number;
    amountPaidCartao?: number;
    settledAt: Date;
    observacao?: string;
    valorTotal: number;
    valorBonus?: number;
    partidasJogadas?: number;
    valorPagoDinheiro?: number;
    valorPagoPix?: number;
    valorGorjeta?: number;
    parteFirma?: number;
    parteCliente?: number;
    valorBruto?: number;
    descontoPartidas?: number;
    partidasCobradas?: number;
    aluguelPercentual?: number | null;
    aluguelValor?: number;
    saldo?: number;
    recebimentoEspecie?: number;
    recebimentoPix?: number;
    sobraPelucia?: number;
    reposicaoPelucia?: number;
    quantidadePelucia?: number;
    equipmentNumero?: string;
    valorDividaPaga?: number;
}

export interface Expense {
    id: string;
    description: string;
    amount: number;
    category: 'mesa' | 'jukebox' | 'grua' | 'geral' | 'abastecimento' | 'manutencao' | 'alimentacao' | 'pecas' | 'outros';
    date: Date;
}

export interface DebtPayment {
    id: string;
    customerId: string;
    customerName: string;
    amountPaid: number;
    paidAt: Date;
    paymentMethod: 'dinheiro' | 'pix' | 'cartao' | 'misto';
    amountPaidDinheiro?: number;
    amountPaidPix?: number;
    amountPaidCartao?: number;
    equipmentType: 'mesa' | 'jukebox' | 'grua';
    billingId?: string;
}

export interface Warning {
    id: string;
    customerId: string;
    customerName: string;
    message: string;
    level: 'low' | 'medium' | 'high' | 'critical';
    createdAt: Date;
    isResolved: boolean;
}

export interface Route {
    id: string;
    name: string;
    customerIds: string[];
    createdAt: Date;
}

export type View = 'DASHBOARD' | 'CLIENTES' | 'COBRANCAS' | 'DESPESAS' | 'ROTAS' | 'RELATORIOS' | 'CONFIGURACOES' | 'INDUSTRIAL';

export type Theme = 'light' | 'dark';

export interface SavedUser {
    email: string;
    pass?: string; 
}

export interface PixKey {
    id: string;
    name: string;
    key: string;
    isDefault: boolean;
}

export interface UserProfile {
    id: string;
    email: string;
    createdAt: Date;
    privacyPinHash: string;
    pixKeys?: PixKey[];
}
