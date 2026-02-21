'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ── Tree Data ─────────────────────────────────────────────
interface TreeNode {
  title: string
  icon: string
  description: string
  children?: string[]
  terminal?: boolean
  terminalMessage?: string
  question?: string
}

const TREE: Record<string, TreeNode> = {
  starter:        { title:'Starter',          icon:'🌱', description:'Perfect for individuals getting started with basic management tools.',                   children:['cost-focused','ease-of-use'] },
  professional:   { title:'Professional',     icon:'⚡', description:'Advanced features for growing teams and automated workflows.',                           children:['remote-team','hybrid-team','in-office'] },
  business:       { title:'Business',         icon:'🏢', description:'Complete suite for large organizations requiring full control.',                         children:['operations','analytics','compliance'] },
  enterprise:     { title:'Enterprise',       icon:'🌐', description:'Custom solutions for high-volume enterprise needs with dedicated support.',               children:['cloud','on-premise','hybrid-deploy'] },
  'cost-focused': { title:'Cost Optimized',   icon:'💰', description:'Maximize value with essential tools at our most affordable tier.',                       children:['monthly-basic','annual-basic'] },
  'ease-of-use':  { title:'Ease of Use',      icon:'✨', description:'Simple onboarding and guided workflows for non-technical users.',                        children:['self-guided','assisted'] },
  'remote-team':  { title:'Remote First',     icon:'🌍', description:'Built for distributed teams with async tools and timezone management.',                  children:['small-remote','large-remote'] },
  'hybrid-team':  { title:'Hybrid Team',      icon:'🔀', description:'Collaborative in-person sessions with remote-friendly tooling.',                         children:['async-primary','sync-primary'] },
  'in-office':    { title:'In-Office',        icon:'🏛️', description:'Optimized for teams working together in a shared space.',                                terminal:true, terminalMessage:'Your In-Office Professional plan is configured. Shared dashboards, room booking, and on-site collaboration tools.' },
  'operations':   { title:'Operations',       icon:'⚙️', description:'Streamline internal processes and track operational KPIs.',                              terminal:true, terminalMessage:'Operations Suite selected. Workflow automation, process mapping, and dedicated ops analytics.' },
  'analytics':    { title:'Analytics',        icon:'📊', description:'Deep data insights and predictive analytics powered by AI.',                             terminal:true, terminalMessage:'Analytics Suite selected. Advanced reporting, BI integrations, and AI-powered forecasting.' },
  'compliance':   { title:'Compliance',       icon:'🛡️', description:'Audit trails, regulatory reporting, and enterprise-grade security.',                    terminal:true, terminalMessage:'Compliance Suite selected. SOC 2, HIPAA tooling, audit logs, and dedicated support.' },
  'cloud':        { title:'Cloud Hosted',     icon:'☁️', description:'Fully managed cloud with 99.99% uptime SLA.',                                           terminal:true, terminalMessage:'Cloud Enterprise configured. Dedicated environment with custom domain, SLA, and priority support.' },
  'on-premise':   { title:'On-Premise',       icon:'🖥️', description:'Deploy within your own infrastructure for maximum data control.',                       terminal:true, terminalMessage:'On-Premise Enterprise selected. Our team will coordinate deployment, licensing, and maintenance.' },
  'hybrid-deploy':{ title:'Hybrid Deploy',    icon:'🔗', description:'Split workloads between cloud and on-premise for flexibility.',                          terminal:true, terminalMessage:'Hybrid Deployment selected. Custom architecture designed by our solutions engineering team.' },
  'monthly-basic':{ title:'Monthly Billing',  icon:'📅', description:'Pay month to month with no long-term commitment.',                                       terminal:true, terminalMessage:'Monthly Starter configured! $19/month, cancel anytime.' },
  'annual-basic': { title:'Annual Billing',   icon:'🗓️', description:'Save 30% by committing to an annual plan.',                                             terminal:true, terminalMessage:'Annual Starter configured! $159/year — save $68/year.' },
  'self-guided':  { title:'Self-Guided',      icon:'📚', description:'Comprehensive docs, video library, and community forum.',                                terminal:true, terminalMessage:'Self-Guided Starter selected. Full access to knowledge base and community.' },
  'assisted':     { title:'Assisted Setup',   icon:'🤝', description:'A dedicated specialist guides you through your first 30 days.',                          terminal:true, terminalMessage:'Assisted Starter selected. An onboarding specialist will reach out within 24 hours.' },
  'small-remote': { title:'Small Team <20',   icon:'👥', description:'Lightweight collaboration for small, agile remote teams.',                               terminal:true, terminalMessage:'Remote Professional (small) configured. Up to 20 seats with async collaboration tools.' },
  'large-remote': { title:'Large Team 20+',   icon:'🏟️', description:'Enterprise-grade collaboration for large distributed organizations.',                   terminal:true, terminalMessage:'Remote Professional (large). Unlimited seats with admin controls and SSO.' },
  'async-primary':{ title:'Async First',      icon:'⏳', description:'Optimized for documentation, recorded updates, and flexible schedules.',                 terminal:true, terminalMessage:'Async Hybrid Professional configured. Optimized with async tooling integrations.' },
  'sync-primary': { title:'Sync First',       icon:'🔔', description:'Real-time meetings, live editing, and instant communication.',                           terminal:true, terminalMessage:'Sync Hybrid Professional. Optimized for real-time collaboration with live editing.' },
}

const ROOT_CHILDREN = ['starter', 'professional', 'business', 'enterprise']

interface Level {
  ids: string[]
  selectedId: string | null
}

export default function ResultsPage() {
  const router = useRouter()
  const [levels, setLevels] = useState<Level[]>([{ ids: ROOT_CHILDREN, selectedId: null }])
  const [path, setPath] = useState<{ id: string; title: string; icon: string }[]>([])
  const [completion, setCompletion] = useState<{ id: string; node: TreeNode } | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const selectNode = useCallback((id: string, levelIndex: number) => {
    const node = TREE[id]
    if (!node) return

    // Update level selection
    setLevels(prev => {
      const next = prev.map((l, i) => i === levelIndex ? { ...l, selectedId: id } : l)
      if (!node.terminal && node.children) {
        next.push({ ids: node.children, selectedId: null })
      }
      return next
    })

    setPath(prev => [...prev, { id, title: node.title, icon: node.icon }])

    if (node.terminal) {
      setTimeout(() => setCompletion({ id, node }), 500)
    }

    // Scroll down after a short delay
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 300)
  }, [])

  const restart = () => {
    setLevels([{ ids: ROOT_CHILDREN, selectedId: null }])
    setPath([])
    setCompletion(null)
    setConfirmed(false)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const STEP_LABELS = [
    'Step 1 — Choose your plan',
    'Step 2 — Choose your team type',
    'Step 3 — Customize your plan',
    'Step 4 — Finalize details',
  ]

  return (
    <div className="min-h-screen bg-[#f6f7f8] font-sans text-slate-900 flex flex-col overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(246,247,248,0.5), rgba(246,247,248,0.82)), url('/bg.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex-shrink-0 flex items-center gap-3 px-7 py-3 bg-white/70 backdrop-blur-xl border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-[1.5px] border-blue-500 bg-blue-50 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
              </svg>
            </div>
          </div>
          <span className="text-lg font-black tracking-tight" style={{ fontFamily: '"Public Sans", sans-serif' }}>
            Aid<span className="text-blue-600">Aura</span>
          </span>
        </div>

        <span className="text-slate-300 mx-1">|</span>
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">Decision Navigator</span>

        {/* Breadcrumb */}
        {path.length > 0 && (
          <div className="flex items-center gap-1 ml-2 flex-wrap">
            {path.map((p, i) => (
              <span key={i} className="flex items-center gap-1 text-xs text-slate-500">
                {i > 0 && <span className="text-slate-300">›</span>}
                <span className={i === path.length - 1 ? 'font-semibold text-slate-700' : ''}>
                  {p.icon} {p.title}
                </span>
              </span>
            ))}
          </div>
        )}

        <button
          onClick={restart}
          className="ml-auto text-xs font-semibold text-slate-500 hover:text-red-500 border border-slate-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-all bg-white/80"
        >
          ↺ Restart
        </button>
      </div>

      {/* Scrollable canvas */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden pb-20">
        <div className="relative w-full">
          {/* Intro */}
          <div className="text-center pt-10 pb-8 px-6">
            <div className="text-xs font-bold tracking-widest uppercase text-blue-500 mb-3">Configuration Wizard</div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Select the best option for you</h2>
            <p className="text-slate-500 text-sm mt-2">Choose a plan that fits your workflow.</p>
          </div>

          {/* Levels */}
          {levels.map((level, levelIndex) => (
            <div key={levelIndex} className="mb-2">
              {/* Level label */}
              <div className="text-center mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                <span className="text-blue-500">{STEP_LABELS[levelIndex] ?? `Step ${levelIndex + 1}`}</span>
              </div>

              {/* Connector from previous */}
              {levelIndex > 0 && (
                <div className="flex justify-center mb-4">
                  <div className="w-px h-10 bg-gradient-to-b from-blue-400 to-teal-400 opacity-40" />
                </div>
              )}

              {/* Cards row */}
              <div className="flex flex-wrap justify-center gap-4 px-6">
                {level.ids.map((id) => {
                  const node = TREE[id]
                  if (!node) return null
                  const isSelected = level.selectedId === id
                  const isRejected = level.selectedId !== null && !isSelected
                  const isActive   = level.selectedId === null

                  return (
                    <div
                      key={id}
                      onClick={() => isActive && selectNode(id, levelIndex)}
                      className={[
                        'node-card p-5 flex flex-col w-44',
                        isSelected ? 'selected' : '',
                        isRejected ? 'rejected' : '',
                        node.terminal ? 'terminal' : '',
                      ].join(' ')}
                      style={{ transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)' }}
                    >
                      {isSelected && (
                        <div className="absolute -top-2.5 left-3 bg-blue-500 text-white text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full z-10">
                          Selected
                        </div>
                      )}
                      <div className="text-2xl mb-2">{node.icon}</div>
                      <div className="text-sm font-bold text-slate-900 mb-1.5">{node.title}</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed flex-1">{node.description}</div>
                      <div className={`mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold ${node.terminal ? 'text-green-600' : 'text-blue-500'}`}>
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
      </div>

      {/* Completion modal */}
      {completion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm">
          <div
            className="bg-white/97 rounded-3xl p-12 text-center max-w-md w-[90%] shadow-2xl"
            style={{ animation: 'popIn 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
          >
            <style>{`@keyframes popIn { from { opacity:0; transform:scale(0.85) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
            <div className="text-5xl mb-4">{completion.node.icon}</div>
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-green-500 mb-3">Configuration Complete</div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">{completion.node.title}</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">{completion.node.terminalMessage}</p>
            <p className="text-xs text-slate-400 italic mb-7">
              Path: {path.map(p => `${p.icon} ${p.title}`).join(' → ')}
            </p>

            {confirmed ? (
              <div className="text-green-600 font-bold text-sm">✓ Selection confirmed!</div>
            ) : (
              <div className="flex flex-col gap-3 items-center">
                <button
                  onClick={() => setConfirmed(true)}
                  className="btn-analyze w-60 py-3.5 rounded-xl text-white font-bold text-sm"
                >
                  ✓ Confirm Selection
                </button>
                <button
                  onClick={restart}
                  className="w-60 py-3 rounded-xl border-2 border-blue-500 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition-colors"
                >
                  Start Over
                </button>
                <button
                  onClick={() => setCompletion(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  View full tree
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
