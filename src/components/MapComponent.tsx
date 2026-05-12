'use client';

import dynamic from 'next/dynamic';
import { Location } from '@/utils/csvParser';
import { Position } from '@/utils/geolocation';

export interface MapComponentProps {
  currentLocation: Position | null;
  selectedLocation: Location | null;
  onLocationClick: (location: Location) => void;
  locations: Location[];
}

const LeafletMap = dynamic(
  () => import('./LeafletMap').then((module) => module.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#dfe8db]">
        <div className="rounded-md bg-white/95 px-4 py-3 text-center shadow-xl">
          <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm font-medium text-gray-700">Loading map...</p>
        </div>
      </div>
    ),
  }
);

export const MapComponent = (props: MapComponentProps) => {
  return <LeafletMap {...props} />;
};
