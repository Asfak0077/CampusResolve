import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '../components/ds/AppShell'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { fetchDepartmentComplaints, fetchTeacherComplaints, updateComplaintStatus, assignComplaint } from '../services/complaintService'
import { getTeacherFeedback } from '../services/feedbackService'
import { useAuthStore } from '../store/authStore'
import useSocket from '../hooks/useSocket'
import { useToast } from '../components/shared/ToastNotification'
import {
  Shield, CheckCircle2, Search, Inbox, AlertCircle, UserCheck, Zap, Sparkles, Activity, Clock
} from 'lucide-react'
import ComplaintTimeline from '../components/student/ComplaintTimeline'
import RecentActivityLog from '../components/admin/RecentActivityLog'
import { Button } from '../components/ui/Button'
import StatusBadge from '../components/shared/StatusBadge'
import ComplaintIdBadge from '../components/shared/ComplaintIdBadge'
import ComplaintAIIntelligencePanel from '../components/shared/ComplaintAIIntelligencePanel'
import { motion } from 'framer-motion'

const TeacherDashboard = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const teacherId = user?.id || user?.email || ''
  const { showToast } = useToast()

  const [notesByComplaint, setNotesByComplaint] = useState<Record<string, string>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'progress' | 'resolved' | 'pool'>('all')

  const assignedQuery = useQuery({
    queryKey: ['complaints', 'teacher', teacherId],
    queryFn: () => fetchTeacherComplaints(teacherId),
    enabled: !!teacherId
  })

  const poolQuery = useQuery({
    queryKey: ['complaints', 'pool', user?.department, teacherId],
    queryFn: () => fetchDepartmentComplaints(user?.department || '', teacherId),
    enabled: !!user?.department && !!teacherId
  })

  useSocket({ onNewAssignment: () => queryClient.invalidateQueries({ queryKey: ['complaints'] }) })

  const updateMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: 'In Progress' | 'Resolved'; notes?: string }) =>
      updateComplaintStatus(id, status, notes),
    onSuccess: async (_, variables) => {
      showToast('success', `Complaint marked as ${variables.status}`)
      await queryClient.invalidateQueries({ queryKey: ['complaints'] })
    },
    onError: () => showToast('error', 'Failed to update status')
  })

  const selfAssignMutation = useMutation({
    mutationFn: (id: string) => assignComplaint(id, teacherId),
    onSuccess: async () => {
      showToast('success', 'Complaint assigned to you')
      await queryClient.invalidateQueries({ queryKey: ['complaints'] })
      setActiveTab('all')
    },
    onError: () => showToast('error', 'Failed to assign complaint')
  })

  const feedbackQuery = useQuery({
    queryKey: ['teacher-feedback', teacherId],
    queryFn: () => getTeacherFeedback(teacherId),
    enabled: !!teacherId
  })

  const todayFormatted = useMemo(() => new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric'
  }), [])

  if (assignedQuery.isLoading) return <LoadingSpinner />

  const allTeacherData = assignedQuery.data ?? []
  const departmentPool = poolQuery.data ?? []
  const myAssigned = allTeacherData.filter((c) => c.assignedTeacherId === teacherId)

  let displayComplaints = activeTab === 'pool' ? departmentPool : myAssigned
  if (activeTab === 'pending') displayComplaints = myAssigned.filter((item) => item.status === 'Assigned' || item.status === 'Submitted')
  else if (activeTab === 'progress') displayComplaints = myAssigned.filter((item) => item.status === 'In Progress')
  else if (activeTab === 'resolved') displayComplaints = myAssigned.filter((item) => item.status === 'Resolved')

  const filteredComplaints = displayComplaints.filter((item) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      item.studentName?.toLowerCase().includes(term) ||
      item.studentId?.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term) ||
      item.title?.toLowerCase().includes(term)
    )
  })

  const feedbackData = feedbackQuery.data ?? []
  const avgRating = feedbackData.length > 0
    ? (feedbackData.reduce((acc: number, curr: any) => acc + curr.rating, 0) / feedbackData.length).toFixed(1)
    : 'N/A'

  const stats = {
    total: myAssigned.length,
    pending: myAssigned.filter((item) => item.status === 'Assigned' || item.status === 'Submitted').length,
    inProgress: myAssigned.filter((item) => item.status === 'In Progress').length,
    resolved: myAssigned.filter((item) => item.status === 'Resolved').length,
    pool: departmentPool.length,
    avgRating: `${avgRating} ★`
  }

  const tabs = [
    { id: 'all', label: 'My Queue', count: stats.total },
    { id: 'pending', label: 'Pending', count: stats.pending },
    { id: 'progress', label: 'In Progress', count: stats.inProgress },
    { id: 'resolved', label: 'Resolved', count: stats.resolved },
    { id: 'pool', label: 'Dept Pool', count: stats.pool },
  ]

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-[800] text-[var(--text-primary)] tracking-tight">
              Faculty Workspace
            </h1>
            <p className="text-[13.5px] text-[var(--text-secondary)] mt-1 font-medium">
              Review assigned student complaints, provide updates, or claim department pool cases.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--card)] px-3.5 py-2 rounded-[14px] border border-[var(--border)] shadow-[var(--shadow-sm)]">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>{user?.department || 'Faculty'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--active-text)] bg-[var(--active-bg)] px-3 py-2 rounded-[14px] border border-[var(--border-subtle)]">
              <span>{todayFormatted}</span>
            </div>
          </div>
        </div>

        {/* Modern Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-[18px]">
          {[
            { label: 'MY QUEUE', value: stats.total, icon: Inbox, iconBg: 'bg-[var(--primary-subtle)] text-[var(--accent)]' },
            { label: 'PENDING', value: stats.pending, icon: Clock, iconBg: 'bg-amber-500/15 text-amber-500' },
            { label: 'IN PROGRESS', value: stats.inProgress, icon: Zap, iconBg: 'bg-blue-500/15 text-blue-500' },
            { label: 'RESOLVED', value: stats.resolved, icon: CheckCircle2, iconBg: 'bg-[var(--active-bg)] text-[var(--active-text)]' },
            { label: 'RATING', value: stats.avgRating, icon: Sparkles, iconBg: 'bg-purple-500/15 text-purple-500' }
          ].map((card, idx) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                whileHover={{ y: -2 }}
                className="p-5 rounded-[18px] bg-[var(--card)] border border-[var(--border)] shadow-[var(--shadow-md)] flex flex-col justify-between h-[120px] transition-all hover:border-[rgba(148,163,184,0.32)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-[var(--text-muted)] tracking-[0.12em] uppercase">
                    {card.label}
                  </span>
                  <div className={`w-8 h-8 rounded-[11px] flex items-center justify-center ${card.iconBg}`}>
                    <Icon className="w-4 h-4" strokeWidth={1.9} />
                  </div>
                </div>
                <div className="text-2xl font-[800] text-[var(--text-primary)]">
                  {typeof card.value === 'number' ? String(card.value).padStart(2, '0') : card.value}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Filter Tabs + Search Card */}
        <div className="bg-[var(--card)] rounded-[18px] border border-[var(--border)] p-5 shadow-[var(--shadow-md)] space-y-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 no-scrollbar">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[12.5px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-[var(--primary)] text-white shadow-xs'
                        : 'bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#64748B]'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Search Box */}
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search complaints or students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-[46px] pl-10 pr-4 text-[13px] font-semibold bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] text-[#111827] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#2563EB] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Complaint Cards List */}
        <div className="space-y-4">
          {filteredComplaints.length === 0 ? (
            <div className="paper-card rounded-md py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-md bg-transparent border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-[var(--text-muted)] flex items-center justify-center mx-auto mb-3 -rotate-2">
                <Inbox className="w-6 h-6" />
              </div>
              <h4 className="paper-font-type text-[16px] font-bold text-[var(--text-heading)] mb-1">No Complaints in Queue</h4>
              <p className="text-[13px] font-medium text-[var(--text-muted)] max-w-sm mx-auto">
                No complaints match your active filter tab.
              </p>
            </div>
          ) : (
            filteredComplaints.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className="paper-card rounded-md p-5 sm:p-6 space-y-4 transition-all"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-[#ECFCCB] dark:bg-emerald-500/15 text-[#166534] dark:text-emerald-400 border-[1.5px] border-dashed border-emerald-600/50 font-bold text-sm flex items-center justify-center shrink-0 -rotate-2 paper-font-type">
                      {item.studentName?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h4 className="paper-font-type text-[14px] font-bold text-[var(--text-heading)]">{item.studentName || 'Student'}</h4>
                      <p className="text-[11.5px] font-medium text-[var(--text-muted)]">
                        {item.studentId || 'ID N/A'} • {item.department || 'General'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <ComplaintIdBadge complaintId={item.complaintId} id={item.id} size="sm" />
                    <StatusBadge status={item.status} />
                    <span className={`paper-font-type text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-[0.12em] border-[1.5px] border-dashed -rotate-[0.6deg] ${
                      item.priority === 'high'
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-600/50'
                        : item.priority === 'medium'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-600/50'
                        : 'bg-transparent text-[var(--text-muted)] border-[var(--border-strong)]'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                </div>

                {/* Content & Timeline */}
                <div className="p-4 sm:p-5 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="paper-font-type text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{item.category}</span>
                    {item.title && <span className="paper-font-type text-[12px] font-bold text-[var(--text-heading)]">{item.title}</span>}
                  </div>
                  <p className="text-[13.5px] text-[var(--text-body)] leading-relaxed font-medium">
                    {item.description}
                  </p>
                  <div className="pt-2">
                    <ComplaintTimeline status={item.status} createdAt={item.createdAt} updatedAt={item.updatedAt} />
                  </div>

                  {/* AI Root Cause, SLA & Health Intelligence */}
                  <div className="pt-2">
                    <ComplaintAIIntelligencePanel
                      complaintId={item.id}
                      ticketNumber={item.complaintId}
                      defaultExpanded={false}
                    />
                  </div>
                </div>

                {/* Actions & Resolution Remarks */}
                <div className="flex flex-col sm:flex-row items-end gap-3 pt-1">
                  <div className="flex-1 w-full">
                    <textarea
                      id={`notes-${item.id}`}
                      rows={2}
                      placeholder="Enter resolution notes / remarks for student..."
                      value={notesByComplaint[item.id] ?? ''}
                      onChange={(e) => setNotesByComplaint((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-full text-[13px] paper-font-type font-bold resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    {activeTab === 'pool' ? (
                      <Button
                        variant="primary"
                        icon={<UserCheck className="w-4 h-4" />}
                        isLoading={selfAssignMutation.isPending}
                        onClick={() => selfAssignMutation.mutate(item.id)}
                        className="h-[46px] px-5 cursor-pointer"
                      >
                        Claim Complaint
                      </Button>
                    ) : (
                      <>
                        {item.status !== 'Resolved' && (
                          <Button
                            variant="secondary"
                            isLoading={updateMutation.isPending}
                            onClick={() => updateMutation.mutate({ id: item.id, status: 'In Progress', notes: notesByComplaint[item.id] })}
                            className="h-[46px] px-4 cursor-pointer"
                          >
                            In Progress
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          icon={<CheckCircle2 className="w-4 h-4" />}
                          isLoading={updateMutation.isPending}
                          disabled={item.status === 'Resolved'}
                          onClick={() => updateMutation.mutate({ id: item.id, status: 'Resolved', notes: notesByComplaint[item.id] })}
                          className="h-[46px] px-5 disabled:opacity-50 cursor-pointer"
                        >
                          {item.status === 'Resolved' ? 'Resolved ✓' : 'Mark Resolved'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <RecentActivityLog teacherId={teacherId} />
      </div>
    </AppShell>
  )
}

export default TeacherDashboard
