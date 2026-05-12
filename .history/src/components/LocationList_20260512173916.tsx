'use client';

import { Location } from '@/utils/csvParser';

interface LocationListProps {
  locations: Location[];
  selectedLocation: Location | null;
  onSelectLocation: (location: Location) => void;
}

export const LocationList: React.FC<LocationListProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
}) => {
  return (
    <div className="absolute top-4 left-4 z-10 w-64 max-h-[80dvh] overflow-y-auto bg-white rounded-lg shadow-lg">
  );
};
