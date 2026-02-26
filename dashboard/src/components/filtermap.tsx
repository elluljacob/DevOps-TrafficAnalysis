"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

interface MapProps {
  center: [number, number];
  zoom?: number;
}

export default function Map({ center, zoom = 13 }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // 1. INITIALIZATION: Run only ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).setView(center, zoom);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    markerRef.current = L.marker(center).addTo(map).bindPopup("Camera Location");

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Empty array = Only run on mount

  // 2. UPDATES: Smoothly move the map/marker if props change, without rebuilding
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const currentCenter = mapInstanceRef.current.getCenter();
      
      // Only move if the change is significant (prevents jitter)
      if (currentCenter.lat !== center[0] || currentCenter.lng !== center[1]) {
        mapInstanceRef.current.setView(center, zoom, { animate: true });
        markerRef.current.setLatLng(center);
      }
    }
  }, [center, zoom]); // Listen for changes, but don't "remove()" the map

  return (
    <div 
      ref={mapContainerRef} 
      style={{ height: "400px", width: "100%", borderRadius: "8px", zIndex: 0 }} 
    />
  );
}