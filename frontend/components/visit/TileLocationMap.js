"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";

const TILE_SIZE = 256;
const DEFAULT_CENTER = { latitude: 20.5937, longitude: 78.9629 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lonLatToPixel(longitude, latitude, zoom) {
  const safeLat = clamp(latitude, -85, 85);
  const sinLat = Math.sin((safeLat * Math.PI) / 180);
  const scale = TILE_SIZE * 2 ** zoom;
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function pixelToLonLat(x, y, zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const latitude = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return {
    latitude: Number(clamp(latitude, -85, 85).toFixed(6)),
    longitude: Number((((longitude + 540) % 360) - 180).toFixed(6)),
  };
}

export default function TileLocationMap({ latitude, longitude, targetZoom, onChange }) {
  const mapRef = useRef(null);
  const dragRef = useRef(null);
  const [zoom, setZoom] = useState(latitude && longitude ? 14 : 5);
  const [size, setSize] = useState({ width: 360, height: 256 });
  const [center, setCenter] = useState(() => ({
    latitude: Number(latitude) || DEFAULT_CENTER.latitude,
    longitude: Number(longitude) || DEFAULT_CENTER.longitude,
  }));

  const selected = latitude !== "" && longitude !== "" && latitude != null && longitude != null
    ? { latitude: Number(latitude), longitude: Number(longitude) }
    : null;

  useEffect(() => {
    if (!mapRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(1, Math.round(entry.contentRect.width)),
        height: Math.max(1, Math.round(entry.contentRect.height)),
      });
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (selected) setCenter(selected);
  }, [latitude, longitude]);

  useEffect(() => {
    if (targetZoom) setZoom(clamp(targetZoom, 3, 18));
  }, [targetZoom]);

  const tiles = useMemo(() => {
    const centerPixel = lonLatToPixel(center.longitude, center.latitude, zoom);
    const minTileX = Math.floor((centerPixel.x - size.width / 2) / TILE_SIZE);
    const maxTileX = Math.floor((centerPixel.x + size.width / 2) / TILE_SIZE);
    const minTileY = Math.floor((centerPixel.y - size.height / 2) / TILE_SIZE);
    const maxTileY = Math.floor((centerPixel.y + size.height / 2) / TILE_SIZE);
    const maxIndex = 2 ** zoom;
    const output = [];

    for (let x = minTileX; x <= maxTileX; x += 1) {
      for (let y = minTileY; y <= maxTileY; y += 1) {
        if (y < 0 || y >= maxIndex) continue;
        const wrappedX = ((x % maxIndex) + maxIndex) % maxIndex;
        output.push({
          key: `${zoom}-${x}-${y}`,
          src: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
          left: x * TILE_SIZE - (centerPixel.x - size.width / 2),
          top: y * TILE_SIZE - (centerPixel.y - size.height / 2),
        });
      }
    }
    return output;
  }, [center, zoom, size]);

  function pointToLocation(clientX, clientY) {
    const rect = mapRef.current.getBoundingClientRect();
    const centerPixel = lonLatToPixel(center.longitude, center.latitude, zoom);
    const x = centerPixel.x - rect.width / 2 + (clientX - rect.left);
    const y = centerPixel.y - rect.height / 2 + (clientY - rect.top);
    return pixelToLonLat(x, y, zoom);
  }

  function onPointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCenterPixel: lonLatToPixel(center.longitude, center.latitude, zoom),
      moved: false,
    };
  }

  function onPointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    setCenter(pixelToLonLat(drag.startCenterPixel.x - dx, drag.startCenterPixel.y - dy, zoom));
  }

  function onPointerUp(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved) {
      const next = pointToLocation(event.clientX, event.clientY);
      setCenter(next);
      onChange(next);
    }
    dragRef.current = null;
  }

  const markerPosition = selected
    ? (() => {
        const centerPixel = lonLatToPixel(center.longitude, center.latitude, zoom);
        const markerPixel = lonLatToPixel(selected.longitude, selected.latitude, zoom);
        return {
          left: size.width / 2 + markerPixel.x - centerPixel.x,
          top: size.height / 2 + markerPixel.y - centerPixel.y,
        };
      })()
    : null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div
        ref={mapRef}
        className="relative h-[clamp(180px,34vh,256px)] touch-none overflow-hidden bg-slate-100"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute h-64 w-64 select-none"
            style={{ left: tile.left, top: tile.top }}
          />
        ))}
        {markerPosition ? (
          <div
            className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-full rounded-full bg-rose-600 text-white shadow-lg ring-4 ring-white"
            style={{ left: markerPosition.left, top: markerPosition.top }}
          >
            <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-rose-600" />
          </div>
        ) : null}
        <div className="absolute right-3 top-3 grid gap-2" onPointerDown={(event) => event.stopPropagation()}>
          <Button variant="secondary" size="icon" onClick={() => setZoom((value) => clamp(value + 1, 3, 18))} aria-label="Zoom in">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" onClick={() => setZoom((value) => clamp(value - 1, 3, 18))} aria-label="Zoom out">
            <Minus className="h-4 w-4" />
          </Button>
        </div>
        <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-600">
          OpenStreetMap
        </div>
      </div>
      <p className="px-3 py-2 text-xs font-semibold text-slate-500">
        Tap to place the marker. Drag to move around the map.
      </p>
    </div>
  );
}
