'use client'

import { TimeRange }    from '@/types/stats'
import tc_styles        from '@/styles/traffic_controls.module.css'
import cd_styles        from '@/styles/common_dashboard.module.css'

/* ============================================================================
 * StatusItem Component
 * ----------------------------------------------------------------------------
 * Displays a single node status line with label, value, and color.
 * ============================================================================
 */
function StatusItem({ label, value, color }: 
  { label: string; value: string; color: string }) {
    return (
        <div className={tc_styles.statusItem}>
            <span>{label}</span>
            <span className={color}>{value}</span>
        </div>
    )
}

/* ============================================================================
 * TrafficControlStatus Component
 * ----------------------------------------------------------------------------
 * Node status section below the dropdown with a separating line.
 * ============================================================================
 */
function TrafficControlStatus() {
    return (
        <div className={tc_styles.statusContainer}>
            <div className={tc_styles.statusList}>
                <StatusItem 
                    label="API Latency"    value="24ms"  color="text-green-500"
                />
                <StatusItem 
                    label="Active Sensors" value="142"   color="text-blue-500"  
                />
                <StatusItem 
                    label="Uptime"         value="99.9%" color="text-green-500" 
                />
            </div>
        </div>
    )
}

/* ============================================================================
 * TimeRangeDropdown Component
 * ----------------------------------------------------------------------------
 * Renders a distinct dropdown with a custom arrow inside the box.
 * ============================================================================
 */
function TimeRangeDropdown({ range, setRange }: 
  { range: TimeRange; setRange: (val: TimeRange) => void }) {
    return (
        <div className={tc_styles.selectWrapper}>
            <select value={range} onChange={(e) => setRange(
                e.target.value as TimeRange
            )} className={tc_styles.select}>
                <option value="live">Live (Last 5m) </option>
                <option value="1h"  >Last Hour      </option>
                <option value="24h" >Last 24h       </option>
                <option value="7d"  >Last 7 Days    </option>
            </select>
            <div className={tc_styles.selectArrow}>
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" 
                     fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" 
                          strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
            </div>
        </div>
    )
}

/* ============================================================================
 * TrafficControls Component
 * ----------------------------------------------------------------------------
 * Combines the dropdown and node status into a single sidebar panel with 
 * a visual separator between the sections.
 * ============================================================================
 */
interface Props {
    range: TimeRange
    setRange: (val: TimeRange) => void
}

export default function TrafficControls({ range, setRange }: Props) {
    return (
        /* ------------- Bubble ------------------------ */
        <div className={cd_styles.bubble}>
            <h2 className={cd_styles.secondHeaderFormat}>Control Center</h2>

            <h3 className={cd_styles.thirdHeaderFormat}>
                Time Range
            </h3>
            
            <TimeRangeDropdown range={range} setRange={setRange} />

            <div className={tc_styles.sectionSeparator}></div>

            <h3 className={cd_styles.thirdHeaderFormat}>
                Node Status
            </h3>

            <TrafficControlStatus />
        </div>
    )
}