import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Home,
  Building,
  Landmark,
  Users,
  Calculator,
  Info,
  MapPin,
  Download
} from 'lucide-react'
import { formatCurrency } from '../lib/api'
import type { ValuationResponse } from '../types'

// Default values for Clark County, NV
const DEFAULTS = {
  // Title & Closing
  escrowFee: 1200,
  ownersTitlePolicy: 0, // Calculated based on sale price
  reconveyanceFee: 150,
  payoffDemand: 30,
  transactionFee: 295,
  hoaResalePackage: 250,
  fedexCourier: 25,
  notarySigning: 125,
  // Government
  transferTaxRate: 0.00392, // Clark County rate per dollar of sale price
  propertyTaxRate: 0.0097, // ~0.97% of assessed value
  // Commissions
  listingCommissionPct: 3.0,
  buyerCommissionPct: 3.0,
  // Buyer credits
  homeWarranty: 400,
}

// Owner's title policy rate schedule (simplified for Clark County)
function calculateTitlePolicy(salePrice: number): number {
  if (salePrice <= 100000) return 450
  if (salePrice <= 200000) return 650
  if (salePrice <= 300000) return 850
  if (salePrice <= 400000) return 1050
  if (salePrice <= 500000) return 1250
  if (salePrice <= 750000) return 1550
  if (salePrice <= 1000000) return 1950
  return 2500 // Over $1M
}

export default function SellerNetSheetPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { valuationId } = useParams()
  const valuation: ValuationResponse | undefined = location.state?.valuation

  // Core inputs
  const [salePrice, setSalePrice] = useState(valuation?.valuation.estimate || 350000)
  const [loan1Balance, setLoan1Balance] = useState(0)
  const [loan2Balance, setLoan2Balance] = useState(0)
  const [annualPropertyTax, setAnnualPropertyTax] = useState(
    Math.round((valuation?.valuation.estimate || 350000) * DEFAULTS.propertyTaxRate)
  )

  // Title & Closing Costs
  const [escrowFee, setEscrowFee] = useState(DEFAULTS.escrowFee)
  const [ownersTitlePolicy, setOwnersTitlePolicy] = useState(calculateTitlePolicy(salePrice))
  const [reconveyanceFee, setReconveyanceFee] = useState(DEFAULTS.reconveyanceFee)
  const [payoffDemand, setPayoffDemand] = useState(DEFAULTS.payoffDemand)
  const [transactionFee, setTransactionFee] = useState(DEFAULTS.transactionFee)
  const [hoaResalePackage, setHoaResalePackage] = useState(DEFAULTS.hoaResalePackage)
  const [fedexCourier, setFedexCourier] = useState(DEFAULTS.fedexCourier)
  const [notarySigning, setNotarySigning] = useState(DEFAULTS.notarySigning)

  // Government Fees
  const [propertyTaxProration, setPropertyTaxProration] = useState(
    Math.round(annualPropertyTax * 0.5) // Rough half-year proration
  )
  const [transferTax, setTransferTax] = useState(
    Math.round(salePrice * DEFAULTS.transferTaxRate)
  )

  // Commissions & Credits
  const [listingCommissionPct, setListingCommissionPct] = useState(DEFAULTS.listingCommissionPct)
  const [buyerCommissionPct, setBuyerCommissionPct] = useState(DEFAULTS.buyerCommissionPct)
  const [buyerConcessions, setBuyerConcessions] = useState(0)
  const [homeWarranty, setHomeWarranty] = useState(DEFAULTS.homeWarranty)

  // Update calculated fields when sale price changes
  useEffect(() => {
    setOwnersTitlePolicy(calculateTitlePolicy(salePrice))
    setTransferTax(Math.round(salePrice * DEFAULTS.transferTaxRate))
  }, [salePrice])

  // Calculate all totals
  const calculations = useMemo(() => {
    const totalLoanPayoff = loan1Balance + loan2Balance

    const titleClosingSubtotal =
      escrowFee +
      ownersTitlePolicy +
      reconveyanceFee +
      payoffDemand +
      transactionFee +
      hoaResalePackage +
      fedexCourier +
      notarySigning

    const governmentFeesSubtotal = propertyTaxProration + transferTax

    const listingCommissionAmount = Math.round(salePrice * (listingCommissionPct / 100))
    const buyerCommissionAmount = Math.round(salePrice * (buyerCommissionPct / 100))
    const totalCommissions = listingCommissionAmount + buyerCommissionAmount

    const buyerCreditsSubtotal = buyerConcessions + homeWarranty

    const totalCostsAndFees =
      titleClosingSubtotal +
      governmentFeesSubtotal +
      totalCommissions +
      buyerCreditsSubtotal

    const estimatedSellerNet = salePrice - totalLoanPayoff - totalCostsAndFees

    return {
      totalLoanPayoff,
      titleClosingSubtotal,
      governmentFeesSubtotal,
      listingCommissionAmount,
      buyerCommissionAmount,
      totalCommissions,
      buyerCreditsSubtotal,
      totalCostsAndFees,
      estimatedSellerNet,
    }
  }, [
    salePrice,
    loan1Balance,
    loan2Balance,
    escrowFee,
    ownersTitlePolicy,
    reconveyanceFee,
    payoffDemand,
    transactionFee,
    hoaResalePackage,
    fedexCourier,
    notarySigning,
    propertyTaxProration,
    transferTax,
    listingCommissionPct,
    buyerCommissionPct,
    buyerConcessions,
    homeWarranty,
  ])

  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadPDF = useCallback(async () => {
    if (!valuation) return

    setIsDownloading(true)
    try {
      const response = await fetch('/pdf-api/pdf/net-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: valuation.property,
          salePrice,
          loanPayoff: loan1Balance,
          secondLoanPayoff: loan2Balance,
          titleClosingCosts: {
            escrowFee,
            ownersTitlePolicy,
            reconveyanceFee,
            payoffDemand,
            transactionFee,
            hoaResalePackage,
            fedexCourier,
            notarySigning,
          },
          governmentFees: {
            propertyTaxProration,
            transferTax,
          },
          commissions: {
            listingCommission: calculations.listingCommissionAmount,
            buyerAgentCommission: calculations.buyerCommissionAmount,
            buyerCredit: buyerConcessions,
            homeWarranty,
          },
          sellerNet: calculations.estimatedSellerNet,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `seller-net-sheet-${valuation.id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('PDF download failed:', error)
      alert('Failed to download PDF. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }, [
    valuation,
    salePrice,
    loan1Balance,
    loan2Balance,
    escrowFee,
    ownersTitlePolicy,
    reconveyanceFee,
    payoffDemand,
    transactionFee,
    hoaResalePackage,
    fedexCourier,
    notarySigning,
    propertyTaxProration,
    transferTax,
    buyerConcessions,
    homeWarranty,
    calculations,
  ])

  if (!valuation) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Please start with a home value estimate</p>
          <button
            onClick={() => navigate('/')}
            className="btn-gold px-6 py-3 rounded-xl"
          >
            Get Started
          </button>
        </div>
      </div>
    )
  }

  const { property } = valuation

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft size={20} />
        Back
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
          <MapPin size={14} />
          <span>{property.address_full}</span>
        </div>
        <h1 className="font-cinzel text-3xl md:text-4xl font-bold text-white mb-2">
          Net Sheet & Payout
        </h1>
        <p className="text-zinc-400">
          See what you could walk away with at closing.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left/Center - Calculator Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Core Inputs */}
          <div className="glass-card bg-white/5 rounded-[24px] p-6">
            <h2 className="font-cinzel text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Calculator size={20} className="text-[#d4af37]" />
              Core Details
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <CurrencyInput
                label="Estimated Sales Price"
                value={salePrice}
                onChange={setSalePrice}
                highlight
              />
              <CurrencyInput
                label="1st Loan Balance"
                value={loan1Balance}
                onChange={setLoan1Balance}
                placeholder="Enter payoff amount"
              />
              <CurrencyInput
                label="2nd Loan Balance (if any)"
                value={loan2Balance}
                onChange={setLoan2Balance}
                placeholder="0 if none"
              />
              <CurrencyInput
                label="Annual Property Tax"
                value={annualPropertyTax}
                onChange={(val) => {
                  setAnnualPropertyTax(val)
                  setPropertyTaxProration(Math.round(val * 0.5))
                }}
                helperText="Used to estimate proration"
              />
            </div>
          </div>

          {/* Title & Closing Costs */}
          <div className="glass-card bg-white/5 rounded-[24px] p-6">
            <h2 className="font-cinzel text-xl font-semibold text-white mb-1 flex items-center gap-2">
              <Building size={20} className="text-[#d4af37]" />
              Title & Closing Costs
            </h2>
            <p className="text-zinc-500 text-sm mb-4">
              Typical fees paid at escrow. Values are editable.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <CurrencyInput
                label="Escrow / Settlement Fee"
                value={escrowFee}
                onChange={setEscrowFee}
              />
              <CurrencyInput
                label="Owner's Title Policy"
                value={ownersTitlePolicy}
                onChange={setOwnersTitlePolicy}
                helperText="Based on sale price"
              />
              <CurrencyInput
                label="Reconveyance Fee"
                value={reconveyanceFee}
                onChange={setReconveyanceFee}
              />
              <CurrencyInput
                label="Payoff Demand Statement"
                value={payoffDemand}
                onChange={setPayoffDemand}
              />
              <CurrencyInput
                label="Transaction Fee"
                value={transactionFee}
                onChange={setTransactionFee}
              />
              <CurrencyInput
                label="HOA Resale Package"
                value={hoaResalePackage}
                onChange={setHoaResalePackage}
                helperText="$0 if no HOA"
              />
              <CurrencyInput
                label="FedEx / Courier"
                value={fedexCourier}
                onChange={setFedexCourier}
              />
              <CurrencyInput
                label="Notary / Outside Signing"
                value={notarySigning}
                onChange={setNotarySigning}
              />
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-zinc-400">Subtotal</span>
              <span className="text-white font-semibold">
                {formatCurrency(calculations.titleClosingSubtotal)}
              </span>
            </div>
          </div>

          {/* Government Fees */}
          <div className="glass-card bg-white/5 rounded-[24px] p-6">
            <h2 className="font-cinzel text-xl font-semibold text-white mb-1 flex items-center gap-2">
              <Landmark size={20} className="text-[#d4af37]" />
              Government Fees
            </h2>
            <p className="text-zinc-500 text-sm mb-4">
              Taxes and transfer fees owed to county/state.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <CurrencyInput
                label="Property Tax Proration"
                value={propertyTaxProration}
                onChange={setPropertyTaxProration}
                helperText="Half-year estimate"
              />
              <CurrencyInput
                label="Transfer Tax"
                value={transferTax}
                onChange={setTransferTax}
                helperText="Clark County rate"
              />
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-zinc-400">Subtotal</span>
              <span className="text-white font-semibold">
                {formatCurrency(calculations.governmentFeesSubtotal)}
              </span>
            </div>
          </div>

          {/* Commissions & Buyer Credits */}
          <div className="glass-card bg-white/5 rounded-[24px] p-6">
            <h2 className="font-cinzel text-xl font-semibold text-white mb-1 flex items-center gap-2">
              <Users size={20} className="text-[#d4af37]" />
              Commissions & Buyer Credits
            </h2>
            <p className="text-zinc-500 text-sm mb-4">
              Agent compensation and concessions to buyer.
            </p>

            {/* Commission Inputs */}
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Listing Broker (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={listingCommissionPct}
                    onChange={(e) => setListingCommissionPct(parseFloat(e.target.value) || 0)}
                    className="w-24 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-right"
                  />
                  <span className="text-zinc-500">%</span>
                  <span className="text-white font-medium">
                    = {formatCurrency(calculations.listingCommissionAmount)}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Buyer's Agent (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={buyerCommissionPct}
                    onChange={(e) => setBuyerCommissionPct(parseFloat(e.target.value) || 0)}
                    className="w-24 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-right"
                  />
                  <span className="text-zinc-500">%</span>
                  <span className="text-white font-medium">
                    = {formatCurrency(calculations.buyerCommissionAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4 py-3 px-4 bg-white/5 rounded-lg flex justify-between items-center">
              <span className="text-zinc-400">Total Commissions</span>
              <span className="text-white font-semibold">
                {formatCurrency(calculations.totalCommissions)}
              </span>
            </div>

            {/* Buyer Credits */}
            <h3 className="text-sm font-medium text-zinc-300 mb-3 mt-6">Payments to Buyer</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <CurrencyInput
                label="Concessions to Buyer"
                value={buyerConcessions}
                onChange={setBuyerConcessions}
                helperText="Closing cost credit"
              />
              <CurrencyInput
                label="Home Warranty"
                value={homeWarranty}
                onChange={setHomeWarranty}
              />
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-zinc-400">Buyer Credits Subtotal</span>
              <span className="text-white font-semibold">
                {formatCurrency(calculations.buyerCreditsSubtotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          <div className="glass-card bg-white/5 rounded-[24px] p-6 sticky top-24 border border-[#d4af37]/20">
            <h3 className="font-cinzel text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-[#d4af37]" />
              Summary
            </h3>

            {/* Property snapshot */}
            <div className="p-4 bg-zinc-800/50 rounded-lg mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Home size={14} className="text-zinc-400" />
                <span className="text-xs text-zinc-400">Property</span>
              </div>
              <p className="text-white font-medium text-sm truncate">{property.address_full}</p>
              <p className="text-zinc-500 text-xs">
                {property.beds} bed • {(property.baths_full || 0) + (property.baths_half || 0) * 0.5} bath • {property.sqft_living?.toLocaleString()} sqft
              </p>
            </div>

            {/* Summary Items */}
            <div className="space-y-3 mb-6">
              <SummaryRow
                label="Sale Price"
                value={formatCurrency(salePrice)}
              />
              <div className="h-px bg-white/10" />
              <SummaryRow
                label="Title & Closing"
                value={`-${formatCurrency(calculations.titleClosingSubtotal)}`}
                negative
              />
              <SummaryRow
                label="Government Fees"
                value={`-${formatCurrency(calculations.governmentFeesSubtotal)}`}
                negative
              />
              <SummaryRow
                label="Total Commissions"
                value={`-${formatCurrency(calculations.totalCommissions)}`}
                negative
              />
              <SummaryRow
                label="Buyer Credits"
                value={`-${formatCurrency(calculations.buyerCreditsSubtotal)}`}
                negative
              />
              <div className="h-px bg-white/10" />
              <SummaryRow
                label="Total Costs & Fees"
                value={formatCurrency(calculations.totalCostsAndFees)}
                bold
              />
              <SummaryRow
                label="Loan Payoff"
                value={formatCurrency(calculations.totalLoanPayoff)}
                bold
              />
            </div>

            {/* Big Net Result */}
            <div className="p-5 bg-gradient-to-br from-[#d4af37]/20 to-[#d4af37]/5 rounded-xl border border-[#d4af37]/30 mb-4">
              <p className="text-sm text-zinc-400 mb-1">Estimated Seller Net</p>
              <p className={`text-3xl font-bold ${calculations.estimatedSellerNet >= 0 ? 'text-[#d4af37]' : 'text-red-400'}`}>
                {formatCurrency(calculations.estimatedSellerNet)}
              </p>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 text-xs text-zinc-500 mb-6">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <p>
                This is an estimate. Final figures come from escrow/title at closing.
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate(`/list/${valuationId}`, { state: { valuation, netSheetData: calculations } })}
              className="w-full btn-gold py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight size={20} />
            </button>
            <p className="text-xs text-zinc-500 text-center mt-3">
              Next: Configure your marketing plan
            </p>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="w-full mt-4 py-3 rounded-xl bg-white/10 text-white/70 text-sm hover:bg-white/15 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download Net Sheet PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CurrencyInput({
  label,
  value,
  onChange,
  placeholder = '0',
  helperText,
  highlight = false,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  placeholder?: string
  helperText?: string
  highlight?: boolean
}) {
  const [displayValue, setDisplayValue] = useState(value.toString())

  useEffect(() => {
    setDisplayValue(value.toString())
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    setDisplayValue(raw)
    onChange(parseInt(raw) || 0)
  }

  const handleBlur = () => {
    // Format on blur
    setDisplayValue(value.toString())
  }

  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full bg-zinc-900 border rounded-lg pl-7 pr-3 py-2 text-right ${
            highlight
              ? 'border-[#d4af37]/50 text-[#d4af37] font-semibold'
              : 'border-white/10 text-white'
          }`}
        />
      </div>
      {helperText && (
        <p className="text-xs text-zinc-500 mt-1">{helperText}</p>
      )}
    </div>
  )
}

function SummaryRow({
  label,
  value,
  negative = false,
  bold = false,
}: {
  label: string
  value: string
  negative?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'text-zinc-300 font-medium' : 'text-zinc-500'}`}>
        {label}
      </span>
      <span className={`${negative ? 'text-red-400/80' : 'text-white'} ${bold ? 'font-semibold' : ''}`}>
        {value}
      </span>
    </div>
  )
}
