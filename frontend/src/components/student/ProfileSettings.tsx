import { FormEvent, useEffect, useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  changeCurrentUserPassword,
  updateUserProfile,
  uploadProfilePhoto
} from '../../services/authService'
import { fetchStudentComplaints, fetchTeacherComplaints } from '../../services/complaintService'
import { getStudentFeedback } from '../../services/feedbackService'
import { generateBio } from '../../services/chatbotService'
import { getAvatarUrl, getInitials } from '../../utils/avatarUtils'
import ProfileQrModal from '../profile/ProfileQrModal'
import { Button } from '../ui/Button'
import {
  User, Shield, Mail, Phone, Building, Hash,
  CheckCircle2, AlertCircle, Save, Award, Sparkles,
  MessageSquare, History, Star, ChevronRight,
  Clock, Lock, QrCode, Camera, Edit3, X, Eye, EyeOff,
  GraduationCap, Calendar, Check, KeyRound, ExternalLink,
  ShieldCheck, FileText, ArrowUpRight, CheckCircle, ShieldAlert
} from 'lucide-react'

const ProfileSettings = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const updateUser = useAuthStore((s) => s.updateUser)
  const { isDarkMode } = useThemeStore()

  // Profile fields state
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [department, setDepartment] = useState(user?.department ?? '')
  const [semesterYear, setSemesterYear] = useState(user?.semesterYear ?? '')
  const [designation, setDesignation] = useState(user?.designation ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [studentIdVal, setStudentIdVal] = useState(user?.studentId ?? '')

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isChangingPass, setIsChangingPass] = useState(false)

  // Feedback and loading state
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isGeneratingBio, setIsGeneratingBio] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const studentId = user?.studentId || user?.email || ''
  const teacherId = user?.teacherId || user?.id || ''

  // Sync state when user prop updates
  useEffect(() => {
    if (user && !isEditModalOpen) {
      setName(user.name ?? '')
      setPhone(user.phone ?? '')
      setDepartment(user.department ?? '')
      setSemesterYear(user.semesterYear ?? '')
      setDesignation(user.designation ?? '')
      setBio(user.bio ?? '')
      setStudentIdVal(user.studentId ?? '')
    }
  }, [user, isEditModalOpen])

  // Queries for real profile metrics
  const complaintsQ = useQuery({
    queryKey: ['complaints', 'student', studentId],
    queryFn: () => fetchStudentComplaints(studentId),
    enabled: !!studentId && role === 'student',
  })

  const feedbackQ = useQuery({
    queryKey: ['student-feedback', studentId],
    queryFn: () => getStudentFeedback(studentId),
    enabled: !!studentId && role === 'student',
  })

  const teacherComplaintsQ = useQuery({
    queryKey: ['teacher-complaints-profile', teacherId],
    queryFn: () => fetchTeacherComplaints(teacherId),
    enabled: !!teacherId && role === 'teacher',
  })

  const complaints = (role === 'teacher' ? teacherComplaintsQ.data : complaintsQ.data) ?? []
  const feedbacks = feedbackQ.data ?? []

  // Calculate Profile Completion percentage
  const profileCompletion = useMemo(() => {
    let score = 0
    if (user?.name && user.name.trim().length > 0) score += 20
    if (user?.email && user.email.trim().length > 0) score += 20
    if (user?.studentId || user?.teacherId || user?.id) score += 20
    if (user?.department && user.department.trim().length > 0) score += 15
    if (user?.phone && user.phone.trim().length > 0) score += 15
    if (user?.profilePicture || user?.profileImage || (user?.bio && user.bio.trim().length > 0)) score += 10
    return Math.min(score, 100)
  }, [user])

  // Save profile updates
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    setStatusMessage(null)

    try {
      const res = await updateUserProfile({
        name,
        phone,
        department,
        studentId: studentIdVal,
        semesterYear,
        designation,
        bio
      })

      if (res?.success) {
        setStatusMessage({ type: 'success', text: 'Profile updated successfully!' })
        setIsEditModalOpen(false)
        void queryClient.invalidateQueries({ queryKey: ['profile'] })
        void queryClient.invalidateQueries({ queryKey: ['user'] })
        setTimeout(() => setStatusMessage(null), 3500)
      } else {
        throw new Error(res?.message || 'Failed to update profile.')
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.response?.data?.message || err?.message || 'Failed to save changes.' })
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Handle password update
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setIsChangingPass(true)
    try {
      await changeCurrentUserPassword({
        currentPassword,
        newPassword,
        userType: role,
        userId: user?.id
      })

      setPasswordSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setIsPasswordModalOpen(false)
        setPasswordSuccess('')
      }, 1500)
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message || err?.message || 'Failed to change password. Check current password.')
    } finally {
      setIsChangingPass(false)
    }
  }

  // Handle Avatar Image Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Image size must be under 5MB.' })
      return
    }

    setIsUploadingAvatar(true)
    setStatusMessage(null)

    try {
      const res = await uploadProfilePhoto(file)
      if (res?.success && res?.profileImage) {
        updateUser({
          ...user,
          profilePicture: res.profileImage,
          profileImage: res.profileImage
        })
        setStatusMessage({ type: 'success', text: 'Avatar photo updated successfully!' })
        void queryClient.invalidateQueries({ queryKey: ['profile'] })
        void queryClient.invalidateQueries({ queryKey: ['user'] })
        setTimeout(() => setStatusMessage(null), 3500)
      } else {
        throw new Error(res?.message || 'Upload failed')
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to upload image.' })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // AI Bio generator
  const handleAiBio = async () => {
    setIsGeneratingBio(true)
    try {
      const generated = await generateBio(name || user?.name || 'Student', role ?? 'student', department || user?.department || 'General')
      setBio(generated)
    } catch {
      setBio(`${name || user?.name} is an active ${role} in the ${department || user?.department || 'CSE'} department at CampusResolve.`)
    } finally {
      setIsGeneratingBio(false)
    }
  }

  const avatarSrc = user?.profilePicture || user?.profileImage
  const resolvedAvatarUrl = getAvatarUrl(avatarSrc)
  const [avatarImgError, setAvatarImgError] = useState(false)
  const userInitials = getInitials(user?.name || user?.email || 'CR')
  const formattedJoinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : 'Aug 2026'

  // Reset avatar image error if user profile updates
  useEffect(() => {
    setAvatarImgError(false)
  }, [avatarSrc])

  const roleLabel = role === 'teacher' ? 'Faculty Member' : role === 'admin' ? 'Administrator' : 'Student Member'

  return (
    <div className="space-y-6 transition-colors duration-200 pb-8">
      {/* ── 1. Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="paper-font-type text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)] mb-1">
            Account / My details
          </p>
          <h1 className="text-2xl sm:text-3xl paper-font-type font-bold text-[var(--text-heading)] tracking-tight">
            My Profile
          </h1>
          <p className="text-[13.5px] text-[var(--text-secondary)] mt-1 font-medium">
            Your photo, name, contact details and password — all in one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="md"
            icon={<Edit3 className="w-4 h-4" />}
            onClick={() => setIsEditModalOpen(true)}
            className="shadow-sm"
          >
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Global Status Toast / Notification */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-md border-[1.5px] border-dashed p-3.5 flex items-center justify-between gap-3 paper-font-type text-xs font-bold ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-600/50 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-600/50 text-rose-700 dark:text-rose-400'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="p-1 rounded-md hover:bg-black/[0.05] dark:hover:bg-white/10 border border-transparent hover:border-dashed hover:border-current cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. Profile Hero Card ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="paper-card p-6 sm:p-8 rounded-md relative overflow-hidden"
      >
        {/* Kraft corner band */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[repeating-linear-gradient(90deg,#d8cfae_0px,#d8cfae_12px,transparent_12px,transparent_20px)] opacity-70" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
            
            {/* Squircle Avatar with Ring & Interactive Edit Hover */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-md overflow-hidden border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#111827] dark:from-[#334155] dark:via-[#1E293B] dark:to-[#0F172A] shadow-md flex items-center justify-center relative -rotate-2">
                {resolvedAvatarUrl && !avatarImgError ? (
                  <img
                    src={resolvedAvatarUrl}
                    alt={user?.name || 'User Avatar'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={() => setAvatarImgError(true)}
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl font-[900] text-white tracking-wider select-none">
                    {userInitials}
                  </span>
                )}

                {/* Upload Overlay on Hover */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 bg-black/55 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 cursor-pointer"
                  title="Change your photo"
                >
                  {isUploadingAvatar ? (
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                    </>
                  )}
                </button>
              </div>

              {/* Online Status Dot */}
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[var(--paper)] flex items-center justify-center text-white shadow-sm"
                title="Active account"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* Profile Info Details */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="paper-font-type px-2.5 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-[0.12em] bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] border border-[#0f172a] dark:border-[#cbd5e1] -rotate-1">
                  {roleLabel}
                </span>

                <span className="paper-font-type inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-[0.12em] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-[1.5px] border-dashed border-emerald-600/50 -rotate-[0.6deg]">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl paper-font-type font-bold text-[var(--text-heading)] tracking-tight truncate leading-tight">
                {user?.name || 'Campus Student'}
              </h2>

              <p className="text-[13px] text-[var(--text-secondary)] font-semibold flex items-center gap-2 flex-wrap">
                <span className="paper-font-type text-[var(--text-heading)] font-bold">
                  {user?.studentId || user?.teacherId || user?.id?.slice(0, 8).toUpperCase() || '23VEC371'}
                </span>
                <span className="text-[var(--text-muted)]">•</span>
                <span>{user?.department || 'Computer Science & Engineering'}</span>
              </p>

              {user?.bio ? (
                <p className="paper-font-hand text-[19px] leading-snug text-[var(--text-secondary)] max-w-xl line-clamp-2 pt-0.5">
                  “{user.bio}”
                </p>
              ) : null}
            </div>
          </div>

          {/* Action Hub (ID card, password, joined date) */}
          <div className="flex sm:flex-col items-stretch sm:items-end justify-between gap-2.5 shrink-0 pt-3 lg:pt-0 border-t-2 border-dashed border-[#e5dcc3] dark:border-white/10 lg:border-t-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                title="Show your scannable ID card"
                className="paper-font-type flex items-center gap-2 px-3.5 h-10 rounded-md bg-[#fffdf4] dark:bg-[#1c2333] hover:bg-[#f5eedd] dark:hover:bg-white/5 border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer shadow-[0_2px_0_rgba(60,50,30,0.25)]"
              >
                <QrCode className="w-4 h-4 text-[var(--accent)]" />
                <span>My ID Card</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                title="Change your password"
                className="paper-font-type flex items-center gap-2 px-3.5 h-10 rounded-md bg-[#fffdf4] dark:bg-[#1c2333] hover:bg-[#f5eedd] dark:hover:bg-white/5 border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer shadow-[0_2px_0_rgba(60,50,30,0.25)]"
              >
                <KeyRound className="w-4 h-4 text-[var(--text-muted)]" />
                <span>Password</span>
              </button>
            </div>

            <span className="paper-font-type text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] self-center sm:self-end">
              Joined {formattedJoinDate}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── 3. Quick Facts Bar (4 Cards) ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Profile completeness */}
        <div className="paper-card rounded-md p-4 flex flex-col justify-between h-[112px]">
          <div className="flex items-center justify-between gap-2">
            <span className="paper-font-type text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-[0.14em] truncate">
              Profile Filled
            </span>
            <span className="paper-font-type text-[10px] font-bold px-2 py-0.5 rounded-md border-[1.5px] border-dashed border-emerald-600/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0 -rotate-[0.6deg]">
              {profileCompletion}%
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="h-2 w-full bg-black/[0.07] dark:bg-white/10 rounded-full overflow-hidden border border-[#e5dcc3] dark:border-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${profileCompletion}%` }}
                transition={{ duration: 0.6 }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              {profileCompletion >= 100
                ? 'All done — nice!'
                : profileCompletion >= 60
                  ? 'Almost there — tap Edit to finish'
                  : 'Tap Edit to add missing details'}
            </span>
          </div>
        </div>

        {/* Card 2: My complaints */}
        <Link
          to="/student/history"
          className="paper-card rounded-md p-4 hover:-translate-y-px hover:shadow-[0_10px_28px_rgba(60,50,30,0.22)] transition-all flex flex-col justify-between h-[112px] group cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="paper-font-type text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-[0.14em] truncate">
              My Complaints
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-heading)] transition-colors shrink-0" />
          </div>
          <div>
            <div className="text-2xl paper-font-type font-bold text-[var(--text-heading)] tracking-tight tabular-nums">
              {String(complaints.length).padStart(2, '0')}
            </div>
            <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">Tap to see all your complaints →</span>
          </div>
        </Link>

        {/* Card 3: Account safety */}
        <div className="paper-card rounded-md p-4 flex flex-col justify-between h-[112px]">
          <div className="flex items-center justify-between gap-2">
            <span className="paper-font-type text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-[0.14em] truncate">
              Account Safety
            </span>
            <span className="p-1 rounded-md border-[1.5px] border-dashed border-emerald-600/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0 -rotate-2">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="text-[15px] paper-font-type font-bold text-[var(--text-heading)] tracking-tight">
              Password Protected
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Your login is secure</span>
          </div>
        </div>

        {/* Card 4: My ratings */}
        <Link
          to="/student/feedback"
          className="paper-card rounded-md p-4 hover:-translate-y-px hover:shadow-[0_10px_28px_rgba(60,50,30,0.22)] transition-all flex flex-col justify-between h-[112px] group cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="paper-font-type text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-[0.14em] truncate">
              My Ratings
            </span>
            <Star className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div>
            <div className="text-[15px] paper-font-type font-bold text-[var(--text-heading)] tracking-tight">
              {feedbacks.length > 0 ? `${feedbacks.length} Given` : 'Rate Resolved Cases'}
            </div>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Tap to rate solved complaints →</span>
          </div>
        </Link>
      </div>

      {/* ── 4. Details Grid (2 Cards) ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* Card 1: About you */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
          className="paper-card rounded-md p-6 space-y-4"
        >
          <div className="flex items-center justify-between pb-3.5 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center -rotate-2">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15.5px] paper-font-type font-bold text-[var(--text-heading)] tracking-tight">
                  About You
                </h3>
                <p className="text-[11.5px] text-[var(--text-muted)] font-medium">Your name, ID and class details</p>
              </div>
            </div>

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/10 border border-transparent hover:border-dashed hover:border-[#cbbf9a] transition-colors cursor-pointer"
              title="Edit your details"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)]">
              <span className="paper-font-type text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block mb-0.5">
                Your Name
              </span>
              <p className="text-[13.5px] font-bold text-[var(--text-heading)] truncate">
                {user?.name || 'Asfak Rahman'}
              </p>
            </div>

            <div className="p-3 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)]">
              <span className="paper-font-type text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block mb-0.5">
                {role === 'teacher' ? 'Faculty ID' : 'Roll Number'}
              </span>
              <p className="paper-font-type text-[13.5px] font-bold text-[var(--text-heading)] truncate">
                {user?.studentId || user?.teacherId || user?.id?.slice(0, 10).toUpperCase() || '23VEC371'}
              </p>
            </div>

            <div className="p-3 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)]">
              <span className="paper-font-type text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block mb-0.5">
                Department
              </span>
              <p className="text-[13.5px] font-bold text-[var(--text-heading)] truncate">
                {user?.department || 'Computer Science & Engineering'}
              </p>
            </div>

            <div className="p-3 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)]">
              <span className="paper-font-type text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block mb-0.5">
                {role === 'teacher' ? 'Job Title' : 'Year / Semester'}
              </span>
              <p className="text-[13.5px] font-bold text-[var(--text-heading)] truncate">
                {role === 'teacher' ? (user?.designation || 'Professor') : (user?.semesterYear || 'Semester 7 / Final Year')}
              </p>
            </div>

            <div className="sm:col-span-2 p-3 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)]">
              <span className="paper-font-type text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block mb-0.5">
                About Me
              </span>
              <p className="text-[12.5px] font-medium text-[var(--text-secondary)] leading-relaxed">
                {user?.bio || 'No bio yet. Tap Edit above to write one — or let AI write it for you.'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Contact & password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="paper-card rounded-md p-6 space-y-4"
        >
          <div className="flex items-center justify-between pb-3.5 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center -rotate-2">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15.5px] paper-font-type font-bold text-[var(--text-heading)] tracking-tight">
                  Contact & Password
                </h3>
                <p className="text-[11.5px] text-[var(--text-muted)] font-medium">How we reach you, and keeping login safe</p>
              </div>
            </div>

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/10 border border-transparent hover:border-dashed hover:border-[#cbbf9a] transition-colors cursor-pointer"
              title="Edit contact details"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Email */}
            <div className="p-3 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-md bg-blue-500/10 border-[1.5px] border-dashed border-blue-600/40 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0 -rotate-2">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="paper-font-type text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block">Email</span>
                  <span className="text-[13px] font-bold text-[var(--text-heading)] truncate block">{user?.email || 'student@campusresolve.edu'}</span>
                </div>
              </div>
              <span className="paper-font-type text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border-[1.5px] border-dashed border-emerald-600/50 shrink-0 -rotate-[0.6deg]">OK</span>
            </div>

            {/* Phone */}
            <div className="p-3 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-md bg-emerald-500/10 border-[1.5px] border-dashed border-emerald-600/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 -rotate-2">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="paper-font-type text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block">Phone</span>
                  <span className="text-[13px] font-bold text-[var(--text-heading)] truncate block">{user?.phone || 'Not added yet'}</span>
                </div>
              </div>
              <span className="paper-font-type text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border-[1.5px] border-dashed border-emerald-600/50 shrink-0 -rotate-[0.6deg]">OK</span>
            </div>

            {/* Password Row */}
            <div className="p-3 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-md bg-amber-500/10 border-[1.5px] border-dashed border-amber-600/40 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 -rotate-2">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="paper-font-type text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] block">Password</span>
                  <span className="text-[13px] font-bold text-[var(--text-heading)]">Hidden for safety ••••</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="paper-font-type text-[11px] font-bold px-2.5 py-1.5 rounded-md bg-transparent hover:bg-black/[0.04] dark:hover:bg-white/5 border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-[var(--text-heading)] transition-all cursor-pointer shrink-0"
              >
                Change
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── 5. Shortcuts ─────────────────────────────────────────── */}
      <div className="space-y-3 pt-2">
        <h3 className="paper-font-type text-[14px] font-bold text-[var(--text-heading)] tracking-tight">
          Go To <span className="text-[var(--text-muted)] font-sans font-medium text-[12px]">— jump straight to what you need</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/student/history" className="group">
            <div className="paper-card rounded-md p-4 hover:-translate-y-px hover:shadow-[0_10px_28px_rgba(60,50,30,0.22)] transition-all flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 -rotate-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[13px] paper-font-type font-bold text-[var(--text-heading)]">My Complaints</h4>
                  <p className="text-[11px] text-[var(--text-muted)] font-medium">See all your complaints</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-heading)] group-hover:translate-x-px group-hover:-translate-y-px transition-all" />
            </div>
          </Link>

          <Link to="/student" className="group">
            <div className="paper-card rounded-md p-4 hover:-translate-y-px hover:shadow-[0_10px_28px_rgba(60,50,30,0.22)] transition-all flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 -rotate-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[13px] paper-font-type font-bold text-[var(--text-heading)]">New Complaint</h4>
                  <p className="text-[11px] text-[var(--text-muted)] font-medium">Report a new problem</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-heading)] group-hover:translate-x-px group-hover:-translate-y-px transition-all" />
            </div>
          </Link>

          <Link to="/student/feedback" className="group">
            <div className="paper-card rounded-md p-4 hover:-translate-y-px hover:shadow-[0_10px_28px_rgba(60,50,30,0.22)] transition-all flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 -rotate-2 bg-violet-500/10 text-violet-700 dark:text-violet-400 flex items-center justify-center">
                  <Star className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[13px] paper-font-type font-bold text-[var(--text-heading)]">Rate Solved Cases</h4>
                  <p className="text-[11px] text-[var(--text-muted)] font-medium">Tell us how we did</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-heading)] group-hover:translate-x-px group-hover:-translate-y-px transition-all" />
            </div>
          </Link>

          <button
            onClick={() => setShowQrModal(true)}
            className="paper-card rounded-md p-4 hover:-translate-y-px hover:shadow-[0_10px_28px_rgba(60,50,30,0.22)] transition-all flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 -rotate-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[13px] paper-font-type font-bold text-[var(--text-heading)]">My ID Card</h4>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">Your scannable QR code</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-heading)] group-hover:translate-x-px group-hover:-translate-y-px transition-all" />
          </button>
        </div>
      </div>

      {/* ── 6. EDIT DETAILS MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="fixed inset-0 bg-black/50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="paper-card w-full max-w-lg rounded-md p-6 sm:p-7 relative z-10 space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between pb-4 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10">
                <div>
                  <h3 className="text-xl paper-font-type font-bold text-[var(--text-heading)] tracking-tight">Edit My Details</h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium">Change your name, phone, class and bio</p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 rounded-md hover:bg-black/[0.05] dark:hover:bg-white/10 border border-transparent hover:border-dashed hover:border-[#cbbf9a] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-[48px] px-1 bg-transparent border-0 border-b-2 border-b-[#d8cfae] rounded-none paper-font-type font-bold text-[var(--text-heading)] placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-b-[var(--primary)] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full h-[48px] px-1 bg-transparent border-0 border-b-2 border-b-[#d8cfae] rounded-none paper-font-type font-bold text-[var(--text-heading)] placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-b-[var(--primary)] transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full h-[48px] px-3.5 rounded-md bg-[#fffdf4] dark:bg-[#1c2333] border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 paper-font-type font-bold text-[var(--text-heading)] focus:outline-none focus:border-solid focus:border-[var(--primary)] transition-colors cursor-pointer"
                    >
                      {['CSE', 'ECE', 'MECH', 'EEE', 'AIDS', 'IT', 'General'].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {role === 'teacher' ? (
                  <div className="space-y-1.5">
                    <label className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Associate Professor"
                      className="w-full h-[48px] px-1 bg-transparent border-0 border-b-2 border-b-[#d8cfae] rounded-none paper-font-type font-bold text-[var(--text-heading)] placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-b-[var(--primary)] transition-colors"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      Semester / Year
                    </label>
                    <input
                      type="text"
                      value={semesterYear}
                      onChange={(e) => setSemesterYear(e.target.value)}
                      placeholder="e.g. 3rd Year / 6th Sem"
                      className="w-full h-[48px] px-1 bg-transparent border-0 border-b-2 border-b-[#d8cfae] rounded-none paper-font-type font-bold text-[var(--text-heading)] placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-b-[var(--primary)] transition-colors"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      Bio / Statement
                    </label>
                    <button
                      type="button"
                      onClick={handleAiBio}
                      disabled={isGeneratingBio}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      {isGeneratingBio ? 'Generating...' : 'Generate with AI'}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us a little about your role and interests on campus..."
                    className="w-full min-h-[110px] bg-[#fffdf4] dark:bg-[#1c2333] border border-[#e5dcc3] dark:border-white/10 rounded-md p-3.5 paper-font-type font-bold leading-[28px] bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_27px,rgba(37,99,235,0.10)_27px,rgba(37,99,235,0.10)_28px)] placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t-2 border-dashed border-[#e5dcc3] dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="paper-font-type px-4 py-2.5 rounded-md text-xs font-bold text-[var(--text-secondary)] hover:bg-[#f5eedd] dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isSavingProfile}
                    icon={<Save className="w-3.5 h-3.5" />}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 7. CHANGE PASSWORD MODAL ─────────────────────────────── */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPasswordModalOpen(false)}
              className="fixed inset-0 bg-black/50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="paper-card w-full max-w-md rounded-md p-6 sm:p-7 relative z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10">
                <div>
                  <h3 className="text-xl paper-font-type font-bold text-[var(--text-heading)] tracking-tight">Change Password</h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium">Pick a new password (8+ characters)</p>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="p-2 rounded-md hover:bg-black/[0.05] dark:hover:bg-white/10 border border-transparent hover:border-dashed hover:border-[#cbbf9a] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {passwordError && (
                <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full h-[48px] pl-1 pr-11 bg-transparent border-0 border-b-2 border-b-[#d8cfae] rounded-none paper-font-type font-bold text-[var(--text-heading)] placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-b-[var(--primary)] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full h-[48px] pl-1 pr-11 bg-transparent border-0 border-b-2 border-b-[#d8cfae] rounded-none paper-font-type font-bold text-[var(--text-heading)] placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-b-[var(--primary)] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full h-[48px] px-1 bg-transparent border-0 border-b-2 border-b-[#d8cfae] rounded-none paper-font-type font-bold text-[var(--text-heading)] placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-b-[var(--primary)] transition-colors"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t-2 border-dashed border-[#e5dcc3] dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="paper-font-type px-4 py-2.5 rounded-md text-xs font-bold text-[var(--text-secondary)] hover:bg-[#f5eedd] dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isChangingPass}
                    icon={<Lock className="w-3.5 h-3.5" />}
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 8. DIGITAL ID QR MODAL ─────────────────────────────────── */}
      <ProfileQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        user={{
          name: user?.name || 'Student',
          studentId: user?.studentId || user?.teacherId || '23VEC371',
          department: user?.department || 'CSE',
          role: role || 'student',
          profilePicture: user?.profilePicture || user?.profileImage
        }}
      />
    </div>
  )
}

export default ProfileSettings
