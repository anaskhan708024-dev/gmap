'use client';

import { useEffect, useRef, useState } from 'react';
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader,
} from '@react-google-maps/api';
import { Location } from '@/utils/csvParser';
import { Position } from '@/utils/geolocation';

interface MapComponentProps {
  currentLocation: Position | null;
  selectedLocation: Location | null;
  onLocationClick: (location: Location) => void;
  locations: Location[];
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 25.5,
  lng: 82.32,
};

export const MapComponent: React.FC<MapComponentProps> = ({
  currentLocation,
  selectedLocation,
  onLocationClick,
  locations,
}) => {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');

  const mapRef = useRef<google.maps.Map | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: ['places'],
  });

  useEffect(() => {
    if (!isLoaded || !currentLocation || !selectedLocation) {
      setDirections(null);
      setDistance('');
      setDuration('');
      return;
    }

    if (!window.google?.maps) {
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        },
        destination: {
          lat: selectedLocation.latitude,
          lng: selectedLocation.longitude,
        },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          if (result.routes[0]?.legs[0]) {
            setDistance(result.routes[0].legs[0].distance?.text || '');
            setDuration(result.routes[0].legs[0].duration?.text || '');
          }
        }
      }
    );
  }, [currentLocation, selectedLocation, isLoaded]);

  const center = currentLocation
    ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
    : defaultCenter;

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-red-600">Google Maps API key is missing.</p>
          <p className="mt-2 text-sm text-gray-700">
            Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local` and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-red-600">Google Maps failed to load.</p>
          <p className="mt-2 text-sm text-gray-700">
            Check your API key and browser console for details.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 p-6 text-center">
        <p className="text-gray-700">Loading Google Maps...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={13} onLoad={(map) => (mapRef.current = map)}>
        {currentLocation && (
          <Marker
            position={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
            title="Your Location"
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            }}
          />
        )}

        {locations.map((location) => (
          <Marker
            key={location.fid}
            position={{ lat: location.latitude, lng: location.longitude }}
            title={location.name}
            onClick={() => onLocationClick(location)}
            icon={{
              url:
                selectedLocation?.fid === location.fid
                  ? 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                  : 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
            }}
          />
        ))}

        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>

      {selectedLocation && (
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg z-10 max-w-xs">
          <h3 className="font-bold text-lg">{selectedLocation.name}</h3>
          <p className="text-sm text-gray-600">Lat: {selectedLocation.latitude.toFixed(5)}</p>
          <p className="text-sm text-gray-600">Lng: {selectedLocation.longitude.toFixed(5)}</p>
          {distance && <p className="text-sm font-semibold mt-2">Distance: {distance}</p>}
          {duration && <p className="text-sm font-semibold">Duration: {duration}</p>}
        </div>
      )}
    </div>
  );
};
