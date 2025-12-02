/**
 * Address input form - Step 1 of valuation flow
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const addressSchema = z.object({
  address: z.string().min(5, 'Please enter a valid address'),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddressFormProps {
  onSubmit: (address: string) => void;
  isLoading?: boolean;
}

export function AddressForm({ onSubmit, isLoading }: AddressFormProps) {
  const [focused, setFocused] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
  });

  const onFormSubmit = (data: AddressFormData) => {
    onSubmit(data.address);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-gpr-navy-900 mb-3">
          What's Your Home Worth?
        </h2>
        <p className="text-gray-600 text-lg">
          Get an instant AI-powered valuation for any Las Vegas property
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="relative">
          <div
            className={`
              flex items-center bg-white rounded-xl shadow-lg border-2 transition-all duration-200
              ${focused ? 'border-gpr-gold-500 shadow-gpr-gold-100' : 'border-gray-200'}
              ${errors.address ? 'border-red-400' : ''}
            `}
          >
            {/* Search icon */}
            <div className="pl-4 pr-2">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <input
              type="text"
              placeholder="Enter your Las Vegas property address..."
              className="flex-1 py-4 px-2 text-lg border-none focus:ring-0 focus:outline-none rounded-xl text-gray-900 placeholder-gray-400"
              {...register('address')}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="m-2 gpr-button-primary"
            >
              {isLoading ? (
                <span className="flex items-center">
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
                  Analyzing...
                </span>
              ) : (
                'Get Value'
              )}
            </button>
          </div>

          {errors.address && (
            <p className="mt-2 text-sm text-red-600 pl-4">{errors.address.message}</p>
          )}
        </div>

        <p className="text-center text-sm text-gray-500">
          Powered by AI • 200,000+ Las Vegas sales analyzed • Updated daily
        </p>
      </form>
    </div>
  );
}
