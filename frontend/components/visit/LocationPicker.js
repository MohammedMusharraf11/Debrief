"use client";

import { Crosshair, Loader2, MapPin } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import TileLocationMap from "@/components/visit/TileLocationMap";

function cleanDistrict(value = "") {
  return value.replace(/\s+District$/i, "").trim();
}

function pickAddressParts(address = {}) {
  return {
    state: address.state || "",
    district: cleanDistrict(address.state_district || address.county || address.district || ""),
    village: address.village || address.hamlet || address.town || address.city || address.suburb || address.neighbourhood || "",
    postal_code: address.postcode || "",
  };
}

async function reverseGeocode(latitude, longitude) {
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "18",
    "accept-language": "en",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
  if (!response.ok) throw new Error("Could not resolve address.");
  const payload = await response.json();
  return pickAddressParts(payload.address || {});
}

async function forwardGeocode({ state, district, village, postal_code }) {
  const query = [postal_code, village, district, state, "India"].filter(Boolean).join(", ");
  if (!state && !district && !village && !postal_code) return null;

  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
    countrycodes: "in",
    q: query,
    "accept-language": "en",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!response.ok) throw new Error("Could not move map to selected location.");
  const payload = await response.json();
  if (!payload[0]) return null;
  return {
    latitude: Number(Number(payload[0].lat).toFixed(6)),
    longitude: Number(Number(payload[0].lon).toFixed(6)),
  };
}

function zoomForLocation({ district, village, postal_code }) {
  if (postal_code || village) return 14;
  if (district) return 10;
  return 7;
}

export default function LocationPicker({
  state,
  district,
  village,
  postal_code,
  latitude,
  longitude,
  onChange,
}) {
  const [resolving, setResolving] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [targetZoom, setTargetZoom] = useState(5);
  const lastQueryRef = useRef("");
  const hasLocation = latitude !== "" && longitude !== "" && latitude != null && longitude != null;

  const locationQuery = useMemo(
    () => JSON.stringify({ state, district, village, postal_code }),
    [state, district, village, postal_code]
  );

  useEffect(() => {
    const query = JSON.parse(locationQuery);
    const hasQuery = query.state || query.district || query.village || query.postal_code;
    if (!hasQuery || lastQueryRef.current === locationQuery) return;

    const timer = window.setTimeout(async () => {
      lastQueryRef.current = locationQuery;
      try {
        const coords = await forwardGeocode(query);
        if (coords) {
          setTargetZoom(zoomForLocation(query));
          onChange(coords);
        }
      } catch (error) {
        setGeoError(error.message || "Could not move map to selected location.");
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [locationQuery, onChange]);

  function useLocation() {
    if (!navigator.geolocation) return;
    setResolving(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        };
        try {
          const address = await reverseGeocode(coords.latitude, coords.longitude);
          setTargetZoom(15);
          onChange({ ...coords, ...address });
        } catch (error) {
          setGeoError(error.message || "GPS found coordinates, but address lookup failed.");
          onChange(coords);
        } finally {
          setResolving(false);
        }
      },
      () => {
        setGeoError("Could not access GPS. You can still tap the map or enter coordinates.");
        setResolving(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function selectFromMap(coords) {
    setResolving(true);
    setGeoError("");
    try {
      const address = await reverseGeocode(coords.latitude, coords.longitude);
      setTargetZoom(15);
      onChange({ ...coords, ...address });
    } catch (error) {
      setGeoError(error.message || "Marker set, but address lookup failed.");
      onChange(coords);
    } finally {
      setResolving(false);
    }
  }

  function updateManual(key, value) {
    onChange({
      latitude,
      longitude,
      [key]: value,
    });
  }

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-700">
            <MapPin className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900">Visit location</p>
            <p className="truncate text-xs text-slate-500">
              {hasLocation ? `${latitude}, ${longitude}` : "Use GPS, dropdowns, PIN code, or tap the map"}
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={useLocation} disabled={resolving}>
          {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          {resolving ? "Finding" : "GPS"}
        </Button>
      </div>

      <TileLocationMap latitude={latitude} longitude={longitude} targetZoom={targetZoom} onChange={selectFromMap} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude">
          <Input inputMode="decimal" value={latitude} onChange={(event) => updateManual("latitude", event.target.value)} placeholder="12.9716" />
        </Field>
        <Field label="Longitude">
          <Input inputMode="decimal" value={longitude} onChange={(event) => updateManual("longitude", event.target.value)} placeholder="77.5946" />
        </Field>
      </div>
      {geoError ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{geoError}</p> : null}
    </div>
  );
}
