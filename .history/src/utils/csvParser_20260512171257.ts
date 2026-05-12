import Papa from 'papaparse';

export interface Location {
  fid: string;
  name: string;
  latitude: number;
  longitude: number;
}

export const parseCSV = (csvContent: string): Location[] => {
  const results: Location[] = [];
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.data) {
    (parsed.data as any[]).forEach((row: any) => {
      if (row.FID && row.Name && row.Latitude && row.Longitude) {
        results.push({
          fid: row.FID,
          name: row.Name,
          latitude: parseFloat(row.Latitude),
          longitude: parseFloat(row.Longitude),
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
