'use client';

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

const buildEmbedUrl = (latitude: number, longitude: number, zoom = 13) => {
  const query = `${latitude},${longitude}`;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`;
};

const buildDirectionsUrl = (origin: Position, destination: Location) => {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
};

export const MapComponent: React.FC<MapComponentProps> = ({
  currentLocation,
  selectedLocation,
  onLocationClick,
  locations,
}) => {
  const center = selectedLocation
    ? { lat: selectedLocation.latitude, lng: selectedLocation.longitude }
    : currentLocation
    ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
    : defaultCenter;

  const mapUrl = buildEmbedUrl(center.lat, center.lng);
  const directionsUrl = currentLocation && selectedLocation ? buildDirectionsUrl(currentLocation, selectedLocation) : null;

  return (
    <div className="relative w-full h-full bg-gray-100">
      <iframe
        title="Google Maps"
        src={mapUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />

      {selectedLocation && (
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg z-10 max-w-xs">
          <h3 className="font-bold text-lg">{selectedLocation.name}</h3>
          <p className="text-sm text-gray-600">Lat: {selectedLocation.latitude.toFixed(5)}</p>
          <p className="text-sm text-gray-600">Lng: {selectedLocation.longitude.toFixed(5)}</p>
          <p className="text-sm text-gray-700 mt-2">Map is embedded without the Google Maps JavaScript API.</p>
          {directionsUrl ? (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Open Directions in Google Maps
            </a>
          ) : (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedLocation.latitude},${selectedLocation.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Open Location in Google Maps
            </a>
          )}
        </div>
      )}
    </div>
  );
};
