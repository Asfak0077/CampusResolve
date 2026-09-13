import React, { FormEvent, useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { submitComplaint, predictResolution } from '../../services/complaintService'
import { fetchTeachers } from '../../services/teacherService'
import { useAuthStore } from '../../store/authStore'
import { ComplaintPriority, AIResolutionPrediction } from '../../types/domain'
import {
  Building2, GraduationCap, Bus, Home, MoreHorizontal,
  AlertCircle, CheckCircle2, ArrowRight, Send, ShieldAlert, Check,
  MapPin
} from 'lucide-react'
import FileUpload from '../shared/FileUpload'
import { Button } from '../ui/Button'
import ComplaintIdBadge from '../shared/ComplaintIdBadge'
import AIResolutionPredictionCard from '../shared/AIResolutionPredictionCard'

interface ComplaintFormState {
  title: string
  firstName: string
  lastName: string
  studentId: string
  phone: string
  category: string
  location: string
  department: string
  assignedTeacherId: string
  priority: ComplaintPriority
  description: string
  attachments: Array<{ filename: string; url: string }>
}

interface ComplaintFormProps {
  onSuccess?: () => void
}

const CATEGORIES = [
  { id: 'Infrastructure', icon: Building2, label: 'Infrastructure' },
  { id: 'Academic', icon: GraduationCap, label: 'Academic' },
  { id: 'Transport', icon: Bus, label: 'Transport' },
  { id: 'Hostel', icon: Home, label: 'Hostel' },
  { id: 'Other', icon: MoreHorizontal, label: 'Other Issues' }
]

const DEPARTMENTS = ['General', 'CSE', 'ECE', 'MECH', 'EEE', 'AIDS', 'IT']

const ComplaintForm = ({ onSuccess }: ComplaintFormProps) => {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const [form, setForm] = useState<ComplaintFormState>({
    title: '',
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    studentId: user?.studentId ?? '',
    phone: user?.phone ?? '',
    category: 'Infrastructure',
    location: '',
    department: user?.department && user.department !== 'Administration' && user.department !== 'Faculty' ? user.department : 'General',
    assignedTeacherId: '',
    priority: 'medium',
    description: '',
    attachments: []
  })

  // AI Resolution Prediction State
  const [prediction, setPrediction] = useState<AIResolutionPrediction | null>(null)
  const [isPredicting, setIsPredicting] = useState(false)
  const [predictionError, setPredictionError] = useState<string | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-populate form when user profile is loaded/updated
  React.useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        firstName: prev.firstName || user.name?.split(' ')[0] || '',
        lastName: prev.lastName || user.name?.split(' ').slice(1).join(' ') || '',
        studentId: prev.studentId || user.studentId || '',
        phone: prev.phone || user.phone || '',
        department: (prev.department === 'General' && user.department && user.department !== 'Administration' && user.department !== 'Faculty') ? user.department : prev.department
      }))
    }
  }, [user])

  // Debounced AI Resolution Prediction on content changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const hasContent = form.title.trim().length > 2 || form.description.trim().length > 4

    if (!hasContent) {
      setIsPredicting(false)
      return
    }

    setIsPredicting(true)
    setPredictionError(null)

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const result = await predictResolution({
          title: form.title,
          description: form.description,
          category: form.category,
          location: form.location,
          department: form.department,
          priority: form.priority,
          timeOfSubmission: new Date().toISOString()
        })
        setPrediction(result)
      } catch (err: any) {
        setPredictionError(err?.message || 'Prediction failed')
      } finally {
        setIsPredicting(false)
      }
    }, 400)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [form.title, form.description, form.category, form.location, form.department, form.priority])

  const [validationError, setValidationError] = useState<string | null>(null)

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: fetchTeachers
  })

  const availableTeachers = teachers.filter((t: any) => t.department === form.department)

  const [isSuccess, setIsSuccess] = useState(false)
  const [complaintId, setComplaintId] = useState('')

  const mutation = useMutation({
    mutationFn: submitComplaint,
    onSuccess: (data) => {
      setForm((prev) => ({ ...prev, title: '', location: '', description: '', attachments: [] }))
      setPrediction(null)
      void queryClient.invalidateQueries({ queryKey: ['complaints'] })
      void queryClient.invalidateQueries({ queryKey: ['all-complaints-admin'] })
      void queryClient.invalidateQueries({ queryKey: ['teacher-complaints-profile'] })
      setComplaintId(data?.complaintId || data?.ticketNumber || data?.id || '')
      setIsSuccess(true)
      onSuccess?.()
    }
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setValidationError(null)

    if (!form.title.trim()) {
      setValidationError('Please provide a title for your complaint.')
      return
    }

    if (!form.description.trim()) {
      setValidationError('Please provide a detailed description of the issue.')
      return
    }

    const studentName = `${form.firstName} ${form.lastName}`.trim() || user?.name || 'Student User'
    const studentEmail = user?.email
    if (!studentEmail) {
      alert('Session expired. Please login again.')
      return
    }

    const finalDescription = form.location.trim()
      ? `[Location: ${form.location.trim()}]\n\n${form.description}`
      : form.description

    mutation.mutate({
      title: form.title,
      category: form.category,
      department: form.department,
      assignedTeacherId: form.assignedTeacherId || undefined,
      description: finalDescription,
      priority: form.priority,
      studentName,
      studentEmail,
      studentId: form.studentId || user?.studentId || '',
      phone: form.phone,
      attachments: form.attachments
    })
  }

  return (
    <div className="paper-card rounded-md p-6 sm:p-8 relative overflow-hidden transition-colors duration-200 w-full">
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--active-text)] bg-[var(--active-bg)] rounded-full flex items-center gap-1.5 border border-[var(--border-subtle)]">
                <ShieldAlert className="w-3 h-3" /> Student Support Portal
              </span>
            </div>
            <h2 className="paper-font-type text-[22px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">
              Report a Complaint
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
              Describe your issue clearly and select the category. Our AI engine will forecast resolution time in real time.
            </p>
          </div>
          <div className="shrink-0 self-start sm:self-auto">
            <span className="paper-font-type px-3 py-1.5 text-[11.5px] font-bold rounded-md border-[1.5px] border-dashed border-emerald-600/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 -rotate-[0.6deg]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Target SLA: &lt; 24h
            </span>
          </div>
        </div>

        {/* Student Information Inset */}
        <div className="p-5 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] flex items-center gap-1.5">
              Student Information
            </span>
            <span className="px-2 py-0.5 text-[9.5px] font-bold rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 uppercase tracking-wider">
              Verified
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[13px]">
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-0.5">Name</span>
              <p className="font-semibold text-[var(--text-primary)] truncate">{user?.name || 'Student User'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-0.5">Student ID</span>
              <p className="font-bold font-mono text-[var(--text-primary)] truncate">{user?.studentId || 'N/A'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-0.5">Department</span>
              <p className="font-semibold text-[var(--text-primary)] truncate">{user?.department || 'General'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-0.5">Contact Phone</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Enter phone..."
                className="w-full h-[36px] px-1 bg-transparent border-0 border-b-2 border-b-[#d8cfae] rounded-none paper-font-type font-bold text-xs text-[var(--text-primary)] focus:outline-none focus:border-b-[var(--primary)] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Title Input */}
        <div className="space-y-2">
          <label htmlFor="complaint-title" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Complaint Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="complaint-title"
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Projector malfunctioning in Room 304"
            className="w-full h-[48px] px-1 bg-transparent border-0 border-b-2 border-b-[#d8cfae] rounded-none paper-font-type font-bold text-[var(--text-heading)] placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-b-[var(--primary)] transition-colors"
          />
        </div>

        {/* Location / Room / Area Input */}
        <div className="space-y-2">
          <label htmlFor="complaint-location" className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-500" /> Location / Room / Area (Optional)
            </span>
            <span className="text-[10px] font-medium text-[var(--text-muted)]">Helps AI predict exact technician routing</span>
          </label>
          <input
            id="complaint-location"
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g. Tech Block B, Room 304 / Hostel Block C / Physics Lab"
            className="w-full h-[48px] px-1 bg-transparent border-0 border-b-2 border-b-[#d8cfae] rounded-none paper-font-type font-bold text-[var(--text-heading)] placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-b-[var(--primary)] transition-colors"
          />
        </div>

        {/* Category Tiles */}
        <div className="space-y-2.5">
          <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Category <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isActive = form.category === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.id })}
                  className={`relative flex flex-col items-center justify-center gap-2 p-3 h-[96px] rounded-md text-center transition-all duration-200 cursor-pointer box-border border-[1.5px] border-dashed ${
                    isActive
                      ? 'bg-[#f5eedd] dark:bg-white/5 border-[#cbbf9a] dark:border-slate-500 text-[var(--text-primary)] font-bold shadow-[0_2px_0_rgba(60,50,30,0.25)] -rotate-1'
                      : 'bg-[#fffdf4] dark:bg-[#1c2333] border-[#cbbf9a] dark:border-slate-500 text-[var(--text-secondary)] hover:bg-[#f5eedd] dark:hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-[10px] font-bold">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <div className={`w-9 h-9 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 flex items-center justify-center shrink-0 transition-colors -rotate-2 ${isActive ? 'bg-[#f5eedd] dark:bg-white/5 text-[var(--text-primary)]' : 'bg-transparent text-[var(--text-muted)]'}`}>
                    <Icon className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <span className="text-[12px] tracking-tight">{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Department / Faculty / Priority Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Target Department */}
          <div className="space-y-2">
            <label htmlFor="department-select" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Target Department
            </label>
            <select
              id="department-select"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value, assignedTeacherId: '' })}
              className="w-full h-[52px] px-3.5 rounded-md bg-[#fffdf4] dark:bg-[#1c2333] border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 paper-font-type font-bold text-[var(--text-heading)] focus:outline-none focus:border-solid focus:border-[var(--primary)] transition-colors cursor-pointer"
            >
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Assign Faculty */}
          <div className="space-y-2">
            <label htmlFor="teacher-select" className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Assign Faculty
            </label>
            <select
              id="teacher-select"
              value={form.assignedTeacherId}
              onChange={(e) => setForm({ ...form, assignedTeacherId: e.target.value })}
              className="w-full h-[52px] px-3.5 rounded-md bg-[#fffdf4] dark:bg-[#1c2333] border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 paper-font-type font-bold text-[var(--text-heading)] focus:outline-none focus:border-solid focus:border-[var(--primary)] transition-colors cursor-pointer"
            >
              <option value="">Auto-Assign (Department Head)</option>
              {availableTeachers?.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2 h-[52px]">
              {(['low', 'medium', 'high'] as const).map((p) => {
                const isActive = form.priority === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className={`paper-font-type h-[52px] flex items-center justify-center rounded-md text-[11.5px] font-bold uppercase tracking-wider transition-all cursor-pointer border-[1.5px] border-dashed ${
                      isActive
                        ? p === 'high'
                          ? 'bg-rose-500/15 text-rose-500 font-extrabold border border-rose-500/30'
                          : p === 'medium'
                          ? 'bg-amber-500/15 text-amber-500 font-extrabold border border-amber-500/30'
                          : 'bg-blue-500/15 text-blue-500 font-extrabold border border-blue-500/30'
                        : 'bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Detailed Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="description-input" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Detailed Description <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] font-semibold text-[var(--text-muted)]">
              {form.description.length} / 1000
            </span>
          </div>
          <textarea
            id="description-input"
            required
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 1000) })}
            placeholder="Provide relevant context, exact location, timing, and any pertinent details..."
            className="w-full min-h-[130px] bg-[#fffdf4] dark:bg-[#1c2333] border border-[#e5dcc3] dark:border-white/10 rounded-md p-3.5 paper-font-type font-bold leading-[28px] bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_27px,rgba(37,99,235,0.10)_27px,rgba(37,99,235,0.10)_28px)] placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
          />
        </div>

        {/* Upload Evidence Inset */}
        <div className="p-4 sm:p-5 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Upload Evidence (Optional)
            </span>
            <span className="text-[11px] font-medium text-[var(--text-muted)]">Max 5MB (Images/PDF)</span>
          </div>
          <FileUpload
            onUploadComplete={(files) => setForm((prev) => ({ ...prev, attachments: files }))}
            maxFiles={5}
          />
        </div>

        {/* ── AI Resolution Prediction Live Preview Card ── */}
        <AnimatePresence>
          {(prediction || isPredicting || form.title.trim().length > 2 || form.description.trim().length > 4) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="pt-1"
            >
              <AIResolutionPredictionCard
                prediction={prediction}
                isLoading={isPredicting}
                error={predictionError}
                onApplyPriority={(p) => setForm((prev) => ({ ...prev, priority: p }))}
                onApplyDepartment={(dept) => {
                  const matched = DEPARTMENTS.find((d) => dept.toUpperCase().includes(d)) || dept
                  if (DEPARTMENTS.includes(matched)) {
                    setForm((prev) => ({ ...prev, department: matched, assignedTeacherId: '' }))
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Validation Error Notice */}
        {(validationError || mutation.isError) && (
          <div className="p-4 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError || (mutation.error instanceof Error ? mutation.error.message : 'Submission error occurred.')}</span>
          </div>
        )}

        {/* Submit Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t-2 border-dashed border-[#e5dcc3] dark:border-white/10">
          <p className="text-[12.5px] font-medium text-[var(--text-muted)] text-center sm:text-left">
            Your complaint will be directly routed to responsible campus faculty.
          </p>
          <Button
            type="submit"
            variant="primary"
            isLoading={mutation.isPending}
            icon={!mutation.isPending && <Send className="w-4 h-4" />}
            className="w-full sm:w-auto px-8 h-[50px] text-[14px]"
          >
            Submit Complaint
          </Button>
        </div>
      </form>

      {/* Success Overlay Modal */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 paper-card text-center rounded-md"
          >
            <div className="w-16 h-16 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-5 -rotate-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="paper-font-type text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
              Grievance Submitted!
            </h3>
            <p className="text-[14px] font-medium text-[var(--text-secondary)] max-w-sm mb-4">
              Your grievance has been logged successfully and sent to department coordinators.
            </p>
            <div className="flex items-center justify-center gap-2 mb-8">
              <ComplaintIdBadge id={complaintId} showLabel size="lg" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/student/history">
                <Button
                  variant="primary"
                  icon={<ArrowRight className="w-4 h-4" />}
                  className="h-[46px] px-6"
                >
                  Track Status
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setIsSuccess(false)}
                className="h-[46px] px-6"
              >
                File Another Ticket
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ComplaintForm

