'use client'

import tc_styles        from '@/styles/traffic_controls.module.css'
import cd_styles        from '@/styles/common_dashboard.module.css'
import dynamic from "next/dynamic";
import { useEffect, useState } from 'react';
import { useStreams } from './global/stream_list';

// Load the map component only on the client side
const Map = dynamic(() => import("@/components/filters/filtermap"), { 
  ssr: false,
  loading: () => <div style={{ textAlign:"center", height: "400px", background: "#eeeeee4b" }}>Loading Map...</div>
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

export function useApiLatency() {
    const [latencies, setLatencies] = useState<number[]>([]);

    useEffect(() => {
        const checkLatency = async () => {
            const start = performance.now();
            try {
                // Using the same endpoint as your PieData
                await fetch('/api/stats', { method: 'GET' });
                const end = performance.now();
                const duration = Math.round(end - start);

                setLatencies(prev => {
                    const updated = [...prev, duration];
                    // Keep only the last 5 results
                    return updated.slice(-5);
                });
            } catch (err) {
                console.error("Latency check failed", err);
            }
        };

        checkLatency(); // Initial check
        const interval = setInterval(checkLatency, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, []);

    // Calculate Average
    const average = latencies.length > 0 
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) 
        : 0;

    return `${average}ms`;
}

function TrafficControlStatus() {
    const { streams } = useStreams();
    const latency = useApiLatency();
    
    // Count the keys in the streams object
    const activeStreamsCount = Object.keys(streams).length;

    return (
        <div className={`${cd_styles.indentedBubble} ${tc_styles.statusContainer}`}>
            <StatusItem 
                label="API Latency"  
                value={latency}  
                color="text-green-500"
            />
            <StatusItem 
                label="Active Streams" 
                value={activeStreamsCount.toString()}    
                color="text-blue-500"  
            />
        </div>
    );
}



/* ============================================================================
 * TrafficControls Component
 * ----------------------------------------------------------------------------
 * Combines the dropdown and node status into a single sidebar panel with 
 * a visual separator between the sections.
 * ============================================================================
 */

export default function TrafficControls() {

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

            <div className={cd_styles.sectionSeparator}></div>

            <h3 className={cd_styles.thirdHeaderFormat}>
                Node Status
            </h3>

            <TrafficControlStatus />

            <div className={tc_styles.sectionSeparator}></div>

            <h3 className={cd_styles.thirdHeaderFormat}>Camera Map</h3>

            <div className={tc_styles.mapFilter}>
                <Map
                    zoom={12}
                />
            </div>
        </div>
    );
}