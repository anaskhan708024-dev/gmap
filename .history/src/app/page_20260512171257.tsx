'use client';

import { useEffect, useState } from 'react';
import { MapComponent, LocationList, CSVUploader } from '@/components';
import { Location, loadDefaultLocations } from '@/utils/csvParser';
import { Position, getCurrentPosition } from '@/utils/geolocation';

export default function Home() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Position | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const initApp = async () => {
      try {
        // Load default locations
        const defaultLocations = await loadDefaultLocations();
        setLocations(defaultLocations);

        // Get current location
        const position = await getCurrentPosition();
        setCurrentLocation(position);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        console.error('Error initializing app:', err);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
  };

  const handleLocationsLoaded = (newLocations: Location[]) => {
    setLocations(newLocations);
    setSelectedLocation(null);
  };

  return (
    <main className="flex h-screen w-screen bg-gray-100">
      {/* Left Sidebar - Location List */}
      <div className="w-full sm:w-80 flex flex-col border-r border-gray-300 bg-white">
        <CSVUploader onLocationsLoaded={handleLocationsLoaded} />

        {error && (
          <div className="p-4 bg-yellow-50 border-b border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> {error}
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Please enable location services and ensure browser has permission to access your location.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading locations...</p>
            </div>
          </div>
        ) : (
          <>
            {currentLocation && (
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
                <p className="text-xs font-semibold text-blue-900">Your Location:</p>
                <p className="text-xs text-blue-700">
                  {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
                </p>
              </div>
            )}
            <LocationList
              locations={locations}
              selectedLocation={selectedLocation}
              onSelectLocation={handleLocationSelect}
            />
          </>
        )}
      </div>

      {/* Right side - Map */}
      <div className="hidden sm:flex flex-1 flex-col relative">
        {locations.length > 0 ? (
          <MapComponent
            currentLocation={currentLocation}
            selectedLocation={selectedLocation}
            onLocationClick={handleLocationSelect}
            locations={locations}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-200">
            <div className="text-center">
              <p className="text-gray-600 text-lg">Upload a CSV file to view locations on the map</p>
              <p className="text-gray-500 text-sm mt-2">
                CSV should include: FID, Name, Latitude, Longitude
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile View - Map only */}
      <div className="sm:hidden absolute inset-0 z-0">
        {locations.length > 0 ? (
          <MapComponent
            currentLocation={currentLocation}
            selectedLocation={selectedLocation}
            onLocationClick={handleLocationSelect}
            locations={locations}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-200">
            <div className="text-center">
              <p className="text-gray-600 text-lg">Upload a CSV file to view locations</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
