// UI Primitive — Card (enterprise update)
import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { MOTION, hoverLift } from '../../utils/animations'

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  className?: string
  hoverEffect?: boolean
  glow?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card: React.FC<CardProps> = ({
  children, className = '', hoverEffect = true, glow = false,
  padding = 'md', ...props
}) => {
  const padMap = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' }
  return (
    <motion.div
      whileHover={hoverEffect ? hoverLift : undefined}
      transition={MOTION.card}
      className={`
        relative paper-card rounded-md
        hover:shadow-md
        hover:border-[#cbbf9a] dark:hover:border-slate-500 transition-all duration-200
        overflow-hidden
        ${padMap[padding]}
        ${className}
      `}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children, className = ''
}) => (
  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10 mb-5 ${className}`}>
    {children}
  </div>
)

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string; icon?: React.ReactNode }> = ({
  children, className = '', icon
}) => (
  <h3 className={`paper-font-type text-base font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5 ${className}`}>
    {icon && <span className="p-1.5 rounded-md bg-transparent border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-[var(--primary)]">{icon}</span>}
    {children}
  </h3>
)

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children, className = ''
}) => (
  <p className={`text-sm text-[var(--text-muted)] mt-0.5 ${className}`}>
    {children}
  </p>
)

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children, className = ''
}) => <div className={`space-y-4 ${className}`}>{children}</div>

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children, className = ''
}) => (
  <div className={`pt-4 mt-5 border-t-2 border-dashed border-[#e5dcc3] dark:border-white/10 flex items-center justify-between gap-4 ${className}`}>
    {children}
  </div>
)
