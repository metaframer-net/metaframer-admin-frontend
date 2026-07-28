import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { MapView, type MapMarker } from '@/components/data/MapView';
import { EmptyState } from '@/components/feedback/EmptyState';
import { CATEGORY_LABELS, LOCATIONS } from '../data/taxonomy';
import { DEFAULT_CENTER, listingLatLng } from '../data/geo';
import type { Listing } from '../schemas/listing';

export interface ListingsMapProps {
  listings: Listing[];
}

/** Leaflet renders string popups as HTML — escape user-submitted text. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Location-first view: current-page listings plotted with marker clustering
 * (reuses the shared token-styled MapView). Coordinates are derived from the
 * il/ilçe centroid + a deterministic per-listing jitter (mock until the backend
 * ships real geo). Clicking a marker opens the detail page.
 *
 * Imported lazily by the page so Leaflet stays out of the main listings chunk.
 */
export function ListingsMap({ listings }: ListingsMapProps) {
  const navigate = useNavigate();
  const markers = useMemo<MapMarker[]>(
    () =>
      listings.map((l) => {
        const { lat, lng } = listingLatLng(l) ?? DEFAULT_CENTER;
        return {
          id: l.id,
          lat,
          lng,
          label: l.title,
          popup: `${esc(l.title)} — ${esc(LOCATIONS[l.il]?.label ?? l.il)} · ${CATEGORY_LABELS[l.category]} · ${l.price.toLocaleString('tr-TR')} ₺`,
        };
      }),
    [listings],
  );

  if (listings.length === 0) {
    return <EmptyState title="Kayıt bulunamadı" description="Filtreleri değiştirin ya da yeni bir ilan oluşturun." />;
  }

  return (
    <MapView
      markers={markers}
      height={520}
      ariaLabel="İlan konumları haritası"
      onMarkerClick={(m) => navigate(`/listings/${m.id}`)}
    />
  );
}
