import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, Download, Share2, Copy, Check, X, ShieldCheck, Sparkles } from 'lucide-react'
import { useToast } from '../shared/ToastNotification'
import { UserAvatar } from '../ui/Avatar'

interface ProfileQrModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id?: string
    name?: string
    role?: string
    department?: string
    studentId?: string
    teacherId?: string
    profilePicture?: string
    profileImage?: string
  }
}

export const ProfileQrModal: React.FC<ProfileQrModalProps> = ({ isOpen, onClose, user }) => {
  const [copied, setCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const { showToast } = useToast()

  if (!isOpen) return null

  // Determine user unique identifier for URL
  const targetId = user.id || user.studentId || user.teacherId || 'me'
  const profileUrl = `${window.location.origin}/profile/${encodeURIComponent(targetId)}`

  // High resolution QR code API URL encoding the profile page URL (NO mailto)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(profileUrl)}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      showToast('success', 'Profile link copied to clipboard!')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      showToast('error', 'Failed to copy link')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user.name || 'CampusResolve User'}'s Profile`,
          text: `View verified CampusResolve credentials for ${user.name || 'User'}`,
          url: profileUrl
        })
      } catch {
        // User cancelled share
      }
    } else {
      await handleCopyLink()
    }
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(qrImageUrl)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `CampusResolve-QR-${user.name ? user.name.replace(/\s+/g, '_') : 'Profile'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      showToast('success', 'QR Code image downloaded!')
    } catch {
      showToast('error', 'Could not download QR code image.')
    } finally {
      setTimeout(() => setIsDownloading(false), 800)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm overflow-hidden paper-card rounded-md p-6 sm:p-8 text-center"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="space-y-2 mb-6 pb-4 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10">
            <div className="paper-font-type inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider border-[1.5px] border-dashed border-emerald-500/50 -rotate-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Credential
            </div>
            <h3 className="paper-font-type text-xl font-bold text-[var(--text-heading)] tracking-tight">
              Profile Verification QR
            </h3>
            <p className="text-xs font-semibold text-[#64748B]">
              Scan to open verified CampusResolve profile
            </p>
          </div>

          {/* QR Container */}
          <div className="relative mx-auto mb-6 w-52 h-52 p-3 rounded-md bg-white border-[1.5px] border-dashed border-[#e5dcc3] dark:border-white/10 shadow-md flex items-center justify-center group overflow-hidden">
            <img
              src={qrImageUrl}
              alt="Profile QR Code"
              className="w-full h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
            />
            {/* Sparkle decorative badge */}
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-md bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_2px_0_#0f172a] -rotate-2">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          {/* User Info Preview */}
          <div className="mb-6 p-3.5 rounded-md bg-[#efe7d2]/60 dark:bg-white/5 border-[1.5px] border-dashed border-[#e5dcc3] dark:border-white/10 flex items-center gap-3 text-left">
            <UserAvatar
              src={user.profilePicture || user.profileImage}
              name={user.name}
              size="md"
              className="h-10 w-10 border-2 border-slate-200"
            />
            <div className="min-w-0 flex-1">
              <h4 className="paper-font-type text-xs font-bold text-[var(--text-heading)] truncate">{user.name || 'Campus User'}</h4>
              <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider truncate">
                {user.department || 'General'} · {user.role || 'Member'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="paper-font-type w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-[#1e293b] dark:bg-[#f1f5f9] hover:bg-[#0f172a] dark:hover:bg-white text-[#fffdf4] dark:text-[#0f172a] text-xs font-bold uppercase tracking-wider border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_3px_0_#0f172a] dark:shadow-[0_3px_0_#64748b] active:scale-95 transition-all cursor-pointer"
            >
              <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
              {isDownloading ? 'Downloading...' : 'Download QR Code'}
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <motion.button
                type="button"
                onClick={handleShare}
                aria-label="Share Profile"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="paper-font-type group relative flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-md bg-[#fffdf4] dark:bg-[#1c2333] text-[var(--text-primary)] border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 hover:bg-[#f5eedd] dark:hover:bg-[#232c40] shadow-[0_2px_0_rgba(60,50,30,0.25)] text-xs font-bold select-none focus:outline-none transition-colors duration-200 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Share Profile</span>
              </motion.button>

              <motion.button
                type="button"
                onClick={handleCopyLink}
                aria-label={copied ? 'Profile link copied to clipboard' : 'Copy profile link to clipboard'}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="paper-font-type group relative flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-md bg-[#fffdf4] dark:bg-[#1c2333] text-[var(--text-primary)] border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 hover:bg-[#f5eedd] dark:hover:bg-[#232c40] shadow-[0_2px_0_rgba(60,50,30,0.25)] text-xs font-bold select-none focus:outline-none transition-colors duration-200 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                    <span>Copy Link</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ProfileQrModal
