'use client';

import { useEffect, useMemo, useState } from 'react';
import { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet';
import type { Location } from '@/utils/csvParser';
import type { Position } from '@/utils/geolocation';
import type { MapComponentProps } from './MapComponent';

type RouteResult = {
  key: string;
  path: LatLngExpression[];
};

const defaultCenter: LatLngExpression = [25.5, 82.32];

const buildGoogleMapsUrl = (destination: Location, origin?: Position | null) => {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.latitude},${destination.longitude}`,
    travelmode: 'driving',
  });

  if (origin) {
    params.set('origin', `${origin.latitude},${origin.longitude}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

const getBounds = (
  locations: Location[],
  currentLocation: Position | null
): LatLngBoundsExpression | null => {
  const points: LatLngExpression[] = [
    ...locations.map((location) => [location.latitude, location.longitude] as LatLngExpression),
    ...(currentLocation
      ? ([[currentLocation.latitude, currentLocation.longitude]] as LatLngExpression[])
      : []),
  ];

  return points.length ? (points as LatLngBoundsExpression) : null;
};

function MapViewport({
  currentLocation,
  locations,
  selectedLocation,
}: Pick<MapComponentProps, 'currentLocation' | 'locations' | 'selectedLocation'>) {
  const map = useMap();

  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 120);
    return () => window.clearTimeout(id);
  }, [map]);

  useEffect(() => {
    if (selectedLocation) {
      map.flyTo([selectedLocation.latitude, selectedLocation.longitude], Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.8,
      });
      return;
    }

    const bounds = getBounds(locations, currentLocation);
    if (bounds) {
      map.fitBounds(bounds, {
        animate: true,
        duration: 0.75,
        maxZoom: 15,
        padding: [42, 42],
      });
    }
  }, [currentLocation, locations, map, selectedLocation]);

  return null;
}

export const LeafletMap = ({
  currentLocation,
  selectedLocation,
  onLocationClick,
  locations,
}: MapComponentProps) => {
  const [route, setRoute] = useState<RouteResult | null>(null);

  const locationPoints = useMemo(
    () =>
      locations.map((location) => ({
        location,
        position: [location.latitude, location.longitude] as LatLngExpression,
      })),
    [locations]
  );

  const initialCenter = useMemo<LatLngExpression>(() => {
    const firstLocation = selectedLocation ?? locations[0];
    return firstLocation ? [firstLocation.latitude, firstLocation.longitude] : defaultCenter;
  }, [locations, selectedLocation]);

  useEffect(() => {
    if (!currentLocation || !selectedLocation) {
      return;
    }

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
          setRoute({
            key: routeKey,
            path: coordinates.map(([longitude, latitude]) => [latitude, longitude]),
          });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setRoute(null);
        console.warn('Route request failed:', error);
      }
    };

    loadRoute();

    return () => controller.abort();
  }, [currentLocation, selectedLocation]);

  const activeRouteKey =
    currentLocation && selectedLocation
      ? `${currentLocation.latitude},${currentLocation.longitude}-${selectedLocation.fid}`
      : '';
  const fallbackRoute: LatLngExpression[] =
    currentLocation && selectedLocation
      ? [
          [currentLocation.latitude, currentLocation.longitude],
          [selectedLocation.latitude, selectedLocation.longitude],
        ]
      : [];
  const routePath = route?.key === activeRouteKey ? route.path : fallbackRoute;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={initialCenter}
        zoom={12}
        minZoom={4}
        maxZoom={19}
        inertia
        inertiaDeceleration={2200}
        markerZoomAnimation={false}
        zoomControl={false}
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelDebounceTime={35}
        wheelPxPerZoomLevel={90}
        scrollWheelZoom="center"
        preferCanvas
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          keepBuffer={4}
          updateWhenIdle
          updateWhenZooming={false}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewport
          currentLocation={currentLocation}
          locations={locations}
          selectedLocation={selectedLocation}
        />

        {routePath.length > 1 && (
          <Polyline
            positions={routePath}
            pathOptions={{
              color: '#2563eb',
              dashArray: route?.key === activeRouteKey ? undefined : '10 8',
              lineCap: 'round',
              lineJoin: 'round',
              opacity: 0.92,
              weight: 6,
            }}
          />
        )}

        {currentLocation && (
          <CircleMarker
            center={[currentLocation.latitude, currentLocation.longitude]}
            radius={8}
            pathOptions={{
              color: '#ffffff',
              fillColor: '#2563eb',
              fillOpacity: 1,
              opacity: 1,
              weight: 3,
            }}
          />
        )}

        {locationPoints.map(({ location, position }) => {
          const active = selectedLocation?.fid === location.fid;

          return (
            <CircleMarker
              key={location.fid}
              center={position}
              radius={active ? 8 : 5}
              pathOptions={{
                color: '#ffffff',
                fillColor: active ? '#dc2626' : '#059669',
                fillOpacity: active ? 1 : 0.88,
                opacity: 1,
                weight: active ? 3 : 2,
              }}
              eventHandlers={{
                click: () => onLocationClick(location),
              }}
            />
          );
        })}
      </MapContainer>

      {selectedLocation && (
        <div className="absolute bottom-3 left-3 right-3 z-[450] rounded-md bg-white p-3 shadow-xl sm:left-4 sm:right-auto sm:max-w-xs">
          <h3 className="truncate text-sm font-bold text-gray-900">
            Location {selectedLocation.name}
          </h3>
          <p className="text-xs text-gray-600">
            {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
          </p>
          <a
            href={buildGoogleMapsUrl(selectedLocation, currentLocation)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Open in Google Maps
          </a>
        </div>
      )}
    </div>
  );
};
