'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { StreamObject } from '@/types/stream'
import { log, LogLevel } from '@/lib/logger'

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
    // Track if we have performed the initial "Select Top 3" logic
    const [isFirstLoad, setIsFirstLoad] = useState(true);

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
                    
                    let shouldBeSelected = false;

                    if (existing) {
                        // 1. If we already know this stream, keep its current state
                        shouldBeSelected = existing.selected;
                    } else if (isFirstLoad && index < 3) {
                        // 2. If it's a new stream AND it's the first load AND it's top 3
                        shouldBeSelected = true;
                    } else {
                        // 3. Otherwise (new stream appearing later), default to false
                        shouldBeSelected = false;
                    }

                    updated[stream.ID] = {
                        ...stream,
                        selected: shouldBeSelected
                    };
                });

                return updated;
            });

            // Flip the switch after the first successful processing
            if (isFirstLoad && incoming.length > 0) {
                setIsFirstLoad(false);
            }

        } catch (err) {
            console.error("Stream fetch failed", err);
        }
    }, [isFirstLoad]); // Hook depends on isFirstLoad to know when to stop defaulting

    useEffect(() => {
        fetchStreams();
        const interval = setInterval(fetchStreams, 5000);
        return () => clearInterval(interval);
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