'use client'
import React, { createContext, useContext, useState, ReactNode } from 'react'
import { TimeRange } from '@/types/stats'



interface TimeContextType {
    range: TimeRange
    setRange: (range: TimeRange) => void
}

const TimeContext = createContext<TimeContextType | undefined>(undefined)

export function TimeProvider({ children }: { children: ReactNode }) {
    const [range, setRange] = useState<TimeRange>('live')

    return (
        <TimeContext.Provider value={{ range, setRange }}>
            {children}
        </TimeContext.Provider>
    )
}

export function useGlobalTime() {
    const context = useContext(TimeContext)
    if (!context) throw new Error('useGlobalTime must be used within a TimeProvider')
    return context
}