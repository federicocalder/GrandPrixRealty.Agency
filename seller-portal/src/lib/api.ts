import axios from 'axios';
import type { ValuationRequest, ValuationResponse, LeadCreateRequest, LeadResponse } from '../types';

// API base URL - use /api in production (proxied by nginx), localhost for dev
const isLocalhost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE_URL = import.meta.env.VITE_AVM_API_URL || (isLocalhost ? 'http://localhost:8000' : '/api');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds for valuation requests
});

// Health check
export async function checkHealth(): Promise<{ status: string; model_loaded: boolean }> {
  const response = await apiClient.get('/health');
  return response.data;
}

// Create valuation from address
export async function createValuation(request: ValuationRequest): Promise<ValuationResponse> {
  const response = await apiClient.post('/valuations', {
    address: request.address,
    include_comps: request.include_comps ?? true,
    include_shap: request.include_shap ?? true,
  });
  return response.data;
}

// Get valuation by ID
export async function getValuation(valuationId: string): Promise<ValuationResponse> {
  const response = await apiClient.get(`/valuations/${valuationId}`);
  return response.data;
}

// Create lead (for "Get Full Report" / "Contact Agent")
export async function createLead(request: LeadCreateRequest): Promise<LeadResponse> {
  const response = await apiClient.post('/leads', request);
  return response.data;
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date for display
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format confidence as percentage
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

// Format distance
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

export default apiClient;
