// UI Primitive — Badge (enterprise update)
import React from 'react'

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'amber' | 'ghost'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  icon?: React.ReactNode
  size?: 'sm' | 'md'
  className?: string
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void
}

const variantMap: Record<BadgeVariant, string> = {
  default:  'bg-transparent text-[var(--text-secondary)] border-[1.5px] border-dashed border-[var(--border-strong)]',
  primary:  'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-[1.5px] border-dashed border-blue-600/60',
  success:  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-[1.5px] border-dashed border-emerald-600/60',
  warning:  'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-[1.5px] border-dashed border-amber-600/60',
  danger:   'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-[1.5px] border-dashed border-rose-600/60',
  info:     'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-[1.5px] border-dashed border-sky-600/60',
  violet:   'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-[1.5px] border-dashed border-purple-600/60',
  amber:    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-[1.5px] border-dashed border-amber-600/60',
  ghost:    'bg-transparent text-[var(--text-muted)] border-[1.5px] border-dashed border-[var(--border)]',
}

export const Badge: React.FC<BadgeProps> = ({
  children, variant = 'default', icon, size = 'md', className = '', onClick
}) => (
  <span
    onClick={onClick}
    className={`
      paper-font-type inline-flex items-center gap-1.5 rounded font-bold uppercase tracking-wider leading-none -rotate-[0.6deg]
      ${size === 'sm' ? 'px-2 py-0.5 text-[0.65rem]' : 'px-2.5 py-1 text-[11px]'}
      ${variantMap[variant]}
      ${className}
    `}
  >
    {icon && <span className="shrink-0">{icon}</span>}
    {children}
  </span>
)
