'use client'

import { useState, useRef, useCallback } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface TreeNode {
  title: string
  description: string
  children?: string[]
  terminal?: boolean
  terminalMessage?: string
}

const TREE: Record<string, TreeNode> = {
  starter: { title: 'Starter', description: 'Perfect for individuals getting started with basic management tools.', children: ['cost-focused', 'ease-of-use'] },
  professional: { title: 'Professional', description: 'Advanced features for growing teams and automated workflows.', children: ['remote-team', 'hybrid-team', 'in-office'] },
  business: { title: 'Business', description: 'Complete suite for large organizations requiring full control.', children: ['operations', 'analytics', 'compliance'] },
  enterprise: { title: 'Enterprise', description: 'Custom solutions for high-volume enterprise needs with dedicated support.', children: ['cloud', 'on-premise', 'hybrid-deploy'] },
  'cost-focused': { title: 'Cost Optimized', description: 'Maximize value with essential tools at our most affordable tier.', children: ['monthly-basic', 'annual-basic'] },
  'ease-of-use': { title: 'Ease of Use', description: 'Simple onboarding and guided workflows for non-technical users.', children: ['self-guided', 'assisted'] },
  'remote-team': { title: 'Remote First', description: 'Built for distributed teams with async tools and timezone management.', children: ['small-remote', 'large-remote'] },
  'hybrid-team': { title: 'Hybrid Team', description: 'Collaborative in-person sessions with remote-friendly tooling.', children: ['async-primary', 'sync-primary'] },
  'in-office': { title: 'In-Office', description: 'Optimized for teams working together in a shared space.', terminal: true, terminalMessage: 'Your In-Office Professional plan is configured. Shared dashboards, room booking, and on-site collaboration tools.' },
  'operations': { title: 'Operations', description: 'Streamline internal processes and track operational KPIs.', terminal: true, terminalMessage: 'Operations Suite selected. Workflow automation, process mapping, and dedicated ops analytics.' },
  'analytics': { title: 'Analytics', description: 'Deep data insights and predictive analytics powered by AI.', terminal: true, terminalMessage: 'Analytics Suite selected. Advanced reporting, BI integrations, and AI-powered forecasting.' },
  'compliance': { title: 'Compliance', description: 'Audit trails, regulatory reporting, and enterprise-grade security.', terminal: true, terminalMessage: 'Compliance Suite selected. SOC 2, HIPAA tooling, audit logs, and dedicated support.' },
  'cloud': { title: 'Cloud Hosted', description: 'Fully managed cloud with 99.99% uptime SLA.', terminal: true, terminalMessage: 'Cloud Enterprise configured. Dedicated environment with custom domain, SLA, and priority support.' },
  'on-premise': { title: 'On-Premise', description: 'Deploy within your own infrastructure for maximum data control.', terminal: true, terminalMessage: 'On-Premise Enterprise selected. Our team will coordinate deployment, licensing, and maintenance.' },
  'hybrid-deploy': { title: 'Hybrid Deploy', description: 'Split workloads between cloud and on-premise for flexibility.', terminal: true, terminalMessage: 'Hybrid Deployment selected. Custom architecture designed by our solutions engineering team.' },
  'monthly-basic': { title: 'Monthly Billing', description: 'Pay month to month with no long-term commitment.', terminal: true, terminalMessage: 'Monthly Starter configured! $19/month, cancel anytime.' },
  'annual-basic': { title: 'Annual Billing', description: 'Save 30% by committing to an annual plan.', terminal: true, terminalMessage: 'Annual Starter configured! $159/year — save $68/year.' },
  'self-guided': { title: 'Self-Guided', description: 'Comprehensive docs, video library, and community forum.', terminal: true, terminalMessage: 'Self-Guided Starter selected. Full access to knowledge base and community.' },
  'assisted': { title: 'Assisted Setup', description: 'A dedicated specialist guides you through your first 30 days.', terminal: true, terminalMessage: 'Assisted Starter selected. An onboarding specialist will reach out within 24 hours.' },
  'small-remote': { title: 'Small Team <20', description: 'Lightweight collaboration for small, agile remote teams.', terminal: true, terminalMessage: 'Remote Professional (small) configured. Up to 20 seats with async collaboration tools.' },
  'large-remote': { title: 'Large Team 20+', description: 'Enterprise-grade collaboration for large distributed organizations.', terminal: true, terminalMessage: 'Remote Professional (large). Unlimited seats with admin controls and SSO.' },
  'async-primary': { title: 'Async First', description: 'Optimized for documentation, recorded updates, and flexible schedules.', terminal: true, terminalMessage: 'Async Hybrid Professional configured. Optimized with async tooling integrations.' },
  'sync-primary': { title: 'Sync First', description: 'Real-time meetings, live editing, and instant communication.', terminal: true, terminalMessage: 'Sync Hybrid Professional. Optimized for real-time collaboration with live editing.' },
}

const ROOT_CHILDREN = ['starter', 'professional', 'business', 'enterprise']
const STEP_LABELS = [
  'Step 1 — Choose your plan',
  'Step 2 — Choose your team type',
  'Step 3 — Customize your plan',
  'Step 4 — Finalize details',
]

// Gradient text style helper (inline, works without Tailwind arbitrary values)
const gradText: React.CSSProperties = {
  background: 'linear-gradient(90deg,#2563eb,#10b981)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

interface Level { ids: string[]; selectedId: string | null }

export default function ResultsPage() {
  const [levels, setLevels] = useState<Level[]>([{ ids: ROOT_CHILDREN, selectedId: null }])
  const [path, setPath] = useState<{ id: string; title: string }[]>([])
  const [completion, setCompletion] = useState<{ id: string; node: TreeNode } | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const selectNode = useCallback((id: string, levelIndex: number) => {
    const node = TREE[id]
    if (!node) return
    setLevels(prev => {
      const next = prev.slice(0, levelIndex + 1).map((l, i) => i === levelIndex ? { ...l, selectedId: id } : l)
      if (!node.terminal && node.children) next.push({ ids: node.children, selectedId: null })
      return next
    })
    setPath(prev => [...prev.slice(0, levelIndex), { id, title: node.title }])
    if (node.terminal) setTimeout(() => setCompletion({ id, node }), 500)
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 300)
  }, [])

  const restart = () => {
    setLevels([{ ids: ROOT_CHILDREN, selectedId: null }])
    setPath([])
    setCompletion(null)
    setConfirmed(false)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#f6f7f8] font-sans text-slate-900 flex flex-col overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to bottom,rgba(246,247,248,.45),rgba(246,247,248,.75)),url('/bg.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      </div>

      {/* Top bar */}
      <Header rightSlot={
        <button onClick={restart} className="text-xs font-semibold text-slate-500 hover:text-red-500 border border-slate-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-all bg-white/80">
          ↺ Restart
        </button>
      } />

      {/* Canvas */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden pb-20">
        <div className="text-center pt-10 pb-8 px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Select the best option for you</h2>
          <p className="text-slate-500 text-sm mt-2">Choose a plan that fits your workflow.</p>
        </div>

        {levels.map((level, levelIndex) => (
          <div key={levelIndex} className="mb-2">
            {levelIndex > 0 && (
              <div className="flex justify-center mb-4">
                <div className="w-px h-10 opacity-50" style={{ background: 'linear-gradient(to bottom,#2563eb,#10b981)' }} />
              </div>
            )}
            <div className="text-center mb-4 text-xs font-bold uppercase tracking-widest" style={gradText}>
              {STEP_LABELS[levelIndex] ?? `Step ${levelIndex + 1}`}
            </div>
            <div className="flex flex-wrap justify-center gap-4 px-6">
              {level.ids.map(id => {
                const node = TREE[id]
                if (!node) return null
                const isSelected = level.selectedId === id
                const isRejected = level.selectedId !== null && !isSelected
                const isActive = level.selectedId === null

                // Card background styles
                const cardStyle: React.CSSProperties = isSelected && node.terminal
                  ? {
                    // Unique deep blue→green for final node
                    background: 'linear-gradient(135deg,#1d4ed8 0%,#059669 100%)',
                    border: '2px solid transparent',
                    boxShadow: '0 0 0 3px rgba(16,185,129,.4),0 10px 30px rgba(16,185,129,.25)',
                    cursor: 'default',
                  }
                  : isSelected
                    ? {
                      // Light blue→green tint for intermediate selected
                      background: 'linear-gradient(135deg,#eff6ff 0%,#d1fae5 100%)',
                      border: '2px solid #2563eb',
                      boxShadow: '0 0 0 3px rgba(37,99,235,.14),0 8px 24px rgba(37,99,235,.18)',
                      cursor: 'default',
                    }
                    : { transition: 'all 0.3s cubic-bezier(.16,1,.3,1)' }

                return (
                  <div
                    key={id}
                    onClick={() => isActive && selectNode(id, levelIndex)}
                    className={[
                      'relative p-5 flex flex-col w-44 rounded-[18px] backdrop-blur-sm',
                      'bg-white/92 border border-slate-200/80 shadow-sm',
                      isActive ? 'cursor-pointer hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300' : '',
                      isRejected ? 'opacity-25 cursor-default grayscale-[30%]' : '',
                    ].join(' ')}
                    style={cardStyle}
                  >
                    {isSelected && (
                      <div
                        className="absolute -top-2.5 left-3 text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full z-10"
                        style={
                          node.terminal
                            ? { background: 'linear-gradient(90deg,#f0fdf4,#d1fae5)', color: '#065f46', border: '1px solid rgba(16,185,129,.4)' }
                            : { background: 'linear-gradient(90deg,#2563eb,#10b981)', color: '#fff' }
                        }
                      >
                        {node.terminal ? '✓ Final' : 'Selected'}
                      </div>
                    )}

                    <div className="text-sm font-bold mb-1.5" style={isSelected && node.terminal ? { color: '#fff' } : { color: '#0f172a' }}>
                      {node.title}
                    </div>
                    <div className="text-[11px] leading-relaxed flex-1" style={isSelected && node.terminal ? { color: 'rgba(255,255,255,.75)' } : { color: '#64748b' }}>
                      {node.description}
                    </div>
                    <div
                      className="mt-3 pt-2.5 border-t text-[11px] font-bold"
                      style={
                        isSelected && node.terminal
                          ? { borderColor: 'rgba(255,255,255,.2)', color: '#fff' }
                          : { borderColor: 'rgba(203,213,225,.5)', ...gradText }
                      }
                    >
                      {isSelected ? (node.terminal ? '✓ Final choice' : '→ Continued') : (node.terminal ? 'Select →' : 'Explore →')}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div className="h-16" />
      </div>

      {/* Completion modal */}
      {completion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-12 text-center max-w-md w-[90%] shadow-2xl" style={{ animation: 'popIn 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
            <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.85) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={gradText}>Configuration Complete</div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">{completion.node.title}</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">{completion.node.terminalMessage}</p>
            <p className="text-xs text-slate-400 italic mb-7">Path: {path.map(p => p.title).join(' → ')}</p>
            {confirmed ? (
              <div className="font-bold text-sm" style={gradText}>✓ Selection confirmed!</div>
            ) : (
              <div className="flex flex-col gap-3 items-center">
                <button
                  onClick={() => setConfirmed(true)}
                  className="w-60 py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(90deg,#2563eb,#10b981)', boxShadow: '0 8px 20px rgba(37,99,235,.22)' }}
                >
                  ✓ Confirm Selection
                </button>
                <button
                  onClick={restart}
                  className="w-60 py-3 rounded-xl font-semibold text-sm transition-colors hover:bg-blue-50"
                  style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(#fff,#fff),linear-gradient(90deg,#2563eb,#10b981)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box,border-box' }}
                >
                  <span style={gradText}>Start Over</span>
                </button>
                <button onClick={() => setCompletion(null)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  View full tree
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <Footer />
    </div>
  )
}
