/**
 * API client for AVM backend
 */

import axios, { AxiosError } from 'axios';
import type {
  ValuationRequest,
  ValuationResponse,
  LeadRequest,
  LeadResponse,
  APIError
} from '../types/valuation';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

/**
 * Create a new valuation
 */
export async function createValuation(request: ValuationRequest): Promise<ValuationResponse> {
  try {
    const response = await apiClient.post<ValuationResponse>('/valuations', request);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<APIError>;
      throw new Error(axiosError.response?.data?.detail || 'Failed to create valuation');
    }
    throw error;
  }
}

/**
 * Get an existing valuation by ID
 */
export async function getValuation(valuationId: string): Promise<ValuationResponse> {
  try {
    const response = await apiClient.get<ValuationResponse>(`/valuations/${valuationId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<APIError>;
      throw new Error(axiosError.response?.data?.detail || 'Valuation not found');
    }
    throw error;
  }
}

/**
 * Capture a lead to unlock full report
 */
export async function captureLead(request: LeadRequest): Promise<LeadResponse> {
  try {
    const response = await apiClient.post<LeadResponse>('/leads', request);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<APIError>;
      throw new Error(axiosError.response?.data?.detail || 'Failed to submit information');
    }
    throw error;
  }
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await apiClient.get('/health');
    return true;
  } catch {
    return false;
  }
}
