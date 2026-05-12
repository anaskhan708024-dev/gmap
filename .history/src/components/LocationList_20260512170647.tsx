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
      <h2 className="text-lg font-bold mb-4 text-gray-800">Locations</h2>
      <div className="space-y-2">
        {locations.map((location) => (
          <button
            key={location.fid}
            onClick={() => onSelectLocation(location)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              selectedLocation?.fid === location.fid
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <div className="font-semibold">{location.name}</div>
            <div className="text-xs opacity-75">
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
