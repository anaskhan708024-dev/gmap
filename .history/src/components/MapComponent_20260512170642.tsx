'use client';

import { useEffect, useRef, useState } from 'react';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
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

  const mapRef = useRef<GoogleMap>(null);

  useEffect(() => {
    if (currentLocation && selectedLocation) {
      const directionsService = new google.maps.DirectionsService();

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
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
            if (result.routes[0]?.legs[0]) {
              setDistance(result.routes[0].legs[0].distance?.text || '');
              setDuration(result.routes[0].legs[0].duration?.text || '');
            }
          }
        }
      );
    } else {
      setDirections(null);
      setDistance('');
      setDuration('');
    }
  }, [currentLocation, selectedLocation]);

  const center = currentLocation
    ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
    : defaultCenter;

  return (
    <div className="relative w-full h-full">
      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
        <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={13} ref={mapRef}>
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
      </LoadScript>

      {selectedLocation && (
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg z-10 max-w-xs">
          <h3 className="font-bold text-lg">{selectedLocation.name}</h3>
          <p className="text-sm text-gray-600">
            Lat: {selectedLocation.latitude.toFixed(5)}
          </p>
          <p className="text-sm text-gray-600">
            Lng: {selectedLocation.longitude.toFixed(5)}
          </p>
          {distance && <p className="text-sm font-semibold mt-2">Distance: {distance}</p>}
          {duration && <p className="text-sm font-semibold">Duration: {duration}</p>}
        </div>
      )}
    </div>
  );
};
