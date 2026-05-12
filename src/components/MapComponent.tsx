'use client';

import { PointerEvent, WheelEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Location } from '@/utils/csvParser';
import { Position } from '@/utils/geolocation';

interface MapComponentProps {
  currentLocation: Position | null;
  selectedLocation: Location | null;
  onLocationClick: (location: Location) => void;
  locations: Location[];
}

type RouteResult = {
  key: string;
  coordinates: Array<[number, number]>;
};

const defaultCenter = {
  lat: 25.5,
  lng: 82.32,
};

const tileSize = 256;
const minZoom = 3;
const maxZoom = 18;

const buildDirectionsUrl = (origin: Position, destination: Location) => {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const project = (latitude: number, longitude: number, zoom: number) => {
  const sin = Math.sin((latitude * Math.PI) / 180);
  const scale = tileSize * 2 ** zoom;

  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
};

const getBounds = (locations: Location[], currentLocation: Position | null) => {
  const points = [
    ...locations.map((location) => ({
      latitude: location.latitude,
      longitude: location.longitude,
    })),
    ...(currentLocation ? [currentLocation] : []),
  ];

  if (!points.length) {
    return {
      minLat: defaultCenter.lat,
      maxLat: defaultCenter.lat,
      minLng: defaultCenter.lng,
      maxLng: defaultCenter.lng,
    };
  }

  return points.reduce(
    (bounds, point) => ({
      minLat: Math.min(bounds.minLat, point.latitude),
      maxLat: Math.max(bounds.maxLat, point.latitude),
      minLng: Math.min(bounds.minLng, point.longitude),
      maxLng: Math.max(bounds.maxLng, point.longitude),
    }),
    {
      minLat: points[0].latitude,
      maxLat: points[0].latitude,
      minLng: points[0].longitude,
      maxLng: points[0].longitude,
    }
  );
};

const getZoomForBounds = (
  bounds: ReturnType<typeof getBounds>,
  width: number,
  height: number
) => {
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.01);
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 0.01);
  const latZoom = Math.log2((height * 360) / (latSpan * tileSize));
  const lngZoom = Math.log2((width * 360) / (lngSpan * tileSize));

  return clamp(Math.floor(Math.min(latZoom, lngZoom)) - 1, minZoom, maxZoom);
};

export const MapComponent: React.FC<MapComponentProps> = ({
  currentLocation,
  selectedLocation,
  onLocationClick,
  locations,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    pointerId: 0,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });
  const [size, setSize] = useState({ width: 390, height: 720 });
  const [zoomOffset, setZoomOffset] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (!mapRef.current) return;

      setSize({
        width: mapRef.current.clientWidth || 390,
        height: mapRef.current.clientHeight || 720,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    if (mapRef.current) observer.observe(mapRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!currentLocation || !selectedLocation) return;

    const routeKey = `${currentLocation.latitude},${currentLocation.longitude}-${selectedLocation.fid}`;
    const controller = new AbortController();

    const loadRoute = async () => {
      try {
        const origin = `${currentLocation.longitude},${currentLocation.latitude}`;
        const destination = `${selectedLocation.longitude},${selectedLocation.latitude}`;
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin};${destination}?overview=full&geometries=geojson`,
          { signal: controller.signal }
        );
        const data = (await response.json()) as {
          routes?: Array<{ geometry?: { coordinates?: Array<[number, number]> } }>;
        };
        const coordinates = data.routes?.[0]?.geometry?.coordinates;

        if (coordinates?.length) {
          setRoute({ key: routeKey, coordinates });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.warn('Route request failed:', error);
      }
    };

    loadRoute();

    return () => controller.abort();
  }, [currentLocation, selectedLocation]);

  const bounds = useMemo(
    () => getBounds(locations, currentLocation),
    [locations, currentLocation]
  );

  const baseZoom = useMemo(
    () => getZoomForBounds(bounds, size.width, size.height),
    [bounds, size]
  );

  const zoom = clamp(baseZoom + zoomOffset, minZoom, maxZoom);
  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;
  const center = selectedLocation
    ? { lat: selectedLocation.latitude, lng: selectedLocation.longitude }
    : {
        lat: (bounds.minLat + bounds.maxLat) / 2,
        lng: (bounds.minLng + bounds.maxLng) / 2,
      };

  const centerPoint = project(center.lat, center.lng, zoom);
  const topLeft = {
    x: centerPoint.x - size.width / 2 - panOffset.x,
    y: centerPoint.y - size.height / 2 - panOffset.y,
  };

  const visibleTiles = useMemo(() => {
    const startX = Math.floor(topLeft.x / tileSize);
    const endX = Math.floor((topLeft.x + size.width) / tileSize);
    const startY = Math.floor(topLeft.y / tileSize);
    const endY = Math.floor((topLeft.y + size.height) / tileSize);
    const maxTile = 2 ** zoom;
    const tiles = [];

    for (let x = startX; x <= endX; x += 1) {
      for (let y = startY; y <= endY; y += 1) {
        if (y < 0 || y >= maxTile) continue;

        const wrappedX = ((x % maxTile) + maxTile) % maxTile;
        tiles.push({
          key: `${zoom}-${x}-${y}`,
          url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
          left: x * tileSize - topLeft.x,
          top: y * tileSize - topLeft.y,
        });
      }
    }

    return tiles;
  }, [size, topLeft.x, topLeft.y, zoom]);

  const getScreenPoint = (latitude: number, longitude: number) => {
    const point = project(latitude, longitude, zoom);

    return {
      x: point.x - topLeft.x,
      y: point.y - topLeft.y,
    };
  };

  const selectedPoint = selectedLocation
    ? getScreenPoint(selectedLocation.latitude, selectedLocation.longitude)
    : null;

  const currentPoint = currentLocation
    ? getScreenPoint(currentLocation.latitude, currentLocation.longitude)
    : null;

  const directionsUrl = currentLocation && selectedLocation ? buildDirectionsUrl(currentLocation, selectedLocation) : null;
  const activeRouteKey =
    currentLocation && selectedLocation
      ? `${currentLocation.latitude},${currentLocation.longitude}-${selectedLocation.fid}`
      : '';
  const routePoints =
    route?.key === activeRouteKey
      ? route.coordinates.map(([longitude, latitude]) => getScreenPoint(latitude, longitude))
      : currentPoint && selectedPoint
      ? [currentPoint, selectedPoint]
      : [];

  const handleZoomIn = () => {
    setZoomOffset((value) => clamp(value + 1, minZoom - baseZoom, maxZoom - baseZoom));
  };

  const handleZoomOut = () => {
    setZoomOffset((value) => clamp(value - 1, minZoom - baseZoom, maxZoom - baseZoom));
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;

    setZoomOffset((value) => clamp(value + direction, minZoom - baseZoom, maxZoom - baseZoom));
  };

  const shouldIgnoreDrag = (target: EventTarget) => {
    return target instanceof HTMLElement && Boolean(target.closest('button, a, input, select, label'));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (shouldIgnoreDrag(event.target)) return;

    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    setPanOffset({
      x: drag.startPanX + event.clientX - drag.startX,
      y: drag.startPanY + event.clientY - drag.startY,
    });
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    dragRef.current.active = false;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={mapRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className={`relative h-full w-full touch-none overflow-hidden bg-[#d8e5d2] ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {visibleTiles.map((tile) => (
        // Map tiles are remote slippy-map images; next/image cannot optimize this dynamic grid.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={tile.key}
          alt=""
          src={tile.url}
          className="absolute h-64 w-64 select-none"
          style={{ left: tile.left, top: tile.top }}
          draggable={false}
        />
      ))}

      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {routePoints.length > 1 && (
          <polyline
            points={routePoints.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke="#2563eb"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="5"
            strokeDasharray={route?.key === activeRouteKey ? undefined : '10 8'}
          />
        )}
      </svg>

      {currentPoint && (
        <div
          className="absolute z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow-lg ring-4 ring-blue-500/25"
          style={{ left: currentPoint.x, top: currentPoint.y }}
          title="Your location"
        />
      )}

      {locations.map((location) => {
        const point = getScreenPoint(location.latitude, location.longitude);
        const active = selectedLocation?.fid === location.fid;

        return (
          <button
            key={location.fid}
            type="button"
            onClick={() => onLocationClick(location)}
            className={`absolute z-30 flex h-8 w-8 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-lg transition ${
              active
                ? 'scale-110 border-white bg-red-600 text-white'
                : 'border-white bg-emerald-600 text-white hover:scale-110 hover:bg-emerald-700'
            }`}
            style={{ left: point.x, top: point.y }}
            title={location.name}
          >
            {location.name}
          </button>
        );
      })}

      <div className="absolute right-3 top-24 z-50 flex overflow-hidden rounded-md bg-white shadow sm:top-3">
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={!canZoomIn}
          className="h-10 w-10 border-r border-gray-200 text-lg font-semibold text-gray-800 disabled:text-gray-300"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={!canZoomOut}
          className="h-10 w-10 text-lg font-semibold text-gray-800 disabled:text-gray-300"
          aria-label="Zoom out"
        >
          -
        </button>
      </div>

      {selectedLocation && (
        <div className="absolute bottom-3 left-3 right-3 z-40 rounded-md bg-white p-3 shadow-xl sm:left-4 sm:right-auto sm:max-w-xs">
          <h3 className="truncate text-sm font-bold text-gray-900">Location {selectedLocation.name}</h3>
          <p className="text-xs text-gray-600">
            {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
          </p>
          {directionsUrl ? (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Open directions
            </a>
          ) : (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedLocation.latitude},${selectedLocation.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Open location
            </a>
          )}
        </div>
      )}
    </div>
  );
};
