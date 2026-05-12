'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { MapComponent, CSVUploader } from '@/components';
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

  const handleDropdownChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const location = locations.find((item) => item.fid === event.target.value);
    if (location) setSelectedLocation(location);
  };

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-gray-100">
      <div className="absolute inset-0">
        {locations.length > 0 && !loading ? (
          <MapComponent
            currentLocation={currentLocation}
            selectedLocation={selectedLocation}
            onLocationClick={handleLocationSelect}
            locations={locations}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-200">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="text-sm font-medium text-gray-700">Loading CSV locations...</p>
            </div>
          </div>
        )}
      </div>

      <section className="absolute left-3 right-3 top-3 z-50 sm:left-4 sm:right-auto sm:w-80">
        <div className="rounded-md bg-white/95 p-2 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2">
            <select
              value={selectedLocation?.fid ?? ''}
              onChange={handleDropdownChange}
              className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-2 text-xs font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              aria-label="Select location"
            >
              <option value="" disabled>
                Select location
              </option>
              {locations.map((location) => (
                <option key={location.fid} value={location.fid}>
                  {location.name} - {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </option>
              ))}
            </select>
            <div className="shrink-0">
              <CSVUploader onLocationsLoaded={handleLocationsLoaded} compact />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-600">
            <span>{locations.length} locations</span>
            {currentLocation && <span>Route from current GPS</span>}
          </div>

          {error && (
            <p className="mt-1 text-[11px] leading-snug text-amber-700">
              GPS unavailable. Select a point to view it; enable location for route line.
            </p>
          )}
        </div>
      </section>

      <div className="pointer-events-none absolute bottom-3 right-3 z-40 rounded-md bg-white/90 px-2 py-1 text-[10px] text-gray-600 shadow sm:text-xs">
        Tap point or dropdown
      </div>
    </main>
  );
}
