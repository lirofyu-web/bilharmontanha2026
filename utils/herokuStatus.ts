// utils/herokuStatus.ts
// Utilidades para integração com API Heroku/ESP32

const HEROKU_BASE_URL = 'https://pixjukebox-69052c9b736e.herokuapp.com';

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

export interface HerokuMachine {
    uuid: string;
    name: string;
    credits: number;
    status: string;
    last_seen?: string;
    coin_count?: number;
    model?: string;
    mercado_pago_id?: string;
}

export interface HerokuPaymentReport {
    date: string;
    total: number;
    count: number;
    pix: number;
    credit: number;
    debit: number;
}

const getStoredToken = (): string | null => {
    const cached = localStorage.getItem('herokuAuthToken');
    const expiry = localStorage.getItem('herokuTokenExpiry');
    if (cached && expiry && Date.now() < parseInt(expiry)) {
        return cached;
    }
    return null;
};

const storeToken = (token: string) => {
    const expiry = Date.now() + 1 * 60 * 1000; // 1 minute session
    localStorage.setItem('herokuAuthToken', token);
    localStorage.setItem('herokuTokenExpiry', expiry.toString());
    cachedToken = token;
    tokenExpiry = expiry;
};

export const clearHerokuAuth = () => {
    localStorage.removeItem('herokuAuthToken');
    localStorage.removeItem('herokuTokenExpiry');
    cachedToken = null;
    tokenExpiry = null;
};

export const authenticateHeroku = async (): Promise<string | null> => {
    const stored = getStoredToken();
    if (stored) return stored;

    const email = localStorage.getItem('herokuEmail');
    const password = localStorage.getItem('herokuPassword');
    
    if (!email || !password) return null;

    try {
        const response = await fetch(`${HEROKU_BASE_URL}/login-cliente`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha: password }),
        });

        if (!response.ok) return null;
        const data = await response.json();
        const token = data.token;
        if (token) {
            storeToken(token);
            return token;
        }
        return null;
    } catch (err) {
        console.error('Heroku auth error:', err);
        return null;
    }
};

export const getAllHerokuMachines = async (): Promise<HerokuMachine[]> => {
    const token = await authenticateHeroku();
    if (!token) return [];

    try {
        const response = await fetch(`${HEROKU_BASE_URL}/maquinas`, {
            headers: { 
                'x-access-token': token,
                'Content-Type': 'application/json'
            },
        });
        if (!response.ok) return [];
        const machines = await response.json();
        
        if (!Array.isArray(machines)) return [];

        return machines.map((m: any) => ({
            uuid: m.id || m.uuid,
            name: m.nome || m.name || 'Máquina',
            credits: 0,
            status: m.status || 'desconhecido',
            last_seen: m.updatedAt || m.last_seen,
            mercado_pago_id: m.mercado_pago_id || m.mp_id || m.store_id
        }));
    } catch (err) {
        console.error('Get all machines error:', err);
        return [];
    }
};

export const getHerokuMachineById = async (machineUuid: string): Promise<HerokuMachine | null> => {
    const machines = await getAllHerokuMachines();
    return machines.find(m => m.uuid === machineUuid) || null;
};

export const sendHerokuRemoteCredit = async (machineUuid: string, credits: number): Promise<boolean> => {
    const token = await authenticateHeroku();
    if (!token) return false;

    try {
        const response = await fetch(`${HEROKU_BASE_URL}/credito-remoto-cliente`, {
            method: 'POST',
            headers: { 
                'x-access-token': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: machineUuid, valor: credits.toString() }),
        });
        return response.ok;
    } catch (err) {
        console.error('Send credit error:', err);
        return false;
    }
};

export const fetchHerokuPaymentReport = async (
    machineUuid: string,
    startDate: string,
    endDate: string
): Promise<HerokuPaymentReport[]> => {
    const token = await authenticateHeroku();
    if (!token) return [];

    try {
        const response = await fetch(`${HEROKU_BASE_URL}/pagamentos-periodo/${machineUuid}`, {
            method: 'POST',
            headers: { 
                'x-access-token': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dataInicio: new Date(startDate).toISOString(),
                dataFim: new Date(endDate + 'T23:59:59').toISOString()
            })
        });
        if (!response.ok) return [];
        const data = await response.json();
        // A API de produção retorna uma lista de pagamentos individual,
        // vamos agrupar por data se necessário ou apenas retornar os dados
        return (data.pagamentos || []).map((p: any) => ({
            date: p.data,
            total: p.valor,
            count: 1,
            pix: p.tipo === 'pix' ? p.valor : 0,
            credit: p.tipo === 'cartao_credito' ? p.valor : 0,
            debit: p.tipo === 'cartao_debito' ? p.valor : 0
        }));
    } catch (err) {
        console.error('Fetch payment report error:', err);
        return [];
    }
};

export const updateHerokuMachine = async (machineUuid: string, updates: Partial<HerokuMachine>): Promise<boolean> => {
    const token = await authenticateHeroku();
    if (!token) return false;

    try {
        const response = await fetch(`${HEROKU_BASE_URL}/api/machines/${machineUuid}`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates),
        });
        return response.ok;
    } catch (err) {
        console.error('Update machine error:', err);
        return false;
    }
};
