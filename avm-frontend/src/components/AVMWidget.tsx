/**
 * Main AVM Widget - Orchestrates the valuation flow
 */

import { useState, useCallback } from 'react';
import { AddressForm } from './AddressForm';
import { ValuationResult } from './ValuationResult';
import { LeadForm } from './LeadForm';
import { createValuation, captureLead } from '../api/client';
import type { ValuationResponse, LeadRequest } from '../types/valuation';

type Step = 'address' | 'result' | 'lead-form' | 'report';

interface AVMWidgetProps {
  onValuationComplete?: (valuation: ValuationResponse) => void;
  onLeadCaptured?: (leadId: string) => void;
}

export function AVMWidget({ onValuationComplete, onLeadCaptured }: AVMWidgetProps) {
  const [step, setStep] = useState<Step>('address');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valuation, setValuation] = useState<ValuationResponse | null>(null);

  const handleAddressSubmit = useCallback(async (address: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createValuation({ address });
      setValuation(result);
      setStep('result');
      onValuationComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get valuation');
    } finally {
      setIsLoading(false);
    }
  }, [onValuationComplete]);

  const handleUnlockReport = useCallback(() => {
    setStep('lead-form');
  }, []);

  const handleLeadSubmit = useCallback(async (data: LeadRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await captureLead(data);
      onLeadCaptured?.(result.lead_id);
      setStep('report');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit information');
    } finally {
      setIsLoading(false);
    }
  }, [onLeadCaptured]);

  const handleLeadCancel = useCallback(() => {
    setStep('result');
  }, []);

  const handleStartOver = useCallback(() => {
    setStep('address');
    setValuation(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-[400px] p-6 bg-gradient-to-br from-gray-50 to-white">
      {/* Error display */}
      {error && (
        <div className="max-w-2xl mx-auto mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-red-800 font-medium">Something went wrong</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Step content */}
      {step === 'address' && (
        <AddressForm onSubmit={handleAddressSubmit} isLoading={isLoading} />
      )}

      {step === 'result' && valuation && (
        <ValuationResult valuation={valuation} onUnlockReport={handleUnlockReport} />
      )}

      {step === 'lead-form' && valuation && (
        <LeadForm
          valuationId={valuation.valuation_id}
          onSubmit={handleLeadSubmit}
          onCancel={handleLeadCancel}
          isLoading={isLoading}
        />
      )}

      {step === 'report' && valuation && (
        <div className="max-w-3xl mx-auto">
          {/* Full report view - all data unblurred */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Report Unlocked!</h2>
            <p className="text-gray-600 mt-1">
              Check your email for a copy of this report
            </p>
          </div>

          {/* Show full valuation without blur */}
          <ValuationResult valuation={valuation} onUnlockReport={() => {}} />

          <div className="text-center mt-8">
            <button onClick={handleStartOver} className="gpr-button-secondary">
              Value Another Property
            </button>
          </div>
        </div>
      )}

      {/* GPR Branding */}
      <div className="text-center mt-8">
        <p className="text-xs text-gray-400">
          Powered by{' '}
          <a
            href="https://grandprixrealty.agency"
            className="text-gpr-gold-600 hover:text-gpr-gold-700 font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            Grand Prix Realty
          </a>
        </p>
      </div>
    </div>
  );
}
