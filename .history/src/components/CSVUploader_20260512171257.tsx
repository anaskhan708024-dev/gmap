'use client';

import { ChangeEvent } from 'react';
import { parseCSV, Location } from '@/utils/csvParser';

interface CSVUploaderProps {
  onLocationsLoaded: (locations: Location[]) => void;
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({ onLocationsLoaded }) => {
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvContent = event.target?.result as string;
      const locations = parseCSV(csvContent);
      onLocationsLoaded(locations);
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 bg-white border-b border-gray-200">
      <label className="flex items-center justify-center w-full cursor-pointer">
        <span className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold">
          Upload CSV
        </span>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />
      </label>
      <p className="text-xs text-gray-600 mt-2 text-center">
        CSV should have: FID, Name, Latitude, Longitude columns
      </p>
    </div>
  );
};
