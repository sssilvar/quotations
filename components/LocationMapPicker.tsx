"use client";

import { useCallback } from "react";
import { useMapEvents } from "react-leaflet";
import {
  Map,
  MapMarker,
  MapTileLayer,
  MapZoomControl,
} from "@/components/ui/map";
import { cn } from "@/lib/utils";

const DEFAULT_CENTER: [number, number] = [4.5709, -74.2973]; // Colombia
const DEFAULT_ZOOM = 10;
const DETAIL_ZOOM = 17;

function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) });
  return null;
}

type Props = {
  lat?: number | null;
  lng?: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  height?: number;
  className?: string;
  readOnly?: boolean;
};

export function LocationMapPicker({
  lat,
  lng,
  onLocationChange,
  height = 200,
  className,
  readOnly = false,
}: Props) {
  const hasCoords = lat != null && lng != null;
  const position = hasCoords ? ([lat, lng] as [number, number]) : null;

  const center: [number, number] = position ?? DEFAULT_CENTER;
  const zoom = position ? DETAIL_ZOOM : DEFAULT_ZOOM;
  const allowMapGestures = !readOnly;

  const handleSelect = useCallback(
    (newLat: number, newLng: number) => {
      if (readOnly) return;
      onLocationChange(newLat, newLng);
    },
    [onLocationChange, readOnly]
  );

  return (
    <div className={cn("min-h-0 overflow-hidden", className)} style={{ height }}>
      <Map
        center={center}
        zoom={zoom}
        className="h-full w-full min-h-0 rounded-lg border"
        dragging={allowMapGestures}
        scrollWheelZoom={allowMapGestures}
        doubleClickZoom={allowMapGestures}
        touchZoom={allowMapGestures}
        boxZoom={!readOnly}
        keyboard={!readOnly}
      >
        <MapTileLayer />
        {!readOnly && <MapClickHandler onSelect={handleSelect} />}
        {position && (
          <MapMarker
            position={position}
            draggable={!readOnly}
            eventHandlers={
              readOnly
                ? undefined
                : {
                    dragend: (e) => {
                      const ll = e.target.getLatLng();
                      onLocationChange(ll.lat, ll.lng);
                    },
                  }
            }
          />
        )}
        <MapZoomControl
          homeCenter={position}
          homeZoom={DETAIL_ZOOM}
          homeLabel="Centrar en la ubicacion guardada"
        />
      </Map>
    </div>
  );
}
