import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles, AlertTriangle, RefreshCw, CheckCircle2, X,
  MapPin, Building2, Eye, Flame, Lightbulb, LayoutGrid,
  ArrowRight, HandHeart
} from 'lucide-react'
import AppShell from '../components/ds/AppShell'
import {
  fetchCampusIntelligenceSummary,
  smartEscalateComplaint,
  dismissAIRecommendation
} from '../services/aiIntelligenceService'
import { CampusIntelligenceSummary, AIRecommendationItem } from '../types/domain'
import { useToast } from '../components/shared/ToastNotification'
import ComplaintAIIntelligencePanel from '../components/shared/ComplaintAIIntelligencePanel'

type FilterId = 'all' | 'urgent' | 'patterns' | 'opportunities'

/* ── Plain-word helpers ─────────────────────────────────────── */
const plainPriority = (priority: string): { label: string; classes: string } => {
  switch (priority?.toUpperCase()) {
    case 'CRITICAL':
      return { label: 'Very urgent', classes: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-600/50' }
    case 'HIGH':
      return { label: 'Urgent', classes: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-600/50' }
    case 'MEDIUM':
      return { label: 'Normal', classes: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-600/50' }
    default:
      return { label: 'Low', classes: 'bg-transparent text-[var(--text-muted)] border-[var(--border-strong)]' }
  }
}

const certaintyWords = (confidence: number): string => {
  if (confidence >= 85) return 'The AI is very sure about this.'
  if (confidence >= 65) return 'The AI is quite sure about this.'
  return 'The AI thinks this is likely.'
}

const DismissButton: React.FC<{ onDismiss: () => void; disabled?: boolean }> = ({ onDismiss, disabled }) => (
  <button
    onClick={onDismiss}
    disabled={disabled}
    className="paper-font-type text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
    title="Hide this suggestion"
  >
    Ignore
  </button>
)

const WhyBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div>
    <p className="paper-font-type text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] mb-1">
      Why am I seeing this?
    </p>
    <p className="text-[12.5px] text-[var(--text-secondary)] font-medium leading-relaxed">
      {children}
    </p>
  </div>
)

const DoBox: React.FC<{ children: React.ReactNode; tone?: 'amber' | 'plain' }> = ({ children, tone = 'plain' }) => (
  <div className={`p-3 rounded-md border-[1.5px] border-dashed ${
    tone === 'amber'
      ? 'bg-amber-500/[0.08] dark:bg-amber-500/10 border-amber-600/50'
      : 'bg-[#efe7d2]/50 dark:bg-white/5 border-[#cbbf9a] dark:border-slate-500'
  }`}>
    <p className={`paper-font-type text-[10px] font-bold uppercase tracking-[0.16em] mb-1 ${
      tone === 'amber' ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--text-muted)]'
    }`}>
      What you can do
    </p>
    <p className="text-[12.5px] font-bold text-[var(--text-heading)] leading-relaxed">
      {children}
    </p>
  </div>
)

const AIRecommendationsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterId>('all')

  const {
    data: summary,
    isLoading: isSummaryLoading,
    isFetching,
    refetch
  } = useQuery<CampusIntelligenceSummary>({
    queryKey: ['campus-intelligence-summary'],
    queryFn: () => fetchCampusIntelligenceSummary(),
    staleTime: 3 * 60 * 1000
  })

  const escalateMutation = useMutation({
    mutationFn: ({ complaintId, reason }: { complaintId: string; reason: string }) =>
      smartEscalateComplaint(complaintId, reason),
    onSuccess: (data: any) => {
      showToast('success', `✓ ${data?.ticketId || 'Complaint'} marked as urgent!`)
      queryClient.invalidateQueries({ queryKey: ['campus-intelligence-summary'] })
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
    },
    onError: (err: any) => {
      showToast('error', err?.message || 'Could not mark as urgent. Please try again.')
    }
  })

  const dismissMutation = useMutation({
    mutationFn: (id: string) => dismissAIRecommendation(id),
    onSuccess: () => {
      showToast('info', 'Suggestion hidden.')
      queryClient.invalidateQueries({ queryKey: ['campus-intelligence-summary'] })
    },
    onError: () => {
      showToast('error', 'Could not hide this suggestion.')
    }
  })

  const urgentActions = summary?.aiRecommendations?.urgentActions || []
  const patternAlerts = summary?.aiRecommendations?.patternAlerts || []
  const opportunities = summary?.aiRecommendations?.opportunities || []

  const showUrgent = activeFilter === 'all' || activeFilter === 'urgent'
  const showPatterns = activeFilter === 'all' || activeFilter === 'patterns'
  const showOpportunities = activeFilter === 'all' || activeFilter === 'opportunities'

  const totalRecommendations = urgentActions.length + patternAlerts.length + opportunities.length

  const filters: { id: FilterId; label: string; hint: string; count: number; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Everything', hint: 'All suggestions', count: totalRecommendations, icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'urgent', label: 'Needs attention now', hint: 'Act first here', count: urgentActions.length, icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { id: 'patterns', label: 'Repeating problems', hint: 'Same issue, many times', count: patternAlerts.length, icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'opportunities', label: 'Ideas to improve', hint: 'Prevent future issues', count: opportunities.length, icon: <Lightbulb className="w-3.5 h-3.5" /> },
  ]

  return (
    <AppShell>
      <div className="space-y-5 pb-8">
        {/* ── 1. Page header ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="paper-font-type text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)] mb-1">
              AI help / Suggestions
            </p>
            <div className="flex items-center gap-3">
              <div className="paper-font-type w-11 h-11 rounded-md bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] flex items-center justify-center font-bold border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_3px_0_#0f172a] dark:shadow-[0_3px_0_#64748b] shrink-0 -rotate-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="paper-font-type text-2xl sm:text-3xl font-bold text-[var(--text-heading)] tracking-tight leading-tight">
                  Smart Suggestions
                </h1>
                <p className="text-[13.5px] text-[var(--text-secondary)] mt-0.5 font-medium">
                  The AI reads every complaint and tells you, in simple words, what needs your attention.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="paper-font-type inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#fffdf4] dark:bg-[#1c2333] hover:bg-[#f5eedd] dark:hover:bg-[#232c40] border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-xs font-bold text-[var(--text-primary)] shadow-[0_2px_0_rgba(60,50,30,0.25)] transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isFetching ? 'Checking…' : 'Check again'}</span>
          </button>
        </div>

        {/* ── 2. How to use this page ────────────────────────── */}
        <div className="paper-card rounded-md p-5">
          <p className="paper-font-type text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-3">
            How to use this page — 3 easy steps
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { n: '1', title: 'Start at the top', desc: '“Needs attention now” lists complaints that may miss their deadline.' },
              { n: '2', title: 'Read the suggestion', desc: 'Each card explains why you see it and what you can do.' },
              { n: '3', title: 'Take action', desc: 'Mark it urgent, open the details, or ignore it if all is fine.' },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-3 p-3 rounded-md border border-dashed border-[#e5dcc3] dark:border-white/10 bg-[#efe7d2]/40 dark:bg-white/[0.03]">
                <span className="paper-font-type w-7 h-7 rounded-md bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] text-sm font-bold flex items-center justify-center shrink-0 -rotate-3 border border-[#0f172a] dark:border-[#cbd5e1]">
                  {s.n}
                </span>
                <div>
                  <p className="paper-font-type text-[12.5px] font-bold text-[var(--text-heading)]">{s.title}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] font-medium leading-snug mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. Filters ─────────────────────────────────────── */}
        <div className="paper-card rounded-md p-2.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {filters.map((f) => {
              const active = activeFilter === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  title={f.hint}
                  className={`paper-font-type px-3.5 py-2 rounded-md text-[12px] font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap border ${
                    active
                      ? 'bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_2px_0_#0f172a] dark:shadow-[0_2px_0_#64748b]'
                      : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/5 border-transparent hover:border-dashed hover:border-[#cbbf9a]'
                  }`}
                >
                  {f.icon}
                  <span>{f.label}</span>
                  <span className={`paper-font-type px-1.5 py-px rounded border-[1.5px] border-dashed text-[10px] font-bold tabular-nums ${
                    active ? 'border-white/40 text-white dark:text-[#0f172a] dark:border-[#0f172a]/30' : 'border-[#cbbf9a] dark:border-slate-500 text-[var(--text-muted)]'
                  }`}>
                    {f.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Loading ────────────────────────────────────────── */}
        {isSummaryLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="paper-card rounded-md p-5 space-y-3">
                <div className="h-5 w-28 rounded-md bg-black/[0.06] dark:bg-white/10 animate-pulse border border-dashed border-[#e5dcc3] dark:border-white/10" />
                <div className="h-4 w-3/4 rounded-md bg-black/[0.06] dark:bg-white/10 animate-pulse" />
                <div className="h-16 w-full rounded-md bg-black/[0.04] dark:bg-white/5 animate-pulse border border-dashed border-[#e5dcc3] dark:border-white/10" />
                <p className="paper-font-type text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] animate-pulse">
                  Reading complaints…
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────── */}
        {totalRecommendations === 0 && !isSummaryLoading && (
          <div className="paper-card rounded-md p-12 text-center">
            <div className="w-14 h-14 rounded-md border-[1.5px] border-dashed border-emerald-600/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center -rotate-2">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="paper-font-type text-lg font-bold text-[var(--text-heading)] mt-4">
              All clear! Nothing needs you right now.
            </h3>
            <p className="text-[13px] text-[var(--text-muted)] font-medium max-w-md mx-auto mt-1.5 leading-relaxed">
              The AI checked every complaint. No deadlines are at risk, no issue keeps repeating,
              and there is nothing new to improve. Enjoy your day!
            </p>
            <p className="paper-font-hand text-[20px] text-[var(--text-muted)] mt-3">
              checked &amp; stamped ✓
            </p>
          </div>
        )}

        {/* ── SECTION 1: needs attention now ─────────────────── */}
        {showUrgent && urgentActions.length > 0 && (
          <section className="space-y-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 rounded-md border-[1.5px] border-dashed border-rose-600/50 bg-rose-500/10 text-rose-700 dark:text-rose-400 -rotate-2">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <h2 className="paper-font-type text-[15px] font-bold text-[var(--text-heading)] tracking-tight">
                  Needs attention now
                </h2>
                <span className="paper-font-type text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md border-[1.5px] border-dashed border-rose-600/50 bg-rose-500/10 text-rose-700 dark:text-rose-400 -rotate-[0.6deg]">
                  {urgentActions.length} need action
                </span>
              </div>
              <p className="text-[12.5px] text-[var(--text-muted)] font-medium mt-1 ml-9">
                These complaints may miss their deadline. Please look at these first.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {urgentActions.map((rec: AIRecommendationItem, idx: number) => {
                const pr = plainPriority(rec.priority)
                return (
                  <article
                    key={rec.id}
                    className="paper-card rounded-md p-5 border-l-4 !border-l-rose-500 flex flex-col justify-between gap-4 hover:-translate-y-px transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="paper-font-type text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md border border-[#0f172a] dark:border-[#cbd5e1] bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] -rotate-1">
                          #{idx + 1} · Do first
                        </span>
                        <span className={`paper-font-type text-[10.5px] font-bold uppercase tracking-[0.12em] px-2.5 py-0.5 rounded-md border-[1.5px] border-dashed -rotate-[0.6deg] ${pr.classes}`}>
                          {pr.label}
                        </span>
                      </div>

                      <h3 className="paper-font-type text-[14.5px] font-bold text-[var(--text-heading)] leading-snug">
                        {rec.title}
                      </h3>

                      <WhyBox>{rec.reason}</WhyBox>
                      <DoBox tone="amber">{rec.recommendedAction}</DoBox>

                      <p className="paper-font-type text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        AI is {rec.confidence}% sure — {certaintyWords(rec.confidence)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t-2 border-dashed border-[#e5dcc3] dark:border-white/10 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {rec.complaintId && (
                          <button
                            onClick={() => setSelectedComplaintId(rec.complaintId || null)}
                            className="paper-font-type px-3 py-1.5 rounded-md text-[11.5px] font-bold bg-transparent hover:bg-black/[0.04] dark:hover:bg-white/5 border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            See details
                          </button>
                        )}
                        {rec.complaintId && (
                          <button
                            disabled={escalateMutation.isPending}
                            onClick={() => rec.complaintId && escalateMutation.mutate({ complaintId: rec.complaintId, reason: rec.reason })}
                            className="paper-font-type px-3.5 py-1.5 rounded-md text-[11.5px] font-bold bg-[#b91c1c] hover:bg-[#991b1b] text-white border border-[#450a0a] shadow-[0_2px_0_#450a0a] transition-all cursor-pointer disabled:opacity-50"
                            title="Move this complaint to the very top of the pile"
                          >
                            Mark as urgent
                          </button>
                        )}
                      </div>
                      <DismissButton onDismiss={() => dismissMutation.mutate(rec.id)} disabled={dismissMutation.isPending} />
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {/* ── SECTION 2: repeating problems ──────────────────── */}
        {showPatterns && patternAlerts.length > 0 && (
          <section className="space-y-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 rounded-md border-[1.5px] border-dashed border-violet-600/50 bg-violet-500/10 text-violet-700 dark:text-violet-400 -rotate-2">
                  <Flame className="w-4 h-4" />
                </span>
                <h2 className="paper-font-type text-[15px] font-bold text-[var(--text-heading)] tracking-tight">
                  Repeating problems
                </h2>
                <span className="paper-font-type text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md border-[1.5px] border-dashed border-violet-600/50 bg-violet-500/10 text-violet-700 dark:text-violet-400 -rotate-[0.6deg]">
                  {patternAlerts.length} found
                </span>
              </div>
              <p className="text-[12.5px] text-[var(--text-muted)] font-medium mt-1 ml-9">
                The same problem was reported many times. Fixing the root cause once helps everyone.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patternAlerts.map((rec: AIRecommendationItem) => {
                const pr = plainPriority(rec.priority)
                return (
                  <article
                    key={rec.id}
                    className="paper-card rounded-md p-5 border-l-4 !border-l-violet-500 flex flex-col justify-between gap-4 hover:-translate-y-px transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`paper-font-type text-[10.5px] font-bold uppercase tracking-[0.12em] px-2.5 py-0.5 rounded-md border-[1.5px] border-dashed -rotate-[0.6deg] ${pr.classes}`}>
                          {pr.label}
                        </span>
                        <span className="paper-font-type text-[11px] font-bold text-[var(--text-muted)]" title={certaintyWords(rec.confidence)}>
                          {rec.confidence}% sure
                        </span>
                      </div>

                      <h3 className="paper-font-type text-[14px] font-bold text-[var(--text-heading)] leading-snug">
                        {rec.title}
                      </h3>

                      <WhyBox>{rec.reason}</WhyBox>
                      <DoBox>{rec.recommendedAction}</DoBox>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t-2 border-dashed border-[#e5dcc3] dark:border-white/10">
                      {rec.complaintId ? (
                        <button
                          onClick={() => setSelectedComplaintId(rec.complaintId || null)}
                          className="paper-font-type px-3 py-1.5 rounded-md text-[11.5px] font-bold bg-transparent hover:bg-black/[0.04] dark:hover:bg-white/5 border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-[var(--text-primary)] transition-all cursor-pointer"
                        >
                          See details
                        </button>
                      ) : (
                        <span className="paper-font-type text-[11.5px] font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                          {rec.location || 'Many places'}
                        </span>
                      )}
                      <DismissButton onDismiss={() => dismissMutation.mutate(rec.id)} disabled={dismissMutation.isPending} />
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {/* ── SECTION 3: ideas to improve ────────────────────── */}
        {showOpportunities && opportunities.length > 0 && (
          <section className="space-y-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 rounded-md border-[1.5px] border-dashed border-blue-600/50 bg-blue-500/10 text-blue-700 dark:text-blue-400 -rotate-2">
                  <Lightbulb className="w-4 h-4" />
                </span>
                <h2 className="paper-font-type text-[15px] font-bold text-[var(--text-heading)] tracking-tight">
                  Ideas to improve
                </h2>
                <span className="paper-font-type text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md border-[1.5px] border-dashed border-blue-600/50 bg-blue-500/10 text-blue-700 dark:text-blue-400 -rotate-[0.6deg]">
                  {opportunities.length} ideas
                </span>
              </div>
              <p className="text-[12.5px] text-[var(--text-muted)] font-medium mt-1 ml-9">
                Small changes you can make now so that fewer complaints arrive later. No rush.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {opportunities.map((rec: AIRecommendationItem) => {
                const pr = plainPriority(rec.priority)
                return (
                  <article
                    key={rec.id}
                    className="paper-card rounded-md p-5 border-l-4 !border-l-blue-500 flex flex-col justify-between gap-4 hover:-translate-y-px transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`paper-font-type text-[10.5px] font-bold uppercase tracking-[0.12em] px-2.5 py-0.5 rounded-md border-[1.5px] border-dashed -rotate-[0.6deg] ${pr.classes}`}>
                          {pr.label}
                        </span>
                        <span className="paper-font-type text-[11px] font-bold text-[var(--text-muted)]" title={certaintyWords(rec.confidence)}>
                          {rec.confidence}% sure
                        </span>
                      </div>

                      <h3 className="paper-font-type text-[14px] font-bold text-[var(--text-heading)] leading-snug">
                        {rec.title}
                      </h3>

                      <WhyBox>{rec.reason}</WhyBox>
                      <DoBox>{rec.recommendedAction}</DoBox>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t-2 border-dashed border-[#e5dcc3] dark:border-white/10">
                      {rec.department ? (
                        <span className="paper-font-type text-[11.5px] font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          {rec.department}
                        </span>
                      ) : (
                        <span />
                      )}
                      <DismissButton onDismiss={() => dismissMutation.mutate(rec.id)} disabled={dismissMutation.isPending} />
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Bottom helper ──────────────────────────────────── */}
        {totalRecommendations > 0 && !isSummaryLoading && (
          <div className="paper-card rounded-md px-5 py-4 flex items-start gap-3">
            <span className="p-1.5 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-[var(--text-muted)] shrink-0 -rotate-2">
              <HandHeart className="w-4 h-4" />
            </span>
            <p className="text-[12.5px] text-[var(--text-secondary)] font-medium leading-relaxed">
              Done for now? Press <span className="paper-font-type font-bold text-[var(--text-heading)]">“Check again”</span> at
              the top any time to ask the AI for fresh suggestions. Ignored suggestions stay hidden.
              <span className="paper-font-type font-bold text-[var(--text-heading)] inline-flex items-center gap-1 ml-1">
                You are doing great <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </p>
          </div>
        )}

        {/* ── Details modal ──────────────────────────────────── */}
        <AnimatePresence>
          {selectedComplaintId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-2xl paper-card rounded-md overflow-hidden max-h-[85vh] flex flex-col"
              >
                <div className="p-5 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10 flex items-center justify-between bg-[#efe7d2]/60 dark:bg-white/5">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-blue-700 dark:text-blue-400 -rotate-2">
                      <Eye className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="paper-font-type text-[15px] font-bold text-[var(--text-heading)]">
                        Complaint details
                      </h3>
                      <p className="text-[11.5px] text-[var(--text-muted)] font-medium">
                        Full story of this complaint, plus what the AI found.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedComplaintId(null)}
                    className="w-8 h-8 rounded-md bg-transparent hover:bg-black/[0.05] dark:hover:bg-white/10 border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer shrink-0"
                    aria-label="Close details"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_31px,rgba(37,99,235,0.05)_31px,rgba(37,99,235,0.05)_32px)]">
                  <ComplaintAIIntelligencePanel
                    complaintId={selectedComplaintId}
                    defaultExpanded={true}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}

export default AIRecommendationsPage
