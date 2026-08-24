'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon in Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Blue icon for nearby workers
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to recenter the map dynamically
function RecenterAutomatically({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

// Glowing red pulse icon for the victim
const pulseIcon = new L.DivIcon({
  className: 'custom-pulse-icon',
  html: `
    <div class="pulse-wrapper">
      <div class="pulse-ring"></div>
      <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" class="pulse-pin" />
    </div>
  `,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export interface ExtraMarker {
  position: [number, number];
  label?: string;
  color?: 'blue' | 'red';
}

interface MapProps {
  center: [number, number]; // [lat, lng]
  zoom?: number;
  label?: string;
  // NEW: optional additional markers for nearby workers etc.
  extraMarkers?: ExtraMarker[];
}

export default function SOSMap({ center, zoom = 14, label, extraMarkers }: MapProps) {
  // Leaflet uses [lat, lng]
  return (
    <>
      <style>{`
        .custom-pulse-icon {
          background: transparent;
          border: none;
        }
        .pulse-wrapper {
          position: relative;
          width: 25px;
          height: 41px;
        }
        .pulse-pin {
          position: absolute;
          top: 0;
          left: 0;
          width: 25px;
          height: 41px;
          z-index: 2;
        }
        .pulse-ring {
          position: absolute;
          top: 41px;
          left: 12px;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          background: #ef4444; /* red-500 */
          border-radius: 50%;
          animation: pulse-ring 1.5s infinite;
          z-index: 1;
        }
        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            box-shadow: 0 0 0 20px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 10 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Primary (victim) marker — red heartbeat pulse */}
        <Marker position={center} icon={pulseIcon}>
        {label && (
          <Popup>
            <div className="font-bold text-red-600">{label}</div>
          </Popup>
        )}
      </Marker>
      {/* NEW: extra markers (e.g. nearby workers) — blue */}
      {extraMarkers?.map((m, i) => (
        <Marker key={i} position={m.position} icon={m.color === 'red' ? customIcon : blueIcon}>
          {m.label && (
            <Popup>
              <div className="font-semibold text-blue-600">{m.label}</div>
            </Popup>
          )}
        </Marker>
      ))}
        <RecenterAutomatically lat={center[0]} lng={center[1]} />
      </MapContainer>
    </>
  );
}
