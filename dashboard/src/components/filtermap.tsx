"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";




/* ============================================================================
 * useLeafletMap Hook
 * ----------------------------------------------------------------------------
 * Handles the lifecycle of the Leaflet instance: Init, Update, and Cleanup.
 * ============================================================================
 */
function useLeafletMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  cameras: Camera[],
  toggleCamera: (id: number) => void,
  zoom: number
) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<number, L.Marker>>({});

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current).setView(
        [cameras[0].lat, cameras[0].lng],
        zoom
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      mapRef.current = map;
    }

    const map = mapRef.current!;

    // Remove old markers
    Object.values(markersRef.current).forEach((marker) =>
      marker.remove()
    );
    markersRef.current = {};

    // Add updated markers
    cameras.forEach((camera) => {
      const marker = L.marker(
        [camera.lat, camera.lng],
        {
          icon: camera.enabled ? greenIcon : redIcon,
        }
      )
        .addTo(map)
        .bindPopup(camera.name);

      marker.on("click", () => {
        toggleCamera(camera.id);
      });

      markersRef.current[camera.id] = marker;
    });

  }, [cameras, zoom, containerRef]);
}
const greenIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const redIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});
/* ============================================================================
 * Map Component
 * ============================================================================
 */
interface Camera {
  id: number;
  name: string;
  lat: number;
  lng: number;
  enabled: boolean;
}

interface MapProps {
  cameras: Camera[];
  toggleCamera: (id: number) => void;
  zoom?: number;
}

export default function Map({ cameras, toggleCamera, zoom = 13 }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLeafletMap(containerRef, cameras, toggleCamera, zoom);

  return (
    <div
      ref={containerRef}
      style={{ height: "400px", width: "100%", borderRadius: "8px" }}
    />
  );
}