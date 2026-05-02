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
                        src="/logo-escuro.png" 
                        alt="Montanha Gestão" 
                        className="w-48 h-48 sm:w-64 sm:h-64 object-contain drop-shadow-[0_0_20px_rgba(132,204,22,0.4)]"
                    />
                </div>
            </div>
            
            {/* Welcome text */}
            <div className="mt-8 flex flex-col items-center gap-3 px-6 text-center">
                <p className="text-[var(--color-primary)] font-black text-sm tracking-widest uppercase animate-pulse">
                    Bem-vindo ao
                </p>
                <h1 className="text-white font-black text-xl sm:text-2xl leading-tight drop-shadow-[0_0_10px_rgba(132,204,22,0.4)]">
                    Sistema de Gestão e Cobrança
                </h1>
                <h2 className="text-[var(--color-primary)] font-black text-xl sm:text-2xl leading-tight drop-shadow-[0_0_10px_rgba(132,204,22,0.4)]">
                    Montanha Gestão
                </h2>

                {/* Minimalist loading indicator */}
                <div className="mt-4 flex gap-1.5">
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
