import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import { cn } from '@/lib/utils';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  /** Accessible label; also the marker tooltip/list entry. */
  label: string;
  /** Optional richer popup HTML/text shown on click. */
  popup?: string;
}

export interface MapViewProps {
  markers: MapMarker[];
  /** Initial center; defaults to fitting all markers. */
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: number | string;
  onMarkerClick?: (marker: MapMarker) => void;
  className?: string;
  /** Accessible name for the map region. */
  ariaLabel?: string;
}

/** Token-styled marker pin (avoids Leaflet's broken default icon asset in Vite). */
function markerIcon() {
  return L.divIcon({
    className: 'arsam-map-pin',
    html:
      '<span data-entity="location" style="display:block;width:20px;height:20px;border-radius:9999px;' +
      'background:var(--color-primary);border:2px solid var(--color-background);' +
      'box-shadow:var(--shadow-md)"></span>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

/** Token-styled cluster badge with the child count. */
function clusterIcon(count: number) {
  return L.divIcon({
    className: 'arsam-map-cluster',
    html:
      '<span style="display:flex;align-items:center;justify-content:center;' +
      'width:34px;height:34px;border-radius:9999px;font:600 12px/1 var(--font-sans);' +
      'background:var(--color-chart-1);color:var(--color-primary-foreground);' +
      'border:2px solid var(--color-background);box-shadow:var(--shadow-md)">' +
      String(count) +
      '</span>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

/** Imperatively syncs markers into a markercluster group on the parent map. */
function ClusterLayer({
  markers,
  hasCenter,
  onMarkerClick,
}: {
  markers: MapMarker[];
  hasCenter: boolean;
  onMarkerClick?: (marker: MapMarker) => void;
}) {
  const map = useMap();
  const clickRef = useRef(onMarkerClick);

  // Keep the latest click handler without rebuilding the cluster group on identity change.
  useEffect(() => {
    clickRef.current = onMarkerClick;
  });

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => clusterIcon(cluster.getChildCount()),
    });

    for (const m of markers) {
      const marker = L.marker([m.lat, m.lng], {
        icon: markerIcon(),
        title: m.label,
        alt: m.label,
        keyboard: true,
      });
      if (m.popup) marker.bindPopup(m.popup);
      marker.on('click', () => clickRef.current?.(m));
      group.addLayer(marker);
    }

    map.addLayer(group);

    if (!hasCenter && markers.length > 0) {
      // `animate: false` — the initial fit should not animate, and it also avoids
      // a Leaflet zoom-transition callback firing after unmount (`_leaflet_pos`).
      map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 14, animate: false });
    }

    return () => {
      map.removeLayer(group);
    };
  }, [map, markers, hasCenter]);

  return null;
}

/**
 * Client-only, token-styled Leaflet map with marker clustering. Ships an
 * accessible alternative: an off-screen list of every marker (focusable buttons
 * that fire `onMarkerClick`) so the map is never the sole signal, plus a labelled
 * region and Leaflet's built-in keyboard panning.
 */
export function MapView({
  markers,
  center,
  zoom = 6,
  height = 320,
  onMarkerClick,
  className,
  ariaLabel = 'Harita görünümü',
}: MapViewProps) {
  const fallbackCenter = markers[0]
    ? { lat: markers[0].lat, lng: markers[0].lng }
    : { lat: 39.5, lng: 33.5 };
  const resolvedCenter = center ?? fallbackCenter;

  return (
    <div
      className={cn(
        'border-border bg-muted relative overflow-hidden rounded-lg border',
        className,
      )}
      style={{ height }}
      data-slot="map-view"
      role="region"
      aria-label={ariaLabel}
    >
      <MapContainer
          center={[resolvedCenter.lat, resolvedCenter.lng]}
          zoom={zoom}
          scrollWheelZoom={false}
          className="size-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClusterLayer
            markers={markers}
            hasCenter={center !== undefined}
            {...(onMarkerClick ? { onMarkerClick } : {})}
          />
        </MapContainer>

      {/* Accessible alternative: screen-reader / keyboard-navigable marker list. */}
      <ul className="sr-only" aria-label={`${ariaLabel} — işaretçi listesi`}>
        {markers.length === 0 ? (
          <li>Gösterilecek konum yok.</li>
        ) : (
          markers.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => onMarkerClick?.(m)} data-action="focus-marker" data-entity="location">
                {m.label}
                {m.popup ? ` — ${m.popup}` : ''}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
