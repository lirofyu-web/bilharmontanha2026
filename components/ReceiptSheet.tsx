
// components/ReceiptSheet.tsx
import React from 'react';
import { Billing } from '../types';
import PixQrCode from './PixQrCode';

interface ReceiptSheetProps {
  billing: Billing;
  isProvisional?: boolean;
  qrCodeDataUrl?: string; // For SSR/PDF printing
  pixKeyName?: string;
  previousDebt?: number;
}

const ReceiptRow: React.FC<{label: string, value: string | number}> = ({ label, value }) => (
    <div className="receipt-row">
      <span className="label">{label}</span>
      <span className="filler"></span>
      <span className="value">{value}</span>
    </div>
);

const ReceiptSheet: React.FC<ReceiptSheetProps> = ({ billing, isProvisional, qrCodeDataUrl, pixKeyName, previousDebt }) => {
    const isMesa = billing.equipmentType === 'mesa';
    const isGrua = billing.equipmentType === 'grua';
    
    const paymentMethodText = {
        pix: 'PIX',
        dinheiro: 'DINHEIRO',
        debito_negativo: 'NEGATIVO',
        misto: 'MISTO',
    };

    const formatCurrency = (value: number | undefined) => (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatCurrencyFicha = (value: number | undefined) => (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

    const renderGruaDetails = () => (
        <>
            <p className="font-bold">EQUIPAMENTO: GRUA {billing.equipmentNumero}</p>
            <ReceiptRow label="Leitura Anterior:" value={billing.relogioAnterior} />
            <ReceiptRow label="Leitura Atual:" value={billing.relogioAtual} />
            <hr className="border-dashed border-black my-2" />
            <ReceiptRow label="SALDO:" value={`R$ ${formatCurrency(billing.saldo)}`} />
            <ReceiptRow label="Recebido Espécie:" value={`R$ ${formatCurrency(billing.recebimentoEspecie)}`} />
            <ReceiptRow label="Recebido PIX:" value={`R$ ${formatCurrency(billing.recebimentoPix)}`} />
            <hr className="border-dashed border-black my-2" />
            <ReceiptRow label="Qtd. Pelúcias (Capacidade):" value={billing.quantidadePelucia || 0} />
            <ReceiptRow label="Sobra de Pelúcias:" value={billing.sobraPelucia || 0} />
            <ReceiptRow label="Reposição de Pelúcias:" value={billing.reposicaoPelucia || 0} />
            <hr className="border-dashed border-black my-2" />
            <ReceiptRow label="ALUGUEL (PAGO AO CLIENTE):" value={`R$ ${formatCurrency(billing.aluguelValor)}`} />
            {billing.valorDividaPaga && billing.valorDividaPaga > 0 && (
                <ReceiptRow label="PAGAMENTO DE DÍVIDA:" value={`+ R$ ${formatCurrency(billing.valorDividaPaga)}`} />
            )}
            <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t border-dashed border-black">
                <span>TOTAL RECEBIDO:</span>
                <span>R$ {formatCurrency((billing.valorTotal || 0) + (billing.valorGorjeta || 0) + (billing.valorDividaPaga || 0))}</span>
            </div>
        </>
    );

    const renderMesaJukeboxDetails = () => {
        const debtPaid = billing.valorDividaPaga || 0;
        const finalFirmaValue = (billing.valorTotal || 0) - (billing.valorBonus || 0) + (billing.valorGorjeta || 0) + debtPaid;

        if (isMesa && billing.billingType === 'monthly') {
            return (
                <>
                    <p className="font-bold">EQUIPAMENTO: MESA {billing.equipmentNumero} (MENSAL)</p>
                    <hr className="border-dashed border-black my-2" />
                    <ReceiptRow label="Partidas Jogadas (Período):" value={billing.partidasJogadas} />
                    {billing.valorBonus && billing.valorBonus > 0 ? (
                        <>
                            <ReceiptRow label="Subtotal (Firma):" value={`R$ ${formatCurrency(billing.valorTotal)}`} />
                            <ReceiptRow label="Desconto / Bônus:" value={`- R$ ${formatCurrency(billing.valorBonus)}`} />
                            {debtPaid > 0 && <ReceiptRow label="Pagamento de Dívida:" value={`+ R$ ${formatCurrency(debtPaid)}`} />}
                            <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t border-dashed border-black">
                                <span>TOTAL RECEBIDO:</span>
                                <span>R$ {formatCurrency(finalFirmaValue)}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            {debtPaid > 0 && <ReceiptRow label="Pagamento de Dívida:" value={`+ R$ ${formatCurrency(debtPaid)}`} />}
                            <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t border-dashed border-black">
                                <span>TOTAL RECEBIDO:</span>
                                <span>R$ {formatCurrency(finalFirmaValue)}</span>
                            </div>
                        </>
                    )}
                </>
            );
        }
        
        return (
            <>
                <p className="font-bold">EQUIPAMENTO: {isMesa ? `MESA ${billing.equipmentNumero}` : `JUKEBOX ${billing.equipmentNumero}`}</p>
                <ReceiptRow label="Leitura Anterior:" value={billing.relogioAnterior} />
                <ReceiptRow label="Leitura Atual:" value={billing.relogioAtual} />
                
                {isMesa && (
                    <>
                        <hr className="border-dashed border-black my-2" />
                        <ReceiptRow label="Partidas Jogadas:" value={billing.partidasJogadas} />
                        <ReceiptRow label="Partidas Desconto:" value={billing.descontoPartidas || 0} />
                        <ReceiptRow label="Partidas Cobradas:" value={billing.partidasCobradas || 0} />
                        <ReceiptRow label="Valor Ficha:" value={`R$ ${formatCurrencyFicha(billing.valorFicha)}`} />
                    </>
                )}
                
                <hr className="border-dashed border-black my-2" />
                <ReceiptRow label="Valor Bruto:" value={`R$ ${formatCurrency(billing.valorBruto)}`} />
                <ReceiptRow label="Parte Cliente:" value={`R$ ${formatCurrency(billing.parteCliente)}`} />
                
                {billing.valorBonus && billing.valorBonus > 0 ? (
                    <>
                        <ReceiptRow label="Subtotal (Firma):" value={`R$ ${formatCurrency(billing.valorTotal)}`} />
                        <ReceiptRow label="Desconto / Bônus:" value={`- R$ ${formatCurrency(billing.valorBonus)}`} />
                        {debtPaid > 0 && <ReceiptRow label="Pagamento de Dívida:" value={`+ R$ ${formatCurrency(debtPaid)}`} />}
                        <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t border-dashed border-black">
                            <span>TOTAL RECEBIDO:</span>
                            <span>R$ {formatCurrency(finalFirmaValue)}</span>
                        </div>
                    </>
                ) : (
                    <>
                        {debtPaid > 0 && <ReceiptRow label="Pagamento de Dívida:" value={`+ R$ ${formatCurrency(debtPaid)}`} />}
                        <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t border-dashed border-black">
                            <span>TOTAL RECEBIDO:</span>
                            <span>R$ {formatCurrency(finalFirmaValue)}</span>
                        </div>
                    </>
                )}
            </>
        );
    };

    return (
        <div style={{ fontFamily: '\'Courier New\', Courier, monospace' }} className="text-base">
            <div className="header text-center mb-4">
                <h3 className="font-black text-xl">MONTANHA BILHAR & JUKEBOX</h3>
                <p className="font-bold text-base">{isProvisional ? 'DEMONSTRATIVO DE COBRANÇA' : 'ACERTO DE CONTAS'}</p>
                <p>--------------------------------</p>
            </div>
            
            <div className="space-y-1">
                <p>CLIENTE: {billing.customerName}</p>
                <p>DATA: {new Date(billing.settledAt).toLocaleString('pt-BR')}</p>
                {previousDebt && previousDebt > 0 ? (
                    <div className="bg-black text-white p-1 my-2 text-center font-bold">
                        <ReceiptRow label="DÍVIDA ANTERIOR:" value={`R$ ${formatCurrency(previousDebt)}`} />
                    </div>
                ) : <hr className="border-dashed border-black my-2" />}
                
                {isGrua ? renderGruaDetails() : renderMesaJukeboxDetails()}
                
                {!isProvisional && !isGrua && (
                    billing.paymentMethod === 'misto' ? (
                        <div className="pt-1">
                            <p className="font-bold">PAGAMENTO:</p>
                            {billing.valorPagoDinheiro && billing.valorPagoDinheiro > 0 && <ReceiptRow label="- Dinheiro:" value={`R$ ${formatCurrency(billing.valorPagoDinheiro)}`} />}
                            {billing.valorPagoPix && billing.valorPagoPix > 0 && <ReceiptRow label="- PIX:" value={`R$ ${formatCurrency(billing.valorPagoPix)}`} />}
                            {billing.valorDividaPaga && billing.valorDividaPaga > 0 && <ReceiptRow label="- Pagamento Dívida:" value={`R$ ${formatCurrency(billing.valorDividaPaga)}`} />}
                            {billing.valorDebitoNegativo && billing.valorDebitoNegativo > 0 && <ReceiptRow label="- Negativo:" value={`R$ ${formatCurrency(billing.valorDebitoNegativo)}`} />}
                        </div>
                    ) : (
                        <div className="receipt-row pt-1">
                            <span className="label">Pagamento:</span>
                            <span className="filler"></span>
                            <span className="value text-right">
                                PAGO ( )<br/>
                                NAO PAGO ( )
                            </span>
                        </div>
                    )
                )}
                
                {isProvisional && (
                    <div className="text-center font-bold mt-4 border-t border-b border-dashed border-black py-1">
                        <p>*** COMPROVANTE PARA CONFERÊNCIA ***</p>
                        <p>*** SEM VALOR FISCAL ***</p>
                    </div>
                )}
            </div>

            {qrCodeDataUrl && (
                <div className="text-center mt-4">
                    <p className="font-bold">Pague com PIX</p>
                    <img src={qrCodeDataUrl} alt="PIX QR Code" style={{ width: '150px', height: '150px', margin: '8px auto', border: '4px solid black' }} />
                    <p className="text-xs">Chave: {pixKeyName || 'BILHAR MONTANHA'}</p>
                </div>
            )}

            <hr className="border-dashed border-black my-2" />

            <div className="text-sm text-center mt-2">
                <p className="font-bold">BILHAR MONTANHA</p>
                <p>CNPJ: 76.089.440/0001-29</p>
                <p>Jaguapitã - PR</p>
                <p>Contato: (43) 99958-1993</p>
            </div>

            <hr className="border-dashed border-black my-2" />

            <div className="text-sm text-center mt-4">
                <p className="font-bold">MONTANHA BILHAR E JUKEBOX</p>
                <p>DIVERSÃO LEVADO A SÉRIO</p>
            </div>
        </div>
    );
};

export default ReceiptSheet;
