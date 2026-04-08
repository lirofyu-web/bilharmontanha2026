import React, { useState, useEffect } from 'react';
import { authenticateHeroku, getHerokuMachineById, HerokuMachine } from '../utils/herokuStatus';

interface HerokuStatusIndicatorProps {
    herokuId?: string;
    className?: string;
}

export const HerokuStatusIndicator: React.FC<HerokuStatusIndicatorProps> = ({ herokuId, className }) => {
    const [status, setStatus] = useState<'loading' | 'online' | 'offline' | 'error' | 'no-id' | 'recent_payment'>('no-id');
    const [machine, setMachine] = useState<HerokuMachine | null>(null);

    useEffect(() => {
        if (!herokuId) {
            setStatus('no-id');
            return;
        }

        let cancelled = false;
        setStatus('loading');

        const fetchStatus = async () => {
            try {
                const data = await getHerokuMachineById(herokuId);
                if (cancelled) return;
                if (data) {
                    setMachine(data);
                    const statusLower = (data.status || '').toLowerCase();
                    const isOnline = statusLower === 'inline' || statusLower === 'online' || statusLower === 'active';
                    if (isOnline) {
                        setStatus('online');
                    } else if (statusLower === 'pagamento_recente') {
                        setStatus('recent_payment' as any);
                    } else {
                        setStatus('offline');
                    }
                } else {
                    setStatus('error');
                }
            } catch {
                if (!cancelled) setStatus('error');
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 60000); // refresh every minute

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [herokuId]);

    if (status === 'no-id') return null;

    const getColor = () => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'offline': return 'bg-red-500';
            case 'recent_payment': return 'bg-blue-400';
            case 'loading': return 'bg-yellow-500 animate-pulse';
            default: return 'bg-slate-500';
        }
    };

    const getTitle = () => {
        switch (status) {
            case 'online': return 'ESP32 Online';
            case 'offline': return 'ESP32 Offline';
            case 'recent_payment': return 'ESP32 Pagamento Recente';
            case 'loading': return 'Verificando ESP32...';
            default: return 'ESP32 indisponível';
        }
    };

    return (
        <span
            title={getTitle()}
            className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${className || ''}`}
        >
            <span className={`w-2 h-2 rounded-full ${getColor()}`}></span>
            {status === 'online' && <span className="text-green-400">ESP32</span>}
            {status === 'offline' && <span className="text-red-400">ESP32</span>}
            {(status as any) === 'recent_payment' && <span className="text-blue-400">ESP32</span>}
            {status === 'loading' && <span className="text-yellow-400">...</span>}
            {status === 'error' && <span className="text-slate-500">ESP32</span>}
        </span>
    );
};
