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

    const [streams, setStreams] = useState<Record<string, StreamUI>>({})

    /* -------------------------------------------------------------------
     * Toggle selected state
     * ------------------------------------------------------------------- */
    const toggleStream = (id: string) => {

        setStreams(prev => {

            const stream = prev[id]
            if (!stream) return prev

            const updated: Record<string, StreamUI> = {}

            for (const key in prev) {

                const s = prev[key]

                if (key === id) {
                    updated[key] = {
                        ID      : s.ID,     loc     : s.loc,
                        url     : s.url,    lat     : s.lat,
                        long    : s.long,   selected: !s.selected
                    }
                } else {
                    updated[key] = s
                }
            }

            return updated
        })
    }

    /* -------------------------------------------------------------------
     *  Fetch streams from API
     * ------------------------------ ------------------------------------- */
    const fetchStreams = useCallback(async () => {
        try {
            const res = await fetch('/api/get_streams')
            if (!res.ok) return

            const incoming: StreamObject[] = await res.json()

            setStreams(prev => {
                const updated: Record<string, StreamUI> = {}
                for (const stream of incoming) {
                    const existing = prev[stream.ID]
                    updated[stream.ID] = {
                        ...stream, // Cleaner spread
                        selected: existing ? existing.selected : false
                    }
                }
                return updated
            })
        } catch (err) {
            console.error("Stream fetch failed", err)
        }
    }, []) // Empty deps mean this function identity is stable

    /* -------------------------------------------------------------------
     * Poll every 30 seconds
     * ------------------------------------------------------------------- */
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchStreams()

        const interval = setInterval(fetchStreams, 5000)
        
        return () => clearInterval(interval);
    }, [fetchStreams])

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
    )
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