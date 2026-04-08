export interface MpSummary {
  pix: number;
  credit: number;
  debit: number;
  refunds: number;
  count: number;
}

export interface MpPayment {
  id: string;
  date_approved: string;
  transaction_amount: number;
  payment_type_id: string;
  payment_method_id: string;
  status: string;
  external_reference?: string;
  [key: string]: any;
}

/**
 * Busca pagamentos no Mercado Pago para uma determinada loja (Store ID ou POS ID) em um intervalo de datas.
 * Implementa paginação para garantir que 100% dos registros sejam capturados.
 */
export async function fetchMpBilling(
  id: string, 
  startDate: string, 
  endDate: string, 
  accessToken: string
): Promise<MpSummary> {
  // Ajuste de fuso horário (-03:00 para Brasil) para garantir precisão nas datas
  const beginDate = `${startDate}T00:00:00.000-03:00`;
  const finishDate = `${endDate}T23:59:59.999-03:00`;

  const limit = 100;
  const headers = { 'Authorization': `Bearer ${accessToken}` };
  
  // Fontes de busca para cruzamento de dados (Garante que apenas o ID especificado seja usado)
  const sources = id ? [
    `store_id=${id}`,
    `pos_id=${id}`,
    `external_reference=${id}`
  ] : [];

  const allResults: any[] = [];
  const uniqueIds = new Set();

  try {
    // Busca em cada fonte e lida com a paginação de cada uma
    for (const source of sources) {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const url = `https://api.mercadopago.com/v1/payments/search?range=date_last_updated&begin_date=${beginDate}&end_date=${finishDate}&limit=${limit}&offset=${offset}&${source}`;
        
        let response: Response | undefined;
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
          try {
            response = await fetch(url, { headers });
            if (response.ok) break;
            if (response.status === 401) throw new Error('TOKEN_INVALIDO');
            
            // Wait before retry
            retries++;
            await new Promise(res => setTimeout(res, retries * 1000));
          } catch (e: any) {
            if (e.message === 'TOKEN_INVALIDO') throw e;
            retries++;
            if (retries >= maxRetries) break;
            await new Promise(res => setTimeout(res, retries * 1000));
          }
        }
        
        if (!response || !response.ok) break;

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          data.results.forEach((payment: any) => {
            if (!uniqueIds.has(payment.id)) {
              uniqueIds.add(payment.id);
              allResults.push(payment);
            }
          });
          
          offset += limit;
          // Se o total de resultados for menor que o limite, chegamos ao fim desta fonte
          if (data.results.length < limit) hasMore = false;
        } else {
          hasMore = false;
        }
      }
    }

    const summary: MpSummary = {
      pix: 0,
      credit: 0,
      debit: 0,
      refunds: 0,
      count: 0
    };

    allResults.forEach((payment: any) => {
      const amount = payment.transaction_amount || 0;
      const status = payment.status;
      const typeId = payment.payment_type_id;
      const methodId = payment.payment_method_id;

      // Status 'approved' é o que entra no caixa real
      if (status === 'approved') {
        summary.count++;
        // Categorização baseada no tipo de pagamento do MP
        if (methodId === 'pix' || typeId === 'bank_transfer' || typeId === 'account_money') {
          summary.pix += amount;
        } else if (typeId === 'credit_card') {
          summary.credit += amount;
        } else if (typeId === 'debit_card') {
          summary.debit += amount;
        }
      } 
      // Deduz estornos do faturamento bruto para chegar no valor real em conta
      else if (status === 'refunded' || status === 'partially_refunded') {
        summary.refunds += amount;
      }
    });

    return summary;
  } catch (error) {
    console.error('Erro na sincronização Mercado Pago:', error);
    throw error;
  }
}

/**
 * Busca a lista detalhada de pagamentos no Mercado Pago.
 */
export async function fetchMpDetailedPayments(
  id: string, 
  startDate: string, 
  endDate: string, 
  accessToken: string
): Promise<MpPayment[]> {
  const beginDate = `${startDate}T00:00:00.000-03:00`;
  const finishDate = `${endDate}T23:59:59.999-03:00`;

  const limit = 100;
  const headers = { 'Authorization': `Bearer ${accessToken}` };
  
  const sources = id ? [
    `store_id=${id}`,
    `pos_id=${id}`,
    `external_reference=${id}`
  ] : [];

  const allResults: MpPayment[] = [];
  const uniqueIds = new Set();

  try {
    for (const source of sources) {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const url = `https://api.mercadopago.com/v1/payments/search?range=date_last_updated&begin_date=${beginDate}&end_date=${finishDate}&limit=${limit}&offset=${offset}&${source}`;
        
        const response = await fetch(url, { headers });
        if (response.status === 401) throw new Error('TOKEN_INVALIDO');
        if (!response.ok) break;

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          data.results.forEach((payment: any) => {
            if (!uniqueIds.has(payment.id)) {
              uniqueIds.add(payment.id);
              allResults.push(payment);
            }
          });
          
          offset += limit;
          if (data.results.length < limit) hasMore = false;
        } else {
          hasMore = false;
        }
      }
    }

    return allResults.sort((a, b) => new Date(b.date_approved || 0).getTime() - new Date(a.date_approved || 0).getTime());
  } catch (error) {
    console.error('Erro ao buscar pagamentos detalhados MP:', error);
    return [];
  }
}
