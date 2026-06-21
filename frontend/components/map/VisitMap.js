"use client";

import Link from "next/link";
import { Crosshair, ExternalLink, Layers, List, LocateFixed, MapPin, Minus, Plus, Route } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import SentimentBadge from "@/components/debrief/SentimentBadge";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { cx, formatDate } from "@/lib/utils";

const TILE_SIZE = 256;

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
    latitude: clamp(latitude, -85, 85),
    longitude: ((longitude + 540) % 360) - 180,
  };
}

function featureCenter(features) {
  const lngs = features.map((item) => item.geometry.coordinates[0]);
  const lats = features.map((item) => item.geometry.coordinates[1]);
  return {
    latitude: lats.reduce((sum, value) => sum + value, 0) / lats.length,
    longitude: lngs.reduce((sum, value) => sum + value, 0) / lngs.length,
  };
}

function featureZoom(features) {
  if (features.length <= 1) return 13;
  const lngs = features.map((item) => item.geometry.coordinates[0]);
  const lats = features.map((item) => item.geometry.coordinates[1]);
  const spread = Math.max(Math.max(...lngs) - Math.min(...lngs), Math.max(...lats) - Math.min(...lats));
  if (spread < 0.03) return 13;
  if (spread < 0.2) return 11;
  if (spread < 1) return 9;
  return 6;
}

function pinTone(sentiment, blockerCount, mode) {
  if (mode === "blockers") {
    return blockerCount > 0 ? "bg-rose-600 ring-rose-200" : "bg-emerald-600 ring-emerald-200";
  }
  return {
    positive: "bg-emerald-600 ring-emerald-200",
    neutral: "bg-sky-600 ring-sky-200",
    negative: "bg-rose-600 ring-rose-200",
    mixed: "bg-amber-500 ring-amber-200",
  }[sentiment] || "bg-slate-500 ring-slate-200";
}

function selectedDistricts(features) {
  return [...new Set(features.map((feature) => districtFromFeature(feature)).filter(Boolean))].sort();
}

function districtFromFeature(feature) {
  const label = feature.properties.location_label || "";
  const parts = label.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export default function VisitMap({ features = [] }) {
  const [selectedId, setSelectedId] = useState(features[0]?.properties?.id || null);
  const [zoom, setZoom] = useState(() => (features.length ? featureZoom(features) : 5));
  const [center, setCenter] = useState(() => (features.length ? featureCenter(features) : { latitude: 20.5937, longitude: 78.9629 }));
  const [size, setSize] = useState({ width: 720, height: 520 });
  const [colorMode, setColorMode] = useState("sentiment");
  const [districtFilter, setDistrictFilter] = useState("");
  const [showList, setShowList] = useState(false);
  const mapRef = useRef(null);
  const dragRef = useRef(null);

  const districts = useMemo(() => selectedDistricts(features), [features]);
  const visibleFeatures = useMemo(
    () => features.filter((feature) => !districtFilter || districtFromFeature(feature) === districtFilter),
    [features, districtFilter]
  );

  const selected = visibleFeatures.find((feature) => feature.properties.id === selectedId) || visibleFeatures[0];

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
    if (!visibleFeatures.length) return;
    setSelectedId((current) => visibleFeatures.some((feature) => feature.properties.id === current) ? current : visibleFeatures[0].properties.id);
    setCenter(featureCenter(visibleFeatures));
    setZoom(featureZoom(visibleFeatures));
  }, [visibleFeatures]);

  useEffect(() => {
    if (!features.length) return;
    fitVisible();
  }, [features.length]);

  function selectFeature(feature, shouldCenter = true) {
    setSelectedId(feature.properties.id);
    if (shouldCenter) {
      const [longitude, latitude] = feature.geometry.coordinates;
      setCenter({ latitude, longitude });
      setZoom((value) => Math.max(value, 12));
    }
  }

  function fitVisible() {
    if (!visibleFeatures.length) return;
    setCenter(featureCenter(visibleFeatures));
    setZoom(featureZoom(visibleFeatures));
  }

  function centerSelected() {
    if (!selected) return;
    selectFeature(selected, true);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      setCenter({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setZoom(13);
    });
  }

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

  if (!features.length) {
    return <EmptyState title="No geotagged visits">Capture live geotags while logging to populate the map.</EmptyState>;
  }

  if (!visibleFeatures.length) {
    return (
      <div className="grid gap-4">
        <MapToolbar
          districts={districts}
          districtFilter={districtFilter}
          setDistrictFilter={setDistrictFilter}
          colorMode={colorMode}
          setColorMode={setColorMode}
          showList={showList}
          setShowList={setShowList}
          fitVisible={fitVisible}
          centerSelected={centerSelected}
          useMyLocation={useMyLocation}
        />
        <EmptyState title="No visits in this filter">Clear the district filter to see all pins.</EmptyState>
      </div>
    );
  }

  const centerPixel = lonLatToPixel(center.longitude, center.latitude, zoom);

  function onPointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCenterPixel: lonLatToPixel(center.longitude, center.latitude, zoom),
    };
  }

  function onPointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setCenter(pixelToLonLat(drag.startCenterPixel.x - dx, drag.startCenterPixel.y - dy, zoom));
  }

  function onPointerEnd() {
    dragRef.current = null;
  }

  return (
    <div className="grid gap-4">
      <MapToolbar
        districts={districts}
        districtFilter={districtFilter}
        setDistrictFilter={setDistrictFilter}
        colorMode={colorMode}
        setColorMode={setColorMode}
        showList={showList}
        setShowList={setShowList}
        fitVisible={fitVisible}
        centerSelected={centerSelected}
        useMyLocation={useMyLocation}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="app-surface overflow-hidden rounded-xl p-2">
          <div
            ref={mapRef}
            className="relative h-[62vh] min-h-[360px] touch-none overflow-hidden rounded-lg bg-slate-100"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
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

            <div className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-200">
              {visibleFeatures.length} visible visits
            </div>

            <div className="absolute right-3 top-3 grid gap-2" onPointerDown={(event) => event.stopPropagation()}>
              <Button variant="secondary" size="icon" onClick={() => setZoom((value) => clamp(value + 1, 3, 18))} aria-label="Zoom in">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" onClick={() => setZoom((value) => clamp(value - 1, 3, 18))} aria-label="Zoom out">
                <Minus className="h-4 w-4" />
              </Button>
            </div>

            <div className="pointer-events-none absolute inset-0 z-20">
              {visibleFeatures.map((feature) => {
                const [longitude, latitude] = feature.geometry.coordinates;
                const markerPixel = lonLatToPixel(longitude, latitude, zoom);
                const left = size.width / 2 + markerPixel.x - centerPixel.x;
                const top = size.height / 2 + markerPixel.y - centerPixel.y;
                const props = feature.properties;
                const active = props.id === selected.properties.id;
                return (
                  <button
                    key={props.id}
                    type="button"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                    }}
                    onPointerUp={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      selectFeature(feature, true);
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectFeature(feature, true);
                    }}
                    className="pointer-events-auto absolute h-14 w-14 -translate-x-1/2 -translate-y-full touch-manipulation rounded-full"
                    style={{ left, top }}
                    aria-label={`Show ${props.location_label}`}
                  >
                    <span
                      className={cx(
                        "mx-auto grid h-10 w-10 place-items-center rounded-full text-white shadow-lg ring-8 transition hover:scale-110",
                        pinTone(props.sentiment, props.blocker_count, colorMode),
                        active && "scale-125 ring-teal-200"
                      )}
                    >
                      <MapPin className="h-5 w-5" />
                    </span>
                  </button>
                );
              })}
            </div>

            {selected ? <SelectedPopup feature={selected} centerPixel={centerPixel} zoom={zoom} size={size} /> : null}

            <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-600">
              OpenStreetMap
            </div>
          </div>
        </div>

        <VisitDetails feature={selected} />
      </div>

      {showList ? <VisitList features={visibleFeatures} selected={selected} onSelect={selectFeature} /> : null}
    </div>
  );
}

function SelectedPopup({ feature, centerPixel, zoom, size }) {
  const [longitude, latitude] = feature.geometry.coordinates;
  const markerPixel = lonLatToPixel(longitude, latitude, zoom);
  const left = size.width / 2 + markerPixel.x - centerPixel.x;
  const top = size.height / 2 + markerPixel.y - centerPixel.y;
  const props = feature.properties;

  return (
    <div
      className="pointer-events-none absolute z-30 hidden w-64 -translate-x-1/2 rounded-lg bg-white p-3 text-left shadow-xl ring-1 ring-slate-200 min-[520px]:block"
      style={{ left, top: top - 62 }}
    >
      <p className="truncate text-sm font-black text-slate-950">{props.location_label || "Pinned visit"}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{props.first_finding || "Open details on the side panel."}</p>
    </div>
  );
}

function MapToolbar({
  districts,
  districtFilter,
  setDistrictFilter,
  colorMode,
  setColorMode,
  showList,
  setShowList,
  fitVisible,
  centerSelected,
  useMyLocation,
}) {
  return (
    <div className="app-surface grid gap-2 rounded-xl p-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid gap-2 min-[520px]:grid-cols-2">
        <select
          value={districtFilter}
          onChange={(event) => setDistrictFilter(event.target.value)}
          className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none"
        >
          <option value="">All districts</option>
          {districts.map((district) => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>

        <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setColorMode("sentiment")}
            className={cx("min-h-9 rounded-md text-xs font-black", colorMode === "sentiment" ? "bg-white text-teal-800 shadow-sm" : "text-slate-500")}
          >
            Sentiment
          </button>
          <button
            type="button"
            onClick={() => setColorMode("blockers")}
            className={cx("min-h-9 rounded-md text-xs font-black", colorMode === "blockers" ? "bg-white text-teal-800 shadow-sm" : "text-slate-500")}
          >
            Blockers
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Button variant="secondary" size="icon" onClick={fitVisible} aria-label="Fit all pins">
          <Route className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={centerSelected} aria-label="Center selected visit">
          <Crosshair className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={useMyLocation} aria-label="Center my location">
          <LocateFixed className="h-4 w-4" />
        </Button>
        <Button variant={showList ? "primary" : "secondary"} size="icon" onClick={() => setShowList((value) => !value)} aria-label="Toggle visit list">
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function VisitDetails({ feature }) {
  const props = feature.properties;
  const [longitude, latitude] = feature.geometry.coordinates;

  return (
    <aside className="app-surface rounded-xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">Selected visit</p>
          <h2 className="mt-1 text-xl font-black leading-tight text-slate-950">{props.location_label || "Pinned visit"}</h2>
        </div>
        <SentimentBadge sentiment={props.sentiment} />
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        <InfoRow label="Date" value={formatDate(props.visit_date)} />
        <InfoRow label="Visitor" value={props.visitor_name || "Not recorded"} />
        <InfoRow label="PIN" value={props.postal_code || "Not captured"} />
        <InfoRow label="Coordinates" value={`${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`} />
        <InfoRow label="Blockers" value={`${props.blocker_count || 0}`} />
      </div>

      <div className="mt-5 rounded-lg bg-white p-4 ring-1 ring-slate-200">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">First finding</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{props.first_finding || "No generated finding yet."}</p>
      </div>

      <Link href={`/debrief/${props.id}`} className="mt-5 block">
        <Button className="w-full">
          View full debrief
          <ExternalLink className="h-4 w-4" />
        </Button>
      </Link>
    </aside>
  );
}

function VisitList({ features, selected, onSelect }) {
  return (
    <section className="app-surface rounded-xl p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
        <Layers className="h-4 w-4 text-teal-700" />
        Visible visits
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => {
          const props = feature.properties;
          const active = props.id === selected.properties.id;
          return (
            <button
              key={props.id}
              type="button"
              onClick={() => onSelect(feature, true)}
              className={cx(
                "rounded-lg border bg-white p-3 text-left transition",
                active ? "border-teal-400 ring-4 ring-teal-100" : "border-slate-200 hover:border-teal-200"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-black text-slate-950">{props.location_label || "Pinned visit"}</p>
                <SentimentBadge sentiment={props.sentiment} />
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{props.first_finding || "No finding yet."}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className="text-right font-bold text-slate-800">{value}</span>
    </div>
  );
}
