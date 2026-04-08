import React from 'react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[999] bg-[#0f172a] flex flex-col items-center justify-center">
            <div className="relative group">
                {/* Background glow animation */}
                <div className="absolute -inset-10 bg-[var(--color-primary)] opacity-10 blur-3xl rounded-full animate-pulse-subtle"></div>
                
                {/* Logo with scale-in animation */}
                <div className="relative transition-all duration-1000 transform scale-100 group-hover:scale-105">
                    <img 
                        src="/assets/logo_loading.png" 
                        alt="PIX MONTANHA Loading" 
                        className="w-48 h-48 sm:w-64 sm:h-64 object-contain drop-shadow-[0_0_20px_rgba(132,204,22,0.4)]"
                    />
                </div>
            </div>
            
            {/* Minimalist loading indicator */}
            <div className="mt-12 flex flex-col items-center gap-4">
                <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <div 
                            key={i} 
                            className="w-2 h-2 rounded-full bg-[var(--color-primary)]" 
                            style={{ 
                                animation: 'bounce 1.4s infinite ease-in-out both',
                                animationDelay: `${i * 0.16}s`
                            }}
                        />
                    ))}
                </div>
                <p className="text-slate-500 font-black text-[10px] tracking-[0.5em] uppercase animate-pulse">
                    Inicializando PIX MONTANHA
                </p>
            </div>

            <style>{`
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;
