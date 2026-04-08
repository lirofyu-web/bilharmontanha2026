
// components/DebtReceiptSheet.tsx
import React from 'react';
import { DebtPayment } from '../types';

interface DebtReceiptSheetProps {
  debtPayment: DebtPayment;
  qrCodeDataUrl: string;
  pixKeyName?: string;
}

const ReceiptRow: React.FC<{label: string, value: string | number}> = ({ label, value }) => (
    <div className="receipt-row">
      <span className="label">{label}</span>
      <span className="filler"></span>
      <span className="value">{value}</span>
    </div>
);

const DebtReceiptSheet: React.FC<DebtReceiptSheetProps> = ({ debtPayment, qrCodeDataUrl, pixKeyName }) => {

    const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div style={{ fontFamily: '\'Courier New\', Courier, monospace' }} className="text-base">
            <div className="header text-center mb-4">
                <h3 className="font-black text-xl">MONTANHA BILHAR & JUKEBOX</h3>
                <p className="font-bold text-base uppercase">RECIBO DE DÍVIDA - {debtPayment.equipmentType}</p>
                <p>--------------------------------</p>
            </div>
            
            <div className="space-y-1">
                <p>CLIENTE: {debtPayment.customerName}</p>
                <p>DATA: {new Date(debtPayment.paidAt).toLocaleString('pt-BR')}</p>
                <hr className="border-dashed border-black my-2" />
                
                <div className="flex justify-between font-bold text-xl pt-2 mt-2 border-t border-b border-dashed border-black py-2">
                    <span>VALOR PAGO:</span>
                    <span>R$ {formatCurrency(debtPayment.amountPaid)}</span>
                </div>

                <div className="pt-1">
                    <p className="font-bold">MÉTODO:</p>
                    {debtPayment.paymentMethod === 'misto' ? (
                        <>
                            {debtPayment.amountPaidDinheiro && debtPayment.amountPaidDinheiro > 0 && <ReceiptRow label="- Dinheiro:" value={`R$ ${formatCurrency(debtPayment.amountPaidDinheiro)}`} />}
                            {debtPayment.amountPaidPix && debtPayment.amountPaidPix > 0 && <ReceiptRow label="- PIX:" value={`R$ ${formatCurrency(debtPayment.amountPaidPix)}`} />}
                            {debtPayment.amountPaidCartao && debtPayment.amountPaidCartao > 0 && <ReceiptRow label="- Cartão:" value={`R$ ${formatCurrency(debtPayment.amountPaidCartao)}`} />}
                        </>
                    ) : (
                       <ReceiptRow label="- Método:" value={debtPayment.paymentMethod.toUpperCase()} />
                    )}
                </div>
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

export default DebtReceiptSheet;
