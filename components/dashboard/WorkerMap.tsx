'use client';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { WorkerLocation } from '@/types';

// ÔöÇÔöÇ Fit-bounds helper ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
// Adjusts the map viewport to show all markers whenever the locations list changes.
function FitBounds({ locations }: { locations: WorkerLocation[] }) {
  const map = useMap();
  const prevLen = useRef(0);

  useEffect(() => {
    const locs = locations.filter(l => l.lat !== 0 || l.lng !== 0);
    if (locs.length === 0) return;

    // Only re-fit when the number of visible workers changes (avoids jitter on
    // every heartbeat while already correctly centred).
    if (locs.length === prevLen.current && locs.length > 1) return;
    prevLen.current = locs.length;

    if (locs.length === 1) {
      map.setView([locs[0].lat, locs[0].lng], 15);
    } else {
      const L = require('leaflet');
      const bounds = L.latLngBounds(locs.map(l => [l.lat, l.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [locations, map]);

  return null;
}

// ÔöÇÔöÇ Colour palette ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
const STATUS_COLOUR: Record<string, string> = {
  emergency: '#E53935',
  active:    '#4CAF50',
  offline:   '#607D8B',
};

// ÔöÇÔöÇ Main map component ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

interface WorkerMapProps {
  /** Live worker positions from EmergencyContext.workerLocations */
  locations: WorkerLocation[];
  /** Fallback centre when no locations are available yet */
  defaultCenter?: [number, number];
  zoom?: number;
}

export default function WorkerMap({
  locations,
  defaultCenter = [36.7372, 3.0869], // Algiers
  zoom = 12,
}: WorkerMapProps) {
  // Guard: only render on the client (Leaflet is SSR-incompatible)
  if (typeof window === 'undefined') return null;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={zoom}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 10 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* One CircleMarker per worker */}
      {locations.map(loc => {
        const colour = STATUS_COLOUR[loc.status] ?? STATUS_COLOUR.offline;
        const isEmergency = loc.status === 'emergency';

        return (
          <CircleMarker
            key={loc.userId}
            center={[loc.lat, loc.lng]}
            radius={isEmergency ? 12 : 9}
            pathOptions={{
              color:       colour,
              fillColor:   colour,
              fillOpacity: 0.9,
              weight:      isEmergency ? 3 : 2,
            }}
          >
            <Popup>
              <div style={{ minWidth: 160, fontFamily: 'Inter, sans-serif' }}>
                {/* Status badge */}
                <div style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  background: colour + '22',
                  color: colour,
                  border: `1px solid ${colour}55`,
                  marginBottom: 6,
                }}>
                  {isEmergency ? '­ƒÜ¿ Urgence' : 'Ô£à Actif'}
                </div>

                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                  {loc.fullName}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                  Badge: {loc.employeeId}
                </div>
                <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                </div>

                {/* Open in Google Maps */}
                <a
                  href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    marginTop: 8,
                    fontSize: 11,
                    color: '#2196F3',
                    textDecoration: 'none',
                  }}
                >
                  ­ƒôì Ouvrir dans Maps
                </a>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      <FitBounds locations={locations} />
    </MapContainer>
  );
}
