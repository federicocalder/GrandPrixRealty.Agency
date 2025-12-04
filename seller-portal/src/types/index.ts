// AVM API Types

export interface PropertyDetails {
  address_full: string;
  latitude: number | null;
  longitude: number | null;
  zip_code: string | null;
  city: string | null;
  subdivision: string | null;
  property_type: string | null;
  beds: number | null;
  baths_full: number | null;
  baths_half: number | null;
  sqft_living: number | null;
  sqft_lot: number | null;
  year_built: number | null;
  stories: number | null;
  garage_spaces: number | null;
  pool: boolean | null;
}

export interface ValuationResult {
  estimate: number;
  range_low: number;
  range_high: number;
  confidence: number;
}

export interface ValuationFactor {
  feature: string;
  impact: number;
  direction: 'positive' | 'negative';
  explanation: string;
}

export interface ComparableSale {
  id: string;
  address: string;
  sale_date: string;
  sale_price: number;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  distance_miles: number;
  match_score: number;
  latitude: number | null;
  longitude: number | null;
}

export interface MarketTrends {
  zip_median_price: number | null;
  price_change_yoy: number | null;
  days_on_market_avg: number | null;
  inventory_months: number | null;
}

export interface ValuationResponse {
  id: string;
  valuation: ValuationResult;
  property: PropertyDetails;
  factors: ValuationFactor[];
  comparables: ComparableSale[];
  market_trends: MarketTrends | null;
  model_version: string;
  generated_at: string;
}

export interface ValuationRequest {
  address: string;
  include_comps?: boolean;
  include_shap?: boolean;
}

// Listing Configuration Types

export interface MediaOptions {
  pro_photos: boolean;
  twilight_photos: boolean;
  drone_photos: boolean;
  video_tour: boolean;
  virtual_tour_3d: boolean;
}

export interface ListingStrategy {
  type: 'maximum_exposure' | 'quiet_launch' | 'coming_soon';
  open_house: boolean;
  coming_soon_days?: number;
}

export interface PricingStrategy {
  approach: 'avm_match' | 'below_avm' | 'above_avm' | 'custom';
  custom_price?: number;
  request_pricing_call: boolean;
}

export interface ListingConfiguration {
  property: PropertyDetails;
  valuation_id: string;
  media_options: MediaOptions;
  listing_strategy: ListingStrategy;
  pricing_strategy: PricingStrategy;
  go_live_preference?: string;
}

// Lead Types

export interface LeadCreateRequest {
  valuation_id: string;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  lead_type: 'seller' | 'landlord' | 'curious';
  property_timeline?: 'now' | '3_months' | '6_months' | 'just_curious';
}

export interface LeadResponse {
  lead_id: string;
  report_url: string;
  message: string;
}

// Seller Net Sheet Types

export interface NetSheetInputs {
  salePrice: number;
  loan1Balance: number;
  loan2Balance: number;
  annualPropertyTax: number;
  estimatedClosingDate: string;
}

export interface TitleClosingCosts {
  escrowFee: number;
  ownersTitlePolicy: number;
  reconveyanceFee: number;
  payoffDemand: number;
  transactionFee: number;
  hoaResalePackage: number;
  fedexCourier: number;
  notarySigning: number;
}

export interface GovernmentFees {
  propertyTaxProration: number;
  transferTax: number;
}

export interface CommissionsCredits {
  listingCommissionPct: number;
  buyerCommissionPct: number;
  buyerConcessions: number;
  homeWarranty: number;
}

export interface NetSheetData {
  inputs: NetSheetInputs;
  titleClosingCosts: TitleClosingCosts;
  governmentFees: GovernmentFees;
  commissionsCredits: CommissionsCredits;
  estimatedSellerNet: number;
}
