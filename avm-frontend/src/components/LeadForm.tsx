/**
 * Lead capture form - Gate for full report
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LeadRequest } from '../types/valuation';

const leadSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  lead_type: z.enum(['seller', 'buyer', 'investor', 'curious']),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadFormProps {
  valuationId: string;
  onSubmit: (data: LeadRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const leadTypeOptions = [
  { value: 'seller', label: 'I might sell', icon: '🏠' },
  { value: 'buyer', label: 'I might buy', icon: '🔑' },
  { value: 'investor', label: "I'm an investor", icon: '📈' },
  { value: 'curious', label: 'Just curious', icon: '🤔' },
];

export function LeadForm({ valuationId, onSubmit, onCancel, isLoading }: LeadFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      lead_type: 'curious',
    },
  });

  const selectedType = watch('lead_type');

  const onFormSubmit = (data: LeadFormData) => {
    onSubmit({
      ...data,
      valuation_id: valuationId,
    });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="gpr-card p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gpr-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gpr-gold-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Get Your Full Report</h3>
          <p className="text-gray-600 text-sm mt-1">
            Enter your email to unlock all comparable sales, market trends, and detailed
            analysis
          </p>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {/* Lead type selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What describes you best?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {leadTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${
                      selectedType === option.value
                        ? 'border-gpr-gold-500 bg-gpr-gold-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    value={option.value}
                    {...register('lead_type')}
                    className="sr-only"
                  />
                  <span className="text-lg">{option.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              className="gpr-input"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Optional: Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="first_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                First Name
              </label>
              <input
                type="text"
                id="first_name"
                placeholder="John"
                className="gpr-input"
                {...register('first_name')}
              />
            </div>
            <div>
              <label
                htmlFor="last_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Last Name
              </label>
              <input
                type="text"
                id="last_name"
                placeholder="Smith"
                className="gpr-input"
                {...register('last_name')}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone (optional)
            </label>
            <input
              type="tel"
              id="phone"
              placeholder="(702) 555-1234"
              className="gpr-input"
              {...register('phone')}
            />
          </div>

          {/* Submit */}
          <div className="pt-2 space-y-3">
            <button type="submit" disabled={isLoading} className="w-full gpr-button-primary">
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send Me The Report'
              )}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Maybe later
            </button>
          </div>
        </form>

        {/* Privacy note */}
        <p className="text-xs text-gray-400 text-center mt-4">
          We respect your privacy. Your info is never shared or sold.
        </p>
      </div>
    </div>
  );
}
