import React, { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { loginWithEmail, loginWithTeacherId, signInWithGoogle } from '../services/authService'
import { useAuthStore } from '../store/authStore'
import ThemeToggle from '../components/shared/ThemeToggle'
import { Button } from '../components/ui/Button'
import {
  GraduationCap, Mail, Lock, Eye, EyeOff,
  AlertTriangle, CheckCircle2, ArrowRight, ShieldCheck,
  Check, Pin, FileText
} from 'lucide-react'
import '../styles/loginPaper.css'

type LoginMode = 'student' | 'teacher'

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
)

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [mode, setMode] = useState<LoginMode>('student')
  const [email, setEmail] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const currentRole = useAuthStore((state) => state.role)
  const authError = useAuthStore((state) => state.authError)
  const setAuthError = useAuthStore((state) => state.setAuthError)

  useEffect(() => {
    if (authError) {
      setError(authError)
      setAuthError(null)
    }
  }, [authError, setAuthError])

  useEffect(() => {
    if (!isAuthenticated || !currentRole) return
    navigate(currentRole === 'admin' ? '/admin' : currentRole === 'teacher' ? '/teacher' : '/student')
  }, [isAuthenticated, currentRole, navigate])

  const handleGoogleClick = async () => {
    setError('')
    try {
      await signInWithGoogle()
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed. Please try again or use email and password.')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'teacher') {
        const payload = teacherId.trim().includes('@')
          ? { email: teacherId.trim(), password }
          : { teacherId: teacherId.trim(), password }
        const res = await loginWithTeacherId(payload)
        if (res && (res.success || res.role)) {
          setSuccess('Authentication successful! Redirecting...')
          navigate('/teacher')
        } else {
          setError('Invalid faculty credentials.')
        }
      } else {
        const res = await loginWithEmail({ email: email.trim(), password })
        if (res && (res.success || res.role)) {
          setSuccess('Authentication successful! Redirecting...')
          const userRole = res.role || res.user?.role
          if (userRole === 'admin') navigate('/admin')
          else if (userRole === 'teacher') navigate('/teacher')
          else navigate('/student')
        } else {
          setError('Invalid email address or password.')
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Server connection error.')
    } finally {
      setSubmitting(false)
    }
  }

  const benefits = [
    { label: 'Submit Complaints Easily', desc: 'Report your problem quickly' },
    { label: 'Track Your Complaint', desc: 'Check updates and progress' },
    { label: 'Get Help from AI', desc: 'Create complaints with AI assistance' },
    { label: 'Safe & Secure', desc: 'Your information is protected' }
  ]

  return (
    <div className="paper-desk min-h-screen text-slate-800 dark:text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 font-sans overflow-x-hidden transition-colors duration-300">
      {/* ── Top Bar ── */}
      <header className="relative z-20 max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="paper-stamp !text-[13px] bg-[#fffdf4]/60 dark:bg-white/5">CR</div>
          <div className="flex flex-col">
            <span className="paper-type text-base font-bold tracking-tight leading-tight">
              CampusResolve
            </span>
            <span className="paper-type text-[10px] tracking-[0.22em] uppercase text-stone-500 dark:text-slate-400">
              Student Support Portal
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/about"
            className="paper-type text-xs font-bold text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            About &amp; Guidelines
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Desk: pinned papers ── */}
      <main className="relative z-10 w-full max-w-5xl mx-auto my-auto py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left: notice + sticky note (hidden on small screens) */}
          <div className="lg:col-span-6 hidden sm:block space-y-6 pt-4">
            <motion.div
              initial={{ opacity: 0, y: 14, rotate: -1.5 }}
              animate={{ opacity: 1, y: 0, rotate: -1.2 }}
              transition={{ duration: 0.35 }}
              className="paper-sheet p-7 pl-14 relative"
            >
              <div className="paper-margin" />
              <div className="absolute -top-2 left-1/2 -translate-x-1/2"><div className="paper-pin" /></div>
              <div className="flex items-center gap-2 mb-3">
                <span className="paper-stamp !text-[10px]">Notice · No. 001</span>
              </div>
              <h1 className="paper-type text-3xl lg:text-[38px] font-bold tracking-tight leading-[1.1] text-slate-900 dark:text-white">
                CampusResolve
              </h1>
              <p className="paper-hand text-[26px] leading-tight text-blue-700 dark:text-sky-300 mt-1">
                Report a Problem. Get It Resolved.
              </p>
              <p className="paper-type text-[13.5px] leading-relaxed text-stone-600 dark:text-slate-300 mt-3">
                CampusResolve helps students report academic, hostel, and campus
                issues in one place. Track your complaint and get updates until
                the issue is resolved.
              </p>
              <div className="paper-type text-[11px] text-stone-400 dark:text-slate-500 mt-4 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Filed under: student-support / general
              </div>
            </motion.div>

            {/* Sticky-note checklist */}
            <motion.div
              initial={{ opacity: 0, y: 14, rotate: 1.5 }}
              animate={{ opacity: 1, y: 0, rotate: 1 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              className="paper-note p-5 pt-7 max-w-sm ml-6"
            >
              <p className="paper-hand text-[22px] font-semibold text-stone-800 dark:text-yellow-100 leading-none mb-3">
                Why file here? —
              </p>
              <ul className="space-y-2">
                {benefits.map((b) => (
                  <li key={b.label} className="flex items-start gap-2.5">
                    <span className="mt-0.5 w-[18px] h-[18px] rounded-[4px] bg-stone-900 dark:bg-yellow-100 text-yellow-200 dark:text-stone-900 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3.5]" />
                    </span>
                    <span className="paper-type text-[12.5px] leading-snug text-stone-800 dark:text-yellow-50">
                      <strong>{b.label}</strong> — {b.desc}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Right: the sign-in sheet */}
          <div className="lg:col-span-6 w-full max-w-[460px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 14, rotate: 0.8 }}
              animate={{ opacity: 1, y: 0, rotate: 0.4 }}
              transition={{ duration: 0.35 }}
              className="paper-sheet paper-stack pl-12 pr-6 sm:pl-16 sm:pr-8 py-8"
            >
              <div className="paper-tape paper-tape-left" />
              <div className="paper-tape paper-tape-right" />
              <div className="paper-margin" />
              <div className="paper-holes">
                <div className="paper-hole" />
                <div className="paper-hole" />
                <div className="paper-hole" />
              </div>

              {/* Sheet header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="paper-type text-[11px] tracking-[0.22em] uppercase text-stone-400 dark:text-slate-500">
                    Form · Sign-in
                  </p>
                  <h2 className="paper-type text-[26px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight mt-1">
                    Sign in to your account
                  </h2>
                  <p className="paper-hand text-[20px] text-stone-500 dark:text-slate-400 leading-tight">
                    pick your role, fill the form below…
                  </p>
                </div>
                <span className="paper-stamp !text-[10px] shrink-0 mt-1 hidden xs:inline sm:inline"><span className="inline-flex items-center gap-1"><Pin className="w-3 h-3" /> portal</span></span>
              </div>

              {/* Role tabs */}
              <div className="grid grid-cols-2 gap-2 mt-5">
                {(['student', 'teacher'] as LoginMode[]).map((m) => {
                  const isCurrent = mode === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMode(m); setError(''); setSuccess('') }}
                      className={`paper-tab flex items-center justify-center gap-2 py-2.5 px-3 cursor-pointer ${isCurrent ? 'active' : ''}`}
                    >
                      {m === 'student' ? <GraduationCap className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>{m === 'student' ? 'Student' : 'Faculty / Staff'}</span>
                    </button>
                  )
                })}
              </div>

              {/* Alerts */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border-2 border-dashed border-rose-400/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2.5"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="paper-type">{error}</span>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border-2 border-dashed border-emerald-500/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="paper-type">{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
                {mode === 'student' ? (
                  <div className="paper-field relative">
                    <label htmlFor="email" className="paper-type block text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">
                      Student Email <span className="text-rose-500">*</span>
                    </label>
                    <Mail className="absolute left-0 bottom-3 w-4 h-4 text-stone-400 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="paper-field relative">
                    <label htmlFor="teacherId" className="paper-type block text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">
                      Faculty ID or Email <span className="text-rose-500">*</span>
                    </label>
                    <ShieldCheck className="absolute left-0 bottom-3 w-4 h-4 text-stone-400 pointer-events-none" />
                    <input
                      id="teacherId"
                      type="text"
                      autoComplete="username"
                      required
                      placeholder="FAC-001 or faculty@university.edu"
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                    />
                  </div>
                )}

                <div className="paper-field relative">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="paper-type block text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="paper-hand text-[18px] leading-none text-blue-700 dark:text-sky-300 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Lock className="absolute left-0 bottom-3 w-4 h-4 text-stone-400 pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 bottom-3 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  isLoading={submitting}
                  iconRight={<ArrowRight className="w-4 h-4" />}
                  className="paper-btn-ink"
                >
                  Sign in as {mode === 'student' ? 'Student' : 'Faculty'}
                </Button>
              </form>

              {/* Divider */}
              <div className="paper-type flex items-center gap-3 my-5">
                <div className="flex-1 border-t-2 border-dashed border-stone-300 dark:border-slate-600" />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-slate-500">
                  or continue with
                </span>
                <div className="flex-1 border-t-2 border-dashed border-stone-300 dark:border-slate-600" />
              </div>

              <button
                type="button"
                onClick={handleGoogleClick}
                className="paper-type w-full h-[48px] rounded-lg bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/5 border-[1.5px] border-dashed border-stone-400 dark:border-slate-500 hover:border-solid hover:border-stone-600 dark:hover:border-slate-300 text-[13.5px] font-bold text-stone-700 dark:text-slate-100 transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>

              <p className="paper-hand text-center text-[19px] text-stone-400 dark:text-slate-500 mt-5">
                signed, sealed &amp; delivered ✎
              </p>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}


export default LoginPage
