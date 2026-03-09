import { DayItinerary, ItineraryData } from '../types';

export async function fetchItinerary(): Promise<ItineraryData> {
  try {
    const configResponse = await fetch('/sheetConfig.json');
    if (!configResponse.ok) {
      throw new Error(`Failed to fetch config: ${configResponse.statusText}`);
    }
    const config = await configResponse.json();
    const TSV_URL = config.tsvUrl;
    const defaultIcon = config.defaultIcon || 'Crown';
    const colors = config.colors;

    console.log('Fetching itinerary from:', TSV_URL);
    const response = await fetch(TSV_URL);
    if (!response.ok) {
      console.error('Fetch response not OK:', response.status, response.statusText);
      throw new Error(`Failed to fetch itinerary data: ${response.statusText}`);
    }
    const text = await response.text();
    const data = parseTSV(text, defaultIcon);
    return { ...data, colors };
  } catch (error) {
    console.error('Error in fetchItinerary:', error);
    return { days: [], title: 'Across the Pond', icon: 'Crown' };
  }
}

function parseTSV(text: string, defaultIcon: string): ItineraryData {
  const lines = text.split('\n').map(line => line.split('\t'));
  
  const days: DayItinerary[] = [];
  if (lines.length === 0) return { days: [], title: 'Across the Pond', icon: defaultIcon };

  const numColumns = lines[0].length;

  // Skip the first column (labels)
  for (let j = 1; j < numColumns; j++) {
    const getVal = (rowIdx: number) => {
      if (lines[rowIdx] && lines[rowIdx][j]) {
        return lines[rowIdx][j].trim();
      }
      return '';
    };

    const day: DayItinerary = {
      dayOfWeek: getVal(0),
      date: getVal(1),
      location: getVal(2),
      travelFromTo: getVal(3),
      extras: getVal(4),
      breakfast: getVal(5),
      morning: getVal(6),
      lunch: getVal(7),
      afternoon: getVal(8),
      dinner: getVal(9),
      evening: getVal(10),
      stay: getVal(11),
      transport: getVal(12),
      image: getVal(13),
    };

    // Only add if there's at least a day of week or date
    if (day.dayOfWeek || day.date) {
      days.push(day);
    }
  }

  // Row 15 (index 14) is title
  let title = 'Across the Pond';
  if (lines.length >= 15) {
    const titleRow = lines[14];
    if (titleRow && titleRow[0]?.trim().toLowerCase() === 'title' && titleRow[1]) {
      title = titleRow[1].trim();
    }
  }

  // Row 16 (index 15) is icon
  let icon = defaultIcon;
  if (lines.length >= 16) {
    const iconRow = lines[15];
    if (iconRow && iconRow[0]?.trim().toLowerCase() === 'icon' && iconRow[1]) {
      icon = iconRow[1].trim();
    }
  }

  return { days, title, icon };
}
