"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

import { useStreams, StreamUI, StreamProvider } from "@/components/global/stream_list"; 
import ft_styles from '@/styles/filter.module.css';

const AMSTERDAM_COORDS: [number, number] = [52.3676, 4.9041];
const createIcon = (color: string) =>
  L.divIcon({
    className: "", // Leaflet wrapper class
    html: `<svg width="30" height="30" viewBox="0 0 512 512">
             <g fill="${color}" transform="translate(106.666667, 42.666667)">
               <path d="M149.333333,0 
                 C231.807856,0 298.666667,66.8588107 298.666667,149.333333 
                 C298.666667,176.537017 291.413333,202.026667 278.683512,224.008666 
                 C270.196964,238.663333 227.080238,313.32711 149.333333,448 
                 C71.5864284,313.32711 28.4697022,238.663333 19.9831547,224.008666 
                 C7.25333333,202.026667 0,176.537017 0,149.333333 
                 C0,66.8588107 66.8588107,0 149.333333,0 Z 
                 M149.333333,85.3333333 
                 C113.987109,85.3333333 85.3333333,113.987109 85.3333333,149.333333 
                 C85.3333333,184.679557 113.987109,213.333333 149.333333,213.333333 
                 C184.679557,213.333333 213.333333,184.679557 213.333333,149.333333 
                 C213.333333,113.987109 184.679557,85.3333333 149.333333,85.3333333 Z"/>
             </g>
           </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

const greenIcon = createIcon("#608066");
const redIcon   = createIcon("#b91c1c");

/* ============================================================================
 * useLeafletMap Hook - Updated Signature
 * ============================================================================
 */
function useLeafletMap(
    containerRef: React.RefObject<HTMLDivElement | null>,
    streams: Record<string, StreamUI>, // Argument 2
    toggleStream: (id: string) => void, // Argument 3
    zoom: number                        // Argument 4
) {
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<Record<string, L.Marker>>({});

    // 1. Initialize Map
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current).setView(AMSTERDAM_COORDS, zoom);
        //https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png
        //https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png
        //https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png
        L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
            maxZoom: 20
        }).addTo(map);

        mapRef.current = map;
    }, [containerRef, zoom]);

    // 2. Sync Markers
    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;
        const streamArray = Object.values(streams);

        streamArray.forEach((stream: StreamUI) => {
            const currentIcon = stream.selected ? greenIcon : redIcon;

            if (markersRef.current[stream.ID]) {
                markersRef.current[stream.ID].setIcon(currentIcon);
            } else {
                const marker = L.marker([stream.lat, stream.long], { icon: currentIcon })
                    .addTo(map)
                    .bindTooltip(`
                        <div style="font-family: sans-serif;">
                            <strong>${stream.loc || 'Camera'}</strong><br/>
                            <small>${stream.ID}</small>
                        </div>
                    `, { direction: 'top', offset: [0, -20] });

                marker.on("click", () => toggleStream(stream.ID));
                markersRef.current[stream.ID] = marker;
            }
        });
    }, [streams, toggleStream]);
}

/* ============================================================================
 * Map Content - The child component that uses the Hook
 * ============================================================================
 */
function MapContent({ zoom }: { zoom: number }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { streams, toggleStream } = useStreams();

    // Now matches: 1:Ref, 2:Record, 3:Function, 4:Number
    useLeafletMap(containerRef, streams, toggleStream, zoom);

    return (
        <div
            ref={containerRef}
            className={ft_styles.mapFilter}
        />
    );
}

/* ============================================================================
 * Map Export - The Parent Wrapper providing Context
 * ============================================================================
 */
export default function Map({ zoom = 13 }: { zoom?: number }) {
    return (
        <MapContent zoom={zoom} />
    );
}