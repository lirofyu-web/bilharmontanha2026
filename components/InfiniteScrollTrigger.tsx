import React, { useEffect, useRef } from 'react';

interface InfiniteScrollTriggerProps {
    onIntersect: () => void;
    hasMore: boolean;
    loading?: boolean;
    className?: string;
    loadingText?: string;
}

/**
 * A small component that uses IntersectionObserver.
 * When it scrolls into view, it calls the `onIntersect` callback.
 */
export const InfiniteScrollTrigger: React.FC<InfiniteScrollTriggerProps> = ({ 
    onIntersect, 
    hasMore, 
    loading = false, 
    className = "",
    loadingText = "Carregando mais..."
}) => {
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!hasMore || loading) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    onIntersect();
                }
            },
            { threshold: 0.1 }
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [onIntersect, hasMore, loading]);

    if (!hasMore) return null;

    return (
        <div 
            ref={observerTarget} 
            className={`w-full py-6 flex flex-col items-center justify-center gap-2 ${className}`}
        >
            <div className="w-8 h-8 border-4 border-lime-500/30 border-t-lime-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 animate-pulse">
                {loadingText}
            </p>
        </div>
    );
};
