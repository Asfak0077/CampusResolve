import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import AppShell from '../components/ds/AppShell'
import { getAllFeedback, FeedbackPayload } from '../services/feedbackService'
import {
  Users, Star, Smile, Frown, Calendar,
  BarChart3, Target, HandHeart
} from 'lucide-react'
import { motion } from 'framer-motion'

/* Bar colors: red → green, readable in light + dark mode */
const STAR_COLORS = ['#e11d48', '#f97316', '#f59e0b', '#10b981', '#059669']

const deptColor = (avg: number): string => {
  if (avg >= 4) return '#059669'
  if (avg >= 3) return '#f59e0b'
  return '#e11d48'
}

const paperTooltip = {
  backgroundColor: 'var(--paper)',
  borderColor: 'var(--paper-edge)',
  borderRadius: '8px',
  color: 'var(--text-heading)',
  fontFamily: "'Courier Prime', monospace",
  fontSize: '12px',
  fontWeight: 700,
} as const

const FeedbackAnalyticsPage = () => {
  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['feedback_analytics'],
    queryFn: getAllFeedback
  })

  const todayFormatted = useMemo(() => new Date().toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  }), [])

  const stats = useMemo(() => {
    if (!feedbacks.length) return null

    const total = feedbacks.length
    const avgRating = (feedbacks.reduce((acc: number, curr: FeedbackPayload) => acc + curr.rating, 0) / total).toFixed(1)
    const happyCount = feedbacks.filter((f: FeedbackPayload) => f.rating >= 4).length
    const unhappyCount = feedbacks.filter((f: FeedbackPayload) => f.rating <= 2).length

    const distribution = [0, 0, 0, 0, 0]
    feedbacks.forEach((f: FeedbackPayload) => {
      if (f.rating >= 1 && f.rating <= 5) {
        distribution[f.rating - 1]++
      }
    })

    const distributionData = [
      { name: '1 star', count: distribution[0] },
      { name: '2 stars', count: distribution[1] },
      { name: '3 stars', count: distribution[2] },
      { name: '4 stars', count: distribution[3] },
      { name: '5 stars', count: distribution[4] }
    ]

    const depts: Record<string, { total: number; count: number }> = {}
    feedbacks.forEach((f: FeedbackPayload) => {
      const d = f.department || 'General'
      if (!depts[d]) depts[d] = { total: 0, count: 0 }
      depts[d].total += f.rating
      depts[d].count += 1
    })

    const departmentData = Object.keys(depts).map((d) => ({
      name: d,
      avg: Number((depts[d].total / depts[d].count).toFixed(1))
    }))

    return { total, avgRating, happyCount, unhappyCount, distributionData, departmentData }
  }, [feedbacks])

  return (
    <AppShell>
      <div className="space-y-5 pb-8">
        {/* ── 1. Header ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="paper-font-type text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)] mb-1">
              Reports / Happiness
            </p>
            <h1 className="paper-font-type text-2xl sm:text-3xl font-bold text-[var(--text-heading)] tracking-tight">
              How Happy Are Students?
            </h1>
            <p className="text-[13.5px] text-[var(--text-secondary)] mt-1 font-medium">
              A simple summary of student ratings — what students love, and what needs fixing.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="paper-font-type flex items-center gap-2 text-[12px] font-bold text-[var(--text-secondary)] paper-card rounded-md px-3 py-2 -rotate-[0.6deg]">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>{todayFormatted}</span>
            </div>
            <div className="paper-font-type flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700 dark:text-blue-400 bg-blue-500/10 px-3 py-2 rounded-md border-[1.5px] border-dashed border-blue-600/50 -rotate-1">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Report</span>
            </div>
          </div>
        </div>

        {/* ── Loading ────────────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="paper-card rounded-md p-5 h-[132px] space-y-3">
                  <div className="h-4 w-24 rounded-md bg-black/[0.06] dark:bg-white/10 animate-pulse border border-dashed border-[#e5dcc3] dark:border-white/10" />
                  <div className="h-8 w-16 rounded-md bg-black/[0.06] dark:bg-white/10 animate-pulse" />
                  <div className="h-3 w-full rounded-md bg-black/[0.04] dark:bg-white/5 animate-pulse" />
                </div>
              ))}
            </div>
            <p className="paper-font-type text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] animate-pulse">
              Collecting ratings…
            </p>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────── */}
        {!isLoading && !stats && (
          <div className="paper-card rounded-md p-12 text-center">
            <div className="w-14 h-14 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 mx-auto flex items-center justify-center -rotate-2">
              <Star className="w-7 h-7" />
            </div>
            <h3 className="paper-font-type text-lg font-bold text-[var(--text-heading)] mt-4">
              No ratings yet
            </h3>
            <p className="text-[13px] text-[var(--text-muted)] font-medium max-w-md mx-auto mt-1.5 leading-relaxed">
              Once students rate their resolved complaints, you will see the results here —
              average scores, happy vs unhappy counts, and per-department ratings.
            </p>
            <p className="paper-font-hand text-[20px] text-[var(--text-muted)] mt-3">
              waiting for the first stars ★
            </p>
          </div>
        )}

        {stats && (
          <div className="space-y-5">
            {/* ── 2. Score cards ─────────────────────────────── */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[
                { label: 'Total ratings', value: String(stats.total).padStart(2, '0'), hint: 'How many students rated', icon: Users, chip: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
                { label: 'Average score', value: `${stats.avgRating} ★`, hint: 'Out of 5 stars', icon: Star, chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
                { label: 'Happy students', value: `${Math.round((stats.happyCount / (feedbacks.length || 1)) * 100)}%`, hint: 'Gave 4 or 5 stars', icon: Smile, chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
                { label: 'Unhappy students', value: String(stats.unhappyCount).padStart(2, '0'), hint: 'Gave 1 or 2 stars — read these first', icon: Frown, chip: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' },
              ].map((card, idx) => {
                const Icon = card.icon
                return (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    whileHover={{ y: -2, rotate: -0.4 }}
                    className="paper-card rounded-md p-4 flex flex-col justify-between h-[132px] transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="paper-font-type text-[10px] font-bold text-[var(--text-muted)] tracking-[0.14em] uppercase truncate">
                        {card.label}
                      </span>
                      <div className={`w-7 h-7 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 flex items-center justify-center ${card.chip} shrink-0 -rotate-2`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="paper-font-type text-2xl font-bold text-[var(--text-heading)] tracking-tight tabular-nums">
                      {card.value}
                    </div>
                    <p className="text-[11px] font-medium text-[var(--text-muted)] leading-snug">
                      {card.hint}
                    </p>
                  </motion.div>
                )
              })}
            </section>

            {/* ── 3. Charts ──────────────────────────────────── */}
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="paper-card rounded-md p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 pb-4 mb-1 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10">
                  <div>
                    <h3 className="paper-font-type text-[15px] font-bold text-[var(--text-heading)] tracking-tight">
                      How students rated
                    </h3>
                    <p className="text-[12px] text-[var(--text-muted)] font-medium mt-0.5">
                      Count of each star rating. Tall green bars mean happy students.
                    </p>
                  </div>
                  <span className="p-2 rounded-md border-[1.5px] border-dashed border-emerald-600/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0 -rotate-2">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                </div>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.distributionData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148, 163, 184, 0.2)" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={70} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ ...paperTooltip }} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} name="Ratings">
                        {stats.distributionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={STAR_COLORS[index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="paper-card rounded-md p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 pb-4 mb-1 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10">
                  <div>
                    <h3 className="paper-font-type text-[15px] font-bold text-[var(--text-heading)] tracking-tight">
                      Score by department
                    </h3>
                    <p className="text-[12px] text-[var(--text-muted)] font-medium mt-0.5">
                      Average stars per department. Short red bars need your help.
                    </p>
                  </div>
                  <span className="p-2 rounded-md border-[1.5px] border-dashed border-blue-600/50 bg-blue-500/10 text-blue-700 dark:text-blue-400 shrink-0 -rotate-2">
                    <Target className="h-4 w-4" />
                  </span>
                </div>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.departmentData} margin={{ bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 5]} hide />
                      <Tooltip contentStyle={{ ...paperTooltip }} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                      <Bar dataKey="avg" radius={[4, 4, 0, 0]} barSize={36} name="Avg stars">
                        {stats.departmentData.map((d, i) => (
                          <Cell key={`dept-${i}`} fill={deptColor(d.avg)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── 4. What to do next ─────────────────────────── */}
            <div className="paper-card rounded-md px-5 py-4 flex items-start gap-3">
              <span className="p-1.5 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-[var(--text-muted)] shrink-0 -rotate-2">
                <HandHeart className="w-4 h-4" />
              </span>
              <p className="text-[12.5px] text-[var(--text-secondary)] font-medium leading-relaxed">
                <span className="paper-font-type font-bold text-[var(--text-heading)]">What to do next: </span>
                start with the unhappy students (1–2 stars) — open their feedback and fix what went wrong.
                Then look at the lowest department bar above and ask that team what support they need.
                Green bars mean keep doing what you are doing!
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default FeedbackAnalyticsPage
