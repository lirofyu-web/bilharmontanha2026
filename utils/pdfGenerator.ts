/* eslint-disable @typescript-eslint/no-explicit-any */
import { Capacitor } from '@capacitor/core';
import { nativePrintPDF } from './nativePrint';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Converts an HTML element to a PDF and opens it in a new browser tab.
 * The PDF will be sized to fit the captured element's aspect ratio within an A4 page.
 * @param {HTMLElement} element The HTML element to capture.
 * @param {string} fileName The desired file name for the PDF.
 * @returns {Promise<void>}
 */
export const exportElementAsPDF = (element: HTMLElement, fileName: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    if (!element) {
      return reject(new Error("Elemento para renderização não encontrado."));
    }

    if (!jsPDF || !html2canvas) {
        return reject(new Error("As bibliotecas de PDF não foram devidamente carregadas."));
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      if (!imgData || imgData === 'data:,') {
        return reject(new Error("Falha ao criar os dados da imagem a partir do canvas."));
      }

      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const ratio = canvas.width / canvas.height;

      let finalImgWidth = pdfWidth;
      let finalImgHeight = finalImgWidth / ratio;

      if (finalImgHeight > pdfHeight) {
        finalImgHeight = pdfHeight;
        finalImgWidth = finalImgHeight * ratio;
      }

      const x = (pdfWidth - finalImgWidth) / 2;
      const y = 0; // Align to top

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      doc.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight);

      const pdfBlob = doc.output('blob');
      
      try {
        if (Capacitor.isNativePlatform()) {
           const dataUri = doc.output('datauristring');
           const pdfBase64 = dataUri.split(',')[1];
           await nativePrintPDF(pdfBase64, fileName);
        } else {
           const pdfUrl = URL.createObjectURL(pdfBlob);
           await nativePrintPDF(pdfUrl, fileName);
           setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
        }
        resolve();
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Falha ao imprimir o PDF."));
      }

    } catch (error) {
      console.error("Ocorreu um erro durante a geração do PDF:", error);
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro crítico ao gerar o PDF.";
      reject(new Error(errorMessage));
    }
  });
};
