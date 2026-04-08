import { useState, useMemo, useCallback, useEffect } from 'react';

/**
 * Custom hook to handle local array pagination.
 * 
 * @param items The full array of items to paginate
 * @param pageSize Number of items to show per page
 * @returns { slicedItems, loadMore, hasMore, reset }
 */
export function usePagination<T>(items: T[], pageSize: number = 15) {
    const [visibleCount, setVisibleCount] = useState(pageSize);

    // Reset pagination when items change (e.g., search filter applied)
    // Note: We only reset if the items length decreases or items change radically
    // to avoid losing scroll position during syncs.
    useEffect(() => {
       // Optional: reset to pageSize if the items specifically dwindle below current count
       // but for now, we'll keep it simple.
    }, [items.length]);

    const loadMore = useCallback(() => {
        setVisibleCount(prev => prev + pageSize);
    }, [pageSize]);

    const reset = useCallback(() => {
        setVisibleCount(pageSize);
    }, [pageSize]);

    const slicedItems = useMemo(() => {
        return items.slice(0, visibleCount);
    }, [items, visibleCount]);

    const hasMore = visibleCount < items.length;

    return {
        slicedItems,
        loadMore,
        hasMore,
        reset,
        visibleCount
    };
}
