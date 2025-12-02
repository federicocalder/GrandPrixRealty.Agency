export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  propertyType: 'House' | 'Condo' | 'Townhome' | 'Multi-Family';
  latitude: number;
  longitude: number;
  imageUrl: string;
  daysOnMarket: number;
  hasPool: boolean;
}

export interface SearchFilters {
  location: string;
  minPrice: number;
  maxPrice: number;
  beds: number | null;
  baths: number | null;
  propertyType: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  properties?: Property[];
}

export type { Property as default };
