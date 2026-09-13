// Design System — Display components
// Avatar, Tag, StatusBadge, EmptyState, LoadingSkeleton, Modal, Tooltip
import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Inbox } from 'lucide-react'

/* ── Tag ─────────────────────────────────────────────────────── */
type TagVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet'

const tagMap: Record<TagVariant, string> = {
  default: 'bg-transparent text-[var(--text-secondary)] border-[1.5px] border-dashed border-[var(--border-strong)]',
  primary: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-[1.5px] border-dashed border-blue-500/50',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-[1.5px] border-dashed border-emerald-500/50',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-[1.5px] border-dashed border-amber-500/50',
  danger:  'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-[1.5px] border-dashed border-rose-500/50',
  info:    'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-[1.5px] border-dashed border-sky-500/50',
  violet:  'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-[1.5px] border-dashed border-purple-500/50',
}

interface TagProps {
  children: React.ReactNode
  variant?: TagVariant
  icon?: React.ReactNode
  className?: string
}

export const Tag: React.FC<TagProps> = ({ children, variant = 'default', icon, className = '' }) => (
  <span className={`paper-font-type inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider -rotate-[0.6deg] ${tagMap[variant]} ${className}`}>
    {icon && <span className="shrink-0">{icon}</span>}
    {children}
  </span>
)

/* ── StatusBadge ─────────────────────────────────────────────── */
const statusStyles: Record<string, string> = {
  'Submitted':   'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-600/60',
  'Assigned':    'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-600/60',
  'In Progress': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-600/60',
  'Resolved':    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-600/60',
  'Escalated':   'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-600/60',
  'Closed':      'bg-transparent text-[var(--text-muted)] border-[var(--border-strong)]',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export const DSStatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const badgeClass = statusStyles[status] || statusStyles['Closed']
  return (
    <span className={`paper-font-type inline-flex items-center gap-1.5 px-[9px] py-[4.5px] rounded border-[1.5px] border-dashed text-[11px] font-bold uppercase tracking-wider leading-none shrink-0 -rotate-[0.6deg] ${badgeClass} ${className}`}>
      <span>{status}</span>
    </span>
  )
}

/* ── Avatar ──────────────────────────────────────────────────── */
interface AvatarProps {
  src?: string
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  ring?: boolean
}

const avatarSizes: Record<string, string> = {
  xs:  'h-6 w-6 text-[0.6rem]',
  sm:  'h-8 w-8 text-xs',
  md:  'h-10 w-10 text-sm',
  lg:  'h-12 w-12 text-base',
  xl:  'h-16 w-16 text-xl',
  '2xl': 'h-24 w-24 text-2xl',
}

const getInitials = (name?: string) => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const getColor = (name?: string) => {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-violet-500 to-violet-600',
    'from-emerald-500 to-emerald-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
    'from-cyan-500 to-cyan-600',
    'from-indigo-500 to-indigo-600',
    'from-pink-500 to-pink-600',
  ]
  if (!name) return colors[0]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export const DSAvatar: React.FC<AvatarProps> = ({ src, name, size = 'md', className = '', ring = false }) => {
  const sz = avatarSizes[size]
  const color = getColor(name)
  const initials = getInitials(name)

  return (
    <div className={`relative shrink-0 rounded-full overflow-hidden ${sz} ${ring ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)]' : ''} ${className}`}>
      {src ? (
        <img src={src} alt={name || 'Avatar'} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${color} text-white font-semibold`}>
          {initials}
        </div>
      )}
    </div>
  )
}

/* ── EmptyState ──────────────────────────────────────────────── */
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
  >
    <div className="p-5 rounded-md bg-transparent border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-[var(--text-muted)] mb-5 -rotate-2">
      {icon || <Inbox className="w-8 h-8" />}
    </div>
    <h3 className="paper-font-type text-lg font-bold text-[var(--text-primary)] mb-2">{title}</h3>
    {description && (
      <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed mb-6">{description}</p>
    )}
    {action}
  </motion.div>
)

/* ── LoadingSkeleton ─────────────────────────────────────────── */
interface SkeletonProps {
  className?: string
  count?: number
}

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-[var(--surface-secondary)] rounded-lg ${className}`} />
)

export const CardSkeleton: React.FC = () => (
  <div className="paper-card rounded-md p-5 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
  </div>
)

export const StatsCardSkeleton: React.FC = () => (
  <div className="paper-card rounded-md p-5 space-y-3">
    <div className="flex justify-between">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
    <Skeleton className="h-8 w-20 mt-2" />
    <Skeleton className="h-4 w-28" />
  </div>
)

export const PageLoadingSkeleton: React.FC<SkeletonProps> = ({ count = 4 }) => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => <StatsCardSkeleton key={i} />)}
    </div>
    <CardSkeleton />
  </div>
)

/* ── Modal ───────────────────────────────────────────────────── */
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const modalSizes: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export const DSModal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', className = '' }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[var(--bg)]/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative z-10 w-full ${modalSizes[size]} paper-card rounded-md shadow-[0_24px_60px_rgba(60,50,30,0.35)] ${className}`}
          >
            {title && (
              <div className="flex items-center justify-between p-5 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10">
                <h2 className="paper-font-type text-base font-bold text-[var(--text-primary)]">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
