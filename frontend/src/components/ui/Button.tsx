// UI Primitive — Premium Minimalist Button
import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconRight,
  fullWidth = false,
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) => {
  const base =
    'paper-font-type inline-flex items-center justify-center font-bold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none whitespace-nowrap'

  const variants = {
    primary:
      'bg-[#1e293b] hover:bg-[#0f172a] dark:bg-[#f1f5f9] dark:hover:bg-white text-[#fffdf4] dark:text-[#0f172a] border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_3px_0_#0f172a] dark:shadow-[0_3px_0_#64748b] active:translate-y-[2px] active:shadow-none',
    secondary:
      'bg-[#fffdf4] dark:bg-[#1c2333] hover:bg-[#f5eedd] dark:hover:bg-[#232c40] text-[var(--text-primary)] border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 shadow-[0_2px_0_rgba(60,50,30,0.25)]',
    outline:

      'bg-transparent text-[var(--text-primary)] border-[1.5px] border-dashed border-[var(--border-strong)] hover:bg-[var(--surface-hover)]',
    ghost:
      'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
    danger:
      'bg-[#b91c1c] hover:bg-[#991b1b] text-white border border-[#450a0a] shadow-[0_3px_0_#450a0a]',
    success:
      'bg-[#047857] hover:bg-[#065f46] text-white border border-[#022c22] shadow-[0_3px_0_#022c22]',
    warning:
      'bg-[#b45309] hover:bg-[#92400e] text-white border border-[#451a03] shadow-[0_3px_0_#451a03]',
  }

  const sizes = {
    sm: 'h-9 px-4 text-xs gap-2 rounded-md',
    md: 'h-10 sm:h-11 px-5 text-[13.5px] gap-2 rounded-lg',
    lg: 'h-12 px-6 text-[14px] gap-2.5 rounded-lg',
  }

  return (
    <motion.button
      whileHover={disabled || isLoading ? undefined : { y: -2 }}
      whileTap={disabled || isLoading ? undefined : { scale: 0.98 }}
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0 flex items-center justify-center">{icon}</span>
      ) : null}
      <span className="shrink-0">{children}</span>
      {!isLoading && iconRight && <span className="shrink-0 flex items-center justify-center">{iconRight}</span>}
    </motion.button>
  )
}
