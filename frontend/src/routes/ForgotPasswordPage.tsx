import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { KeyRound, Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { requestPasswordReset } from '../services/authService'
import ThemeToggle from '../components/shared/ThemeToggle'
import '../styles/loginPaper.css'

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [userType, setUserType] = useState<'student' | 'teacher'>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await requestPasswordReset(email, userType)
      setSuccess('Password reset instructions have been sent to your email.')
    } catch (err: any) {
      setError(err.message || 'Unable to process reset request. Please check your email address.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="paper-desk min-h-screen text-[var(--text-primary)] flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <Link to="/login" className="paper-font-type flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Sign in
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[420px] mx-auto my-auto py-8">
        <div
          className="paper-sheet relative p-6 sm:p-8 space-y-6"
        >
          <div className="paper-tape paper-tape-left" />
          <div className="paper-tape paper-tape-right" />
          <div className="text-center space-y-2">
            <div className="paper-font-type w-12 h-12 rounded-md bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] flex items-center justify-center mx-auto mb-3 border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_2px_0_#0f172a] -rotate-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="paper-font-type text-2xl font-bold tracking-tight text-[var(--text-primary)]">Reset Password</h1>
            <p className="paper-font-hand text-[20px] text-[var(--text-muted)]">
              Enter your email to receive a password reset link.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3.5 rounded-md bg-[var(--success-subtle)] border-[1.5px] border-dashed border-[var(--success)]/25 text-[var(--success)] text-sm flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3.5 rounded-md bg-[var(--danger-subtle)] border-[1.5px] border-dashed border-[var(--danger)]/25 text-[var(--danger)] text-sm flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSendResetLink} className="space-y-4" noValidate>
            <div className="flex p-1 bg-transparent rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500">
              <button
                type="button"
                onClick={() => setUserType('student')}
                className={`paper-font-type flex-1 py-1.5 px-3 rounded text-xs font-bold transition-all ${
                  userType === 'student'
                    ? 'bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] shadow-[0_2px_0_#0f172a]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setUserType('teacher')}
                className={`paper-font-type flex-1 py-1.5 px-3 rounded text-xs font-bold transition-all ${
                  userType === 'teacher'
                    ? 'bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] shadow-[0_2px_0_#0f172a]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                Faculty / Admin
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reset-email" className="block text-sm font-medium text-[var(--text-primary)]">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                  id="reset-email"
                  type="email"
                  required
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-md border border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text-primary)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="paper-font-type w-full flex items-center justify-center gap-2 py-3 px-5 rounded-md bg-[#1e293b] dark:bg-[#f1f5f9] hover:bg-[#0f172a] dark:hover:bg-white text-[#fffdf4] dark:text-[#0f172a] text-sm font-bold shadow-[0_3px_0_#0f172a] dark:shadow-[0_3px_0_#64748b] transition-all duration-200 disabled:opacity-60 border border-[#0f172a] dark:border-[#cbd5e1] cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {loading ? 'Sending...' : 'Send Reset Instructions'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
