'use client'

import { TimeRange } from '@/types/stats'

interface Props {
    range: TimeRange;
    setRange: (val: TimeRange) => void;
}

export default function TrafficControls({ range, setRange }: Props) {
    return (
        <div className="flex flex-col gap-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Time Range
            </label>
            <select 
                value={range} 
                onChange={(e) => setRange(e.target.value as TimeRange)}
                className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-3 py-2 text-sm font-medium cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none"
            >
                <option value="live">Live (Last 5m)</option>
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 Days</option>
            </select>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                    Data is aggregated from all sensor nodes across the network.
                </p>
            </div>
        </div>
    );
}