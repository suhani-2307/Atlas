'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import {
  fetchAllResults,
  readSessionJSON,
  type CptResultItem as CptResult,
  type FplDataItem as FplData,
  type RankedOptionItem as RankedOption,
} from '@/app/utils'

interface InsuranceData {
  insurer_name?: string
  plan_name?: string
  plan_type?: string
  copay?: string
  deductible?: string
  oopm?: string
  member_id?: string
  group_number?: string
  [key: string]: unknown
}

// ── Constants ──

const HIGH_COMPLEXITY_KEYWORDS = [
  'trauma', 'surgery', 'surgical', 'transplant', 'cardiac arrest',
  'stroke', 'heart attack', 'aneurysm', 'hemorrhage', 'icu',
  'intensive care', 'ventilator', 'intubation', 'resuscitation',
  'c-section', 'brain', 'spinal', 'compound fracture',
  'gunshot', 'stabbing', 'burn unit', 'organ failure',
  'sepsis', 'seizure', 'overdose', 'poisoning',
]

const gradText: React.CSSProperties = {
  background: 'linear-gradient(90deg,#2563eb,#10b981)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function parseDeductible(raw: string | undefined): number {
  if (!raw) return 0
  const match = raw.match(/\$?([\d,]+)/)
  return match ? parseFloat(match[1].replace(/,/g, '')) : 0
}

function parseCopay(raw: string | undefined): number {
  if (!raw) return 0
  const match = raw.match(/\$?([\d.]+)/)
  return match ? parseFloat(match[1]) : 0
}

// ── Sub-components ──

function RiskBadge({ risk }: { risk: number }) {
  const level = risk < 0.15 ? 'low' : risk <= 0.35 ? 'med' : 'high'
  const styles = {
    low: { background: 'linear-gradient(90deg,#f0fdf4,#d1fae5)', color: '#065f46', border: '1px solid rgba(16,185,129,.4)' },
    med: { background: 'linear-gradient(90deg,#fefce8,#fef9c3)', color: '#854d0e', border: '1px solid rgba(234,179,8,.4)' },
    high: { background: 'linear-gradient(90deg,#fef2f2,#fecaca)', color: '#991b1b', border: '1px solid rgba(239,68,68,.4)' },
  }
  const labels = { low: 'Low Risk', med: 'Medium Risk', high: 'Higher Risk' }
  return (
    <span className="text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full" style={styles[level]}>
      {labels[level]}
    </span>
  )
}

function PathwayCard({
  tag, tagStyle, title, description, amount, details, expanded, onToggle, animDelay,
}: {
  tag: string
  tagStyle: React.CSSProperties
  title: string
  description: string
  amount: string
  details: React.ReactNode
  expanded: boolean
  onToggle: () => void
  animDelay: string
}) {
  return (
    <div
      onClick={onToggle}
      className="relative p-5 flex flex-col w-64 md:w-72 rounded-[18px] backdrop-blur-sm bg-white/92 border border-slate-200/80 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
      style={{ animation: `fadeInUp 0.5s ${animDelay} both` }}
    >
      {/* Tag badge */}
      <div
        className="absolute -top-2.5 left-3 text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded-full z-10"
        style={tagStyle}
      >
        {tag}
      </div>

      {/* Title */}
      <div className="text-sm font-bold mb-1.5 text-slate-900 mt-1">{title}</div>
      <div className="text-[11px] leading-relaxed text-slate-500 mb-3">{description}</div>

      {/* Cost */}
      <div className="border-t border-slate-200/50 pt-3 mb-3">
        <div className="text-2xl font-bold" style={gradText}>{amount}</div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="border-t border-slate-200/50 pt-3 text-[11px] text-slate-500 space-y-1.5" style={{ animation: 'fadeInUp 0.3s ease both' }}>
          {details}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-2.5 border-t border-slate-200/50 text-[11px] font-bold" style={gradText}>
        {expanded ? 'Hide details' : 'View details \u2192'}
      </div>
    </div>
  )
}

// ── Main Page ──

export default function ResultsPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [situation, setSituation] = useState('')
  const [hospital, setHospital] = useState('')
  const [stateName, setStateName] = useState('')
  const [insuranceData, setInsuranceData] = useState<InsuranceData | null>(null)
  const [cptResults, setCptResults] = useState<CptResult[] | null>(null)
  const [fplData, setFplData] = useState<FplData | null>(null)
  const [rankedOptions, setRankedOptions] = useState<RankedOption[] | null>(null)
  const [expandedPath, setExpandedPath] = useState<number | null>(null)
  const [detailOption, setDetailOption] = useState<RankedOption | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const fetching = useRef(false)

  useEffect(() => {
    if (fetching.current) return
    fetching.current = true

    // 1. Read context values that are always available
    setName(sessionStorage.getItem('aidaura_name') || 'Patient')
    setSituation(sessionStorage.getItem('aidaura_situation') || '')
    setHospital(sessionStorage.getItem('aidaura_hospital') || '')
    setStateName(sessionStorage.getItem('aidaura_state') || '')

    const extractRaw = sessionStorage.getItem('aidaura_extract_result')
    const insuranceRaw = sessionStorage.getItem('aidaura_insurance_data')
    const insurancePayload = extractRaw || insuranceRaw
    if (insurancePayload) {
      try { setInsuranceData(JSON.parse(insurancePayload)) } catch { /* ignore */ }
    }

    // 2. Try reading pre-fetched results from sessionStorage (happy path via /loading)
    const cachedCpt = readSessionJSON<CptResult[]>('aidaura_cpt_results')
    const cachedFpl = readSessionJSON<FplData>('aidaura_fpl_data')
    const cachedRank = readSessionJSON<RankedOption[]>('aidaura_ranked_options')

    if (cachedCpt && cachedFpl) {
      // Data already present — render immediately
      setCptResults(cachedCpt)
      setFplData(cachedFpl)
      if (cachedRank) setRankedOptions(cachedRank)
      setIsLoading(false)
      return
    }

    // 3. Check whether we have enough input data to fetch
    const hasSituation = !!sessionStorage.getItem('aidaura_situation')
    const hasIncome = !!sessionStorage.getItem('aidaura_household_income')
    if (!hasSituation && !hasIncome) {
      // No input data at all — user probably navigated directly; redirect to start
      router.push('/')
      return
    }

    // 4. Fallback: fetch from backend APIs
    setFetchError('')
    fetchAllResults()
      .then(({ cptResults: cpt, fplData: fpl, rankedOptions: ranked }) => {
        if (cpt) setCptResults(cpt)
        if (fpl) setFplData(fpl)
        if (ranked) setRankedOptions(ranked)
        if (!cpt || cpt.length === 0) {
          setFetchError('We couldn\u2019t find procedure codes matching your situation.')
        }
      })
      .catch(() => {
        setFetchError('Something went wrong while fetching your results. Please try again.')
      })
      .finally(() => setIsLoading(false))
  }, [router])

  // ── Derived values ──

  const totalOutOfNetwork = cptResults?.reduce((s, r) => s + r.estimated_cost.out_of_network, 0) ?? 0
  const totalInNetwork = cptResults?.reduce((s, r) => s + r.estimated_cost.in_network, 0) ?? 0

  const situationLower = situation.toLowerCase()
  const isComplex = HIGH_COMPLEXITY_KEYWORDS.some(kw => situationLower.includes(kw))
  const showTransfer = !isComplex && cptResults && cptResults.length > 0

  const hasInsurance = insuranceData && (insuranceData.insurer_name || insuranceData.member_id)

  // Insurance path calculation
  const deductible = parseDeductible(insuranceData?.deductible)
  const copay = parseCopay(insuranceData?.copay)
  const afterDeductible = Math.max(0, totalInNetwork - deductible)
  const insuranceOop = afterDeductible + copay

  // Transfer savings
  const transferLow = totalOutOfNetwork * 0.4
  const transferHigh = totalOutOfNetwork * 0.6
  const transferMid = (transferLow + transferHigh) / 2

  const restart = () => {
    router.push('/')
  }

  const retryFetch = () => {
    setIsLoading(true)
    setFetchError('')
    fetchAllResults()
      .then(({ cptResults: cpt, fplData: fpl, rankedOptions: ranked }) => {
        if (cpt) setCptResults(cpt)
        if (fpl) setFplData(fpl)
        if (ranked) setRankedOptions(ranked)
        if (!cpt || cpt.length === 0) {
          setFetchError('We couldn\u2019t find procedure codes matching your situation.')
        }
      })
      .catch(() => {
        setFetchError('Something went wrong while fetching your results. Please try again.')
      })
      .finally(() => setIsLoading(false))
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] font-sans text-slate-900 flex flex-col overflow-hidden">
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to bottom,rgba(246,247,248,.45),rgba(246,247,248,.75)),url('/bg.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        </div>
        <Header />
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="text-center p-10">
            <div className="mb-6 flex justify-center">
              <svg className="animate-spin h-10 w-10" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="3" />
                <path className="opacity-75" fill="#2563eb" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyzing your situation&hellip;</h2>
            <p className="text-slate-500 text-sm">Fetching procedure costs and financial options.</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Error / empty state ──
  if (fetchError || !cptResults || cptResults.length === 0) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] font-sans text-slate-900 flex flex-col overflow-hidden">
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to bottom,rgba(246,247,248,.45),rgba(246,247,248,.75)),url('/bg.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        </div>
        <Header />
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="text-center p-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Unable to estimate costs</h2>
            <p className="text-slate-500 text-sm mb-6">{fetchError || 'We couldn\'t find procedure codes matching your situation. Please try again with more details.'}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push('/emergency')} className="px-6 py-3 rounded-xl text-white font-bold text-sm" style={{ background: 'linear-gradient(90deg,#2563eb,#10b981)' }}>
                Go Back
              </button>
              <button onClick={retryFetch} className="px-6 py-3 rounded-xl font-bold text-sm border border-slate-300 text-slate-700 hover:border-blue-400 hover:text-blue-600 transition-all">
                Retry
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f7f8] font-sans text-slate-900 flex flex-col overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to bottom,rgba(246,247,248,.45),rgba(246,247,248,.75)),url('/bg.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      </div>

      {/* Header */}
      <Header rightSlot={
        <button onClick={restart} className="text-xs font-semibold text-slate-500 hover:text-red-500 border border-slate-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-all bg-white/80">
          Start Over
        </button>
      } />

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden pb-20">
        {/* Hero */}
        <div className="text-center pt-10 pb-4 px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            Your Financial Breakdown, <span style={gradText}>{name}</span>
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            {hospital && <>{hospital}</>}
            {hospital && stateName && <> &middot; </>}
            {stateName && <>{stateName}</>}
            {(hospital || stateName) && situation && <> &middot; </>}
            {situation && <span className="italic">{situation.length > 60 ? situation.slice(0, 60) + '\u2026' : situation}</span>}
          </p>
        </div>

        {/* Section: Financial Pathways */}
        <div className="text-center mb-4 text-xs font-bold uppercase tracking-widest" style={gradText}>
          Your Financial Pathways
        </div>

        {/* Connector line */}
        <div className="flex justify-center mb-6">
          <div className="w-px h-8 opacity-50" style={{ background: 'linear-gradient(to bottom,#2563eb,#10b981)' }} />
        </div>

        {/* Pathway cards */}
        <div className="flex flex-wrap justify-center gap-5 px-6 mb-4">
          {/* Path 1: Full Honest Cost */}
          <PathwayCard
            tag="Without Assistance"
            tagStyle={{ background: 'linear-gradient(90deg,#fef2f2,#fecaca)', color: '#991b1b', border: '1px solid rgba(239,68,68,.3)' }}
            title="Full Cost — No Help"
            description="The total cost if you pay everything out of pocket with no insurance or financial assistance applied."
            amount={fmt(totalOutOfNetwork)}
            expanded={expandedPath === 1}
            onToggle={() => setExpandedPath(expandedPath === 1 ? null : 1)}
            animDelay="0s"
            details={
              <>
                <div className="font-bold text-slate-700 mb-1">Procedure Breakdown</div>
                {cptResults.map((r, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate mr-2">{r.procedure_code_description}</span>
                    <span className="font-semibold text-slate-700 whitespace-nowrap">{fmt(r.estimated_cost.out_of_network)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-200/50 pt-1.5 mt-1.5 font-bold text-slate-800">
                  <span>Total</span>
                  <span>{fmt(totalOutOfNetwork)}</span>
                </div>
              </>
            }
          />

          {/* Path 2: Transfer (conditional) */}
          {showTransfer && (
            <PathwayCard
              tag="Consider Transfer"
              tagStyle={{ background: 'linear-gradient(90deg,#eff6ff,#dbeafe)', color: '#1e40af', border: '1px solid rgba(37,99,235,.3)' }}
              title="Transfer to Lower-Cost Facility"
              description="For non-critical situations, transferring to an urgent care or smaller facility can significantly reduce costs."
              amount={`${fmt(transferLow)} — ${fmt(transferHigh)}`}
              expanded={expandedPath === 2}
              onToggle={() => setExpandedPath(expandedPath === 2 ? null : 2)}
              animDelay="0.1s"
              details={
                <>
                  <div className="font-bold text-slate-700 mb-1">Estimated Savings</div>
                  <div className="flex justify-between">
                    <span>Current facility estimate</span>
                    <span className="font-semibold text-slate-700">{fmt(totalOutOfNetwork)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Urgent care / smaller facility</span>
                    <span className="font-semibold text-green-700">{fmt(transferMid)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/50 pt-1.5 mt-1.5 font-bold text-green-700">
                    <span>Potential savings</span>
                    <span>~{fmt(totalOutOfNetwork - transferMid)}</span>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-2 italic">
                    Always consult medical staff before transferring. This option may not be suitable for all conditions.
                  </p>
                </>
              }
            />
          )}

          {/* Path 3: With Insurance (conditional) */}
          {hasInsurance && (
            <PathwayCard
              tag="With Your Coverage"
              tagStyle={{ background: 'linear-gradient(90deg,#f0fdf4,#d1fae5)', color: '#065f46', border: '1px solid rgba(16,185,129,.4)' }}
              title="With Insurance Applied"
              description={`Estimated cost using your ${insuranceData?.insurer_name || 'insurance'} ${insuranceData?.plan_name || 'plan'} with in-network rates.`}
              amount={fmt(insuranceOop)}
              expanded={expandedPath === 3}
              onToggle={() => setExpandedPath(expandedPath === 3 ? null : 3)}
              animDelay="0.2s"
              details={
                <>
                  <div className="font-bold text-slate-700 mb-1">Coverage Breakdown</div>
                  {insuranceData?.insurer_name && (
                    <div className="flex justify-between">
                      <span>Provider</span>
                      <span className="font-semibold text-slate-700">{insuranceData.insurer_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>In-network total</span>
                    <span className="font-semibold text-slate-700">{fmt(totalInNetwork)}</span>
                  </div>
                  {deductible > 0 && (
                    <div className="flex justify-between">
                      <span>Deductible applied</span>
                      <span className="font-semibold text-slate-700">-{fmt(deductible)}</span>
                    </div>
                  )}
                  {copay > 0 && (
                    <div className="flex justify-between">
                      <span>Copay</span>
                      <span className="font-semibold text-slate-700">+{fmt(copay)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200/50 pt-1.5 mt-1.5 font-bold text-green-700">
                    <span>Your estimated out-of-pocket</span>
                    <span>{fmt(insuranceOop)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>You save</span>
                    <span>{fmt(totalOutOfNetwork - insuranceOop)}</span>
                  </div>
                </>
              }
            />
          )}
        </div>

        {/* FPL info badge */}
        {fplData && fplData.hospital_discount_percent > 0 && (
          <div className="flex justify-center mb-4 px-6" style={{ animation: 'fadeInUp 0.5s 0.3s both' }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-emerald-200 shadow-sm text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-600">
                Based on your household income, you may qualify for a <strong className="text-emerald-700">{fplData.hospital_discount_percent}% hospital discount</strong>
              </span>
            </div>
          </div>
        )}

        {/* Connector line */}
        {rankedOptions && rankedOptions.length > 0 && (
          <>
            <div className="flex justify-center my-4">
              <div className="w-px h-10 opacity-50" style={{ background: 'linear-gradient(to bottom,#2563eb,#10b981)' }} />
            </div>

            {/* Section: Financial Assistance */}
            <div className="text-center mb-4 text-xs font-bold uppercase tracking-widest" style={gradText}>
              Financial Assistance Options
            </div>

            <div className="flex justify-center mb-6">
              <div className="w-px h-8 opacity-50" style={{ background: 'linear-gradient(to bottom,#2563eb,#10b981)' }} />
            </div>

            <div className="flex flex-wrap justify-center gap-4 px-6 mb-8">
              {rankedOptions.map((opt, i) => (
                <div
                  key={i}
                  onClick={() => setDetailOption(opt)}
                  className="relative p-5 flex flex-col w-52 rounded-[18px] backdrop-blur-sm bg-white/92 border border-slate-200/80 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                  style={{ animation: `fadeInUp 0.5s ${0.1 * i}s both` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Option {i + 1}</span>
                    <RiskBadge risk={opt.risk} />
                  </div>
                  <div className="text-sm font-bold text-slate-900 mb-1">{opt.name}</div>
                  <div className="border-t border-slate-200/50 pt-2 mt-auto space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Total</span>
                      <span className="font-bold" style={gradText}>{fmt(opt.total_cost)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Monthly</span>
                      <span className="font-semibold text-slate-700">{fmt(opt.monthly_payment)}/mo</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-200/50 text-[11px] font-bold" style={gradText}>
                    Learn more &rarr;
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Disclaimer */}
        <div className="text-center px-6 pb-6">
          <p className="text-[10px] text-slate-400 max-w-xl mx-auto leading-relaxed">
            These are estimates only. Actual costs may vary depending on your specific treatment, insurance plan details, and hospital billing practices.
            Consult your insurance provider and hospital billing department for exact figures.
          </p>
        </div>

        <div className="h-8" />
      </div>

      {/* Detail modal for assistance options */}
      {detailOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm" onClick={() => setDetailOption(null)}>
          <div
            className="bg-white rounded-3xl p-10 text-center max-w-sm w-[90%] shadow-2xl"
            style={{ animation: 'popIn 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={gradText}>Financial Assistance</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{detailOption.name}</h2>
            <div className="mb-4">
              <RiskBadge risk={detailOption.risk} />
            </div>
            <div className="space-y-3 text-left bg-slate-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Cost</span>
                <span className="font-bold text-slate-900">{fmt(detailOption.total_cost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Monthly Payment</span>
                <span className="font-bold text-slate-900">{fmt(detailOption.monthly_payment)}/mo</span>
              </div>
              {totalOutOfNetwork > 0 && (
                <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                  <span className="text-slate-500">Savings vs. full cost</span>
                  <span className="font-bold text-green-700">{fmt(totalOutOfNetwork - detailOption.total_cost)}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setDetailOption(null)}
              className="w-48 py-3 rounded-xl text-white font-bold text-sm"
              style={{ background: 'linear-gradient(90deg,#2563eb,#10b981)', boxShadow: '0 8px 20px rgba(37,99,235,.22)' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
