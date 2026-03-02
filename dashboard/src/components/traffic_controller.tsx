'use client'

import { TimeRange }    from '@/types/stats'
import tc_styles        from '@/styles/traffic_controls.module.css'
import cd_styles        from '@/styles/common_dashboard.module.css'
import dynamic from "next/dynamic";
import { useState } from 'react';

// Load the map component only on the client side
const Map = dynamic(() => import("@/components/filtermap"), { 
  ssr: false,
  loading: () => <div style={{ height: "400px", background: "#eee" }}>Loading Map...</div>
});

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

    const [cameras, setCameras] = useState([
        { id: 1, name: "Camera A", lat: 51.505, lng: -0.09, enabled: true },
        { id: 2, name: "Camera B", lat: 51.51, lng: -0.1, enabled: false },
    ]);

    const toggleCamera = (id: number) => {
        setCameras((prev) =>
            prev.map((cam) =>
                cam.id === id
                    ? { ...cam, enabled: !cam.enabled }
                    : cam
            )
        );
    };

    return (
        <div className={`${cd_styles.bubble} ${tc_styles.container}`}>
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

            <div className={tc_styles.sectionSeparator}></div>

            <h3 className={cd_styles.thirdHeaderFormat}>Camera Map</h3>

            <div className={tc_styles.mapFilter}>
                <Map
                    cameras={cameras}
                    toggleCamera={toggleCamera}
                    zoom={13}
                />
            </div>
        </div>
    );
}