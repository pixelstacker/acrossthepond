export interface DayItinerary {
  dayOfWeek: string;
  date: string;
  location: string;
  extras: string;
  breakfast: string;
  morning: string;
  lunch: string;
  afternoon: string;
  dinner: string;
  evening: string;
  stay: string;
  transport: string;
  travelFromTo: string;
  image: string;
}

export interface ItineraryData {
  days: DayItinerary[];
  title: string;
  icon?: string;
  colors?: {
    navy?: string;
    gold?: string;
    cream?: string;
  };
}
