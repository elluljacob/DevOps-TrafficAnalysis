'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { StreamObject } from '@/types/stream'

/* ============================================================================
 * Stream UI Type
 * ============================================================================ 
 */
export type StreamUI = StreamObject & {
    selected: boolean
}

/* ============================================================================
 * Context Type
 * ============================================================================ 
 */
interface StreamContextType {
    streams: Record<string, StreamUI>
    toggleStream: (id: string) => void
    refresh: () => Promise<void>
}

/* ============================================================================
 * Context
 * ============================================================================ 
 */
const StreamContext = createContext<StreamContextType | null>(null)

/* ============================================================================
 * Provider
 * ============================================================================ 
 */
export function StreamProvider({ children }: { children: React.ReactNode }) {
    const [streams, setStreams] = useState<Record<string, StreamUI>>({});
    // Use a Ref instead of State to track first load without triggering re-renders
    const isFirstLoad = useRef(true);

    /* -------------------------------------------------------------------
     * Toggle selected state
     * ------------------------------------------------------------------- */
    const toggleStream = (id: string) => {
        setStreams(prev => {
            const stream = prev[id];
            if (!stream) return prev;

            return {
                ...prev,
                [id]: { ...stream, selected: !stream.selected }
            };
        });
    };

    /* -------------------------------------------------------------------
     * Fetch streams from API
     * ------------------------------------------------------------------- */
    const fetchStreams = useCallback(async () => {
        try {
            const res = await fetch('/api/get_streams');
            if (!res.ok) return;
            const incoming: StreamObject[] = await res.json();

            setStreams(prev => {
                const updated: Record<string, StreamUI> = {};
                incoming.forEach((stream, index) => {
                    const existing = prev[stream.ID];
                    // Use .current for the ref check
                    const shouldBeSelected = existing ? existing.selected : (isFirstLoad.current && index < 3);
                    
                    updated[stream.ID] = { ...stream, selected: shouldBeSelected };
                });
                return updated;
            });

            // Update ref without triggering a re-render
            if (incoming.length > 0) {
                isFirstLoad.current = false;
            }
        } catch (err) {
            console.error("Stream fetch failed", err);
        }
    }, []); // No dependencies needed now!

    useEffect(() => {
        // Define a flag to prevent state updates if the component unmounts
        let isMounted = true;

        const tick = async () => {
            await fetchStreams();
        };

        tick(); // Initial fetch

        const interval = setInterval(tick, 5000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [fetchStreams]);

    return (
        <StreamContext.Provider
            value={{
                streams: streams,
                toggleStream: toggleStream,
                refresh: fetchStreams
            }}
        >
            {children}
        </StreamContext.Provider>
    );
}
/* ============================================================================
 * Hook
 * ============================================================================ 
 */
export function useStreams() {

    const ctx = useContext(StreamContext)

    if (!ctx) {
        throw new Error("useStreams must be used inside StreamProvider")
    }

    return ctx
}