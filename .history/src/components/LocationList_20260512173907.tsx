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
    <div className="h-full overflow-y-auto bg-gray-50 p-4">
      
    </div>
  );
};
