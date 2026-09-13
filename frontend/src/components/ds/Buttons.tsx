// Design System — Button components
import React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'

interface BtnProps {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
  id?: string
}

const sizeMap: Record<ButtonSize, string> = {
  xs: 'h-8 px-3 text-xs gap-1.5 rounded-md font-bold',
  sm: 'h-9 px-4 text-xs gap-2 rounded-md font-bold',
  md: 'h-10 sm:h-11 px-5 text-[13.5px] gap-2 rounded-lg font-bold',
  lg: 'h-12 px-6 text-sm gap-2.5 rounded-lg font-bold',
}

const variantMap: Record<ButtonVariant, string> = {
  primary:   'bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] hover:bg-[#0f172a] dark:hover:bg-white border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_3px_0_#0f172a] dark:shadow-[0_3px_0_#64748b]',
  secondary: 'bg-[#fffdf4] dark:bg-[#1c2333] hover:bg-[#f5eedd] dark:hover:bg-[#232c40] text-[var(--text-primary)] border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 shadow-[0_2px_0_rgba(60,50,30,0.25)]',
  outline:   'bg-transparent text-[var(--primary)] border-[1.5px] border-dashed border-[var(--primary)] hover:bg-[var(--primary-soft)]',

  ghost:     'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
  danger:    'bg-[#b91c1c] hover:bg-[#991b1b] active:bg-[#7f1d1d] text-white shadow-[0_3px_0_#450a0a] border border-[#450a0a]',
  success:   'bg-[#047857] hover:bg-[#065f46] text-white shadow-[0_3px_0_#022c22] border border-[#022c22]',
  warning:   'bg-[#b45309] hover:bg-[#92400e] text-white shadow-[0_3px_0_#451a03] border border-[#451a03]',
}

const baseClass = 'paper-font-type inline-flex items-center justify-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none whitespace-nowrap tracking-wide'

export const PrimaryButton: React.FC<BtnProps> = (props) => <Btn {...props} variant="primary" />
export const SecondaryButton: React.FC<BtnProps> = (props) => <Btn {...props} variant="secondary" />
export const DangerButton: React.FC<BtnProps> = (props) => <Btn {...props} variant="danger" />
export const SuccessButton: React.FC<BtnProps> = (props) => <Btn {...props} variant="success" />
export const GhostButton: React.FC<BtnProps> = (props) => <Btn {...props} variant="ghost" />
export const OutlineButton: React.FC<BtnProps> = (props) => <Btn {...props} variant="outline" />

export const Btn: React.FC<BtnProps> = ({
  children, variant = 'primary', size = 'md', isLoading = false,
  icon, iconRight, fullWidth = false, disabled = false,
  type = 'button', onClick, className = '', id
}) => (
  <motion.button
    whileHover={disabled || isLoading ? undefined : { y: -1, transition: { duration: 0.15 } }}
    whileTap={disabled || isLoading ? undefined : { scale: 0.97 }}
    type={type}
    disabled={disabled || isLoading}
    onClick={onClick}
    id={id}
    className={`${baseClass} ${variantMap[variant]} ${sizeMap[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
  >
    {isLoading ? (
      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
    ) : icon ? (
      <span className="shrink-0">{icon}</span>
    ) : null}
    <span>{children}</span>
    {!isLoading && iconRight && <span className="shrink-0">{iconRight}</span>}
  </motion.button>
)

export default Btn
