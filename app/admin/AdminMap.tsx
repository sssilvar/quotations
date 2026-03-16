"use client";

import {
  Map,
  MapMarker,
  MapMarkerClusterGroup,
  MapPopup,
  MapTileLayer,
  MapZoomControl,
} from "@/components/ui/map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPinIcon } from "lucide-react";
import Link from "next/link";

type Quotation = {
  id: string;
  shareableId: string;
  clientName: string;
  isOfficial: boolean;
  latitude?: number | null;
  longitude?: number | null;
  userId: string;
  user: { username: string; name?: string | null; lastName?: string | null; email?: string | null };
};

type Props = {
  quotations: Quotation[];
  userColorMap: Record<string, string>;
};

function ClusterIcon({ count }: { count: number }) {
  return (
    <div
      className="flex size-10 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-md"
      style={{ backgroundColor: "var(--map-pin)" }}
    >
      {count}
    </div>
  );
}

export function AdminMap({ quotations, userColorMap }: Props) {
  const geoQ = quotations.filter(
    (q) => q.latitude != null && q.longitude != null
  );

  if (!geoQ.length) return null;

  const avgLat = geoQ.reduce((s, q) => s + q.latitude!, 0) / geoQ.length;
  const avgLng = geoQ.reduce((s, q) => s + q.longitude!, 0) / geoQ.length;

  return (
    <div style={{ height: 380 }} className="min-h-0 overflow-hidden rounded-lg">
      <Map
        center={[avgLat, avgLng]}
        zoom={9}
        className="h-full w-full min-h-0 rounded-lg border"
      >
        <MapTileLayer />
        <MapZoomControl />
        <MapMarkerClusterGroup
          icon={(count) => <ClusterIcon count={count} />}
          chunkedLoading
        >
          {geoQ.map((q) => (
            <MapMarker
              key={q.id}
              position={[q.latitude!, q.longitude!]}
              icon={
                <MapPinIcon
                  className="size-6"
                  style={{
                    color: userColorMap[q.userId] ?? "var(--map-pin)",
                    fill: userColorMap[q.userId] ?? "var(--map-pin)",
                    fillOpacity: 0.3,
                  }}
                />
              }
            >
              <MapPopup>
                <div className="min-w-[200px] space-y-2 text-left">
                  <h3 className="leading-tight text-foreground" style={{ fontWeight: 700, fontSize: "1rem" }}>
                    {q.clientName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {[q.user.name, q.user.lastName].filter(Boolean).join(" ") || q.user.email || q.user.username}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={q.isOfficial ? "default" : "secondary"} className="text-xs">
                      {q.isOfficial ? "Oficial" : "Pre-cot."}
                    </Badge>
                    <Link href={`/q/${q.shareableId}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                        <ExternalLink className="size-3" /> Abrir
                      </Button>
                    </Link>
                  </div>
                </div>
              </MapPopup>
            </MapMarker>
          ))}
        </MapMarkerClusterGroup>
      </Map>
    </div>
  );
}
