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
   
  );
};
