/**
 * API types for AVM valuation
 */

export interface ValuationRequest {
  address: string;
  property_type?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  year_built?: number;
  pool?: boolean;
}

export interface PropertyDetails {
  address: string;
  latitude?: number;
  longitude?: number;
  zip_code?: string;
  city?: string;
  property_type?: string;
  beds?: number;
  baths_full?: number;
  baths_half?: number;
  sqft_living?: number;
  year_built?: number;
  pool?: boolean;
}

export interface ComparableSale {
  address: string;
  sale_price: number;
  sale_date: string;
  distance_miles: number;
  beds: number;
  baths: number;
  sqft: number;
  year_built?: number;
  similarity_score: number;
  price_per_sqft: number;
}

export interface ValuationFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface MarketTrends {
  median_price: number;
  price_change_1yr: number;
  avg_days_on_market: number;
  inventory_level: string;
}

export interface ValuationResult {
  estimated_value: number;
  confidence_score: number;
  value_range_low: number;
  value_range_high: number;
  price_per_sqft: number;
}

export interface ValuationResponse {
  valuation_id: string;
  property: PropertyDetails;
  valuation: ValuationResult;
  comparables: ComparableSale[];
  factors: ValuationFactor[];
  market_trends?: MarketTrends;
  model_version: string;
  generated_at: string;
}

export interface LeadRequest {
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  lead_type: 'seller' | 'buyer' | 'investor' | 'curious';
  valuation_id: string;
}

export interface LeadResponse {
  lead_id: string;
  report_url: string;
  message: string;
}

export interface APIError {
  detail: string;
}
