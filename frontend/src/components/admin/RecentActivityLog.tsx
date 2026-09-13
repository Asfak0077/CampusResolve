import { useQuery } from '@tanstack/react-query'
import { Activity, Shield, Zap, CheckCircle2, UserCheck, Clock, RefreshCw, Star, AlertTriangle } from 'lucide-react'
import { fetchActivityLogs, fetchTeacherActivityLogs, ActivityLogEntry } from '../../services/complaintService'
import { formatDisplayComplaintId } from '../shared/ComplaintIdBadge'

interface Props {
  teacherId?: string
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode; edge: string }> = {
  created:           { label: 'New Complaint',       color: 'text-blue-700 dark:text-blue-400',    bg: 'bg-blue-500/[0.07] dark:bg-blue-500/10',    border: 'border-blue-600/50',    icon: <Zap className="h-4 w-4" />, edge: 'border-l-blue-500' },
  assigned:          { label: 'Assigned to Teacher', color: 'text-violet-700 dark:text-violet-400',  bg: 'bg-violet-500/[0.07] dark:bg-violet-500/10',  border: 'border-violet-600/50',  icon: <UserCheck className="h-4 w-4" />, edge: 'border-l-violet-500' },
  reassigned:        { label: 'Reassigned',          color: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-500/[0.08] dark:bg-amber-500/10',   border: 'border-amber-600/50',   icon: <RefreshCw className="h-4 w-4" />, edge: 'border-l-amber-500' },
  status_changed:    { label: 'Status Updated',      color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-500/[0.07] dark:bg-indigo-500/10', border: 'border-indigo-600/50',  icon: <Clock className="h-4 w-4" />, edge: 'border-l-indigo-500' },
  escalated:         { label: 'Escalated',           color: 'text-rose-700 dark:text-rose-400',     bg: 'bg-rose-500/[0.07] dark:bg-rose-500/10',     border: 'border-rose-600/50',     icon: <AlertTriangle className="h-4 w-4" />, edge: 'border-l-rose-500' },
  deleted:           { label: 'Deleted',             color: 'text-slate-500 dark:text-slate-400',    bg: 'bg-slate-500/[0.07] dark:bg-white/5',        border: 'border-slate-400/50',    icon: <Shield className="h-4 w-4" />, edge: 'border-l-slate-400' },
  feedback_submitted:{ label: 'Feedback Submitted',  color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/[0.07] dark:bg-emerald-500/10', border: 'border-emerald-600/50', icon: <Star className="h-4 w-4" />, edge: 'border-l-emerald-500' },
}

const getConfig = (action: string) =>
  ACTION_CONFIG[action] ?? { label: action, color: 'text-slate-500', bg: 'bg-slate-500/[0.07]', border: 'border-slate-400/50', icon: <CheckCircle2 className="h-4 w-4" />, edge: 'border-l-slate-400' }

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const RecentActivityLog = ({ teacherId }: Props = {}) => {
  const { data: logs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['activity-logs', teacherId ?? 'all'],
    queryFn: () => teacherId ? fetchTeacherActivityLogs(teacherId, 15) : fetchActivityLogs(15)
  })

  return (
    <div className="paper-card rounded-md h-full relative overflow-hidden flex flex-col">
      {/* Paper header — dashed ledger divider */}
      <div className="flex items-center justify-between p-5 pb-4 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 -rotate-2">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="paper-font-type text-[15px] font-bold text-[var(--text-heading)] tracking-tight">Activity Log</h3>
            <p className="text-[12px] font-medium text-[var(--text-muted)]">Live operational events</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-md bg-transparent hover:bg-black/[0.04] dark:hover:bg-white/5 border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Ledger rows */}
      <div className="p-4 space-y-2.5 overflow-y-auto max-h-[420px] bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_31px,rgba(37,99,235,0.05)_31px,rgba(37,99,235,0.05)_32px)]">
        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-md bg-black/[0.05] dark:bg-white/5 animate-pulse border border-dashed border-[#e5dcc3] dark:border-white/10" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-muted)]">
            <div className="inline-flex p-4 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 -rotate-2 mb-3">
              <Activity className="h-7 w-7 opacity-40" />
            </div>
            <p className="paper-font-type text-[11px] font-bold uppercase tracking-[0.18em]">No activity recorded yet</p>
          </div>
        ) : (
          logs.map((log: ActivityLogEntry) => {
            const cfg = getConfig(log.action)
            const complaint = log.complaintId
            return (
              <div
                key={log._id}
                className={`flex items-start gap-3 p-3 rounded-md bg-[var(--paper)] border border-[#e5dcc3] dark:border-white/10 border-l-4 ${cfg.edge} shadow-[0_1px_2px_rgba(60,50,30,0.12)] hover:shadow-[0_4px_14px_rgba(60,50,30,0.16)] hover:-translate-y-px transition-all duration-150`}
              >
                <div className={`p-1.5 rounded-md shrink-0 border-[1.5px] border-dashed ${cfg.border} ${cfg.bg} ${cfg.color} -rotate-2`}>
                  {cfg.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`paper-font-type text-[10px] font-bold uppercase tracking-[0.12em] px-1.5 py-px rounded border-[1.5px] border-dashed ${cfg.border} ${cfg.bg} ${cfg.color} -rotate-[0.6deg]`}>{cfg.label}</span>
                    <span className="paper-font-type text-[10px] font-bold text-[var(--text-muted)] whitespace-nowrap shrink-0">{timeAgo(log.createdAt)}</span>
                  </div>

                  {complaint && (
                    <p className="text-[12.5px] font-bold text-[var(--text-primary)] mt-1 truncate">
                      <span className="paper-font-type text-blue-700 dark:text-blue-400 mr-1.5 font-bold">
                        {formatDisplayComplaintId(complaint.complaintId || complaint.ticketNumber || (complaint._id ? `CR-${String(complaint._id).slice(-3).toUpperCase()}` : ''))}
                      </span>
                      <span className="font-sans">{complaint.category || complaint.title || 'Complaint'}</span>
                      {complaint.department && <span className="text-[var(--text-muted)] font-medium"> · {complaint.department}</span>}
                    </p>
                  )}

                  {log.performedBy?.name && (
                    <p className="paper-font-type text-[10.5px] text-[var(--text-secondary)] mt-0.5">
                      by <span className="font-bold text-[var(--text-primary)]">{log.performedBy.name}</span>
                      {log.performedBy.role && <span className="ml-1 capitalize">({log.performedBy.role})</span>}
                    </p>
                  )}

                  {log.notes && (
                    <p className="paper-font-hand text-[14px] leading-snug text-[var(--text-secondary)] mt-0.5 truncate">“{log.notes}”</p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default RecentActivityLog
