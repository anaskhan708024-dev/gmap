import Papa from 'papaparse';

export interface Location {
  fid: string;
  name: string;
  latitude: number;
  longitude: number;
}

type LocationRow = {
  FID?: string;
  Name?: string;
  Latitude?: string;
  Lattitude?: string;
  Longitude?: string;
};

export const parseCSV = (csvContent: string): Location[] => {
  const results: Location[] = [];
  const parsed = Papa.parse<LocationRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.data) {
    parsed.data.forEach((row) => {
      const latitude = Number(row.Latitude ?? row.Lattitude);
      const longitude = Number(row.Longitude);

      if (row.FID && row.Name && Number.isFinite(latitude) && Number.isFinite(longitude)) {
        results.push({
          fid: row.FID,
          name: row.Name,
          latitude,
          longitude,
        });
      }
    });
  }

  return results;
};

export const loadDefaultLocations = async (): Promise<Location[]> => {
  try {
    const response = await fetch('/locations.csv');
    const csvContent = await response.text();
    return parseCSV(csvContent);
  } catch (error) {
    console.error('Error loading CSV:', error);
    return [];
  }
};
