// Design System — Standard Form Input Components (clean static labels, validation states)
import React, { forwardRef } from 'react'

/* ── HelperText ─────────────────────────────────────────────── */
interface HelperTextProps {
  children: React.ReactNode
  error?: boolean
}

export const HelperText: React.FC<HelperTextProps> = ({ children, error }) => (
  <p className={`text-[13px] mt-1 ${error ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
    {children}
  </p>
)

/* ── FormGroup ─────────────────────────────────────────────── */
interface FormGroupProps {
  children: React.ReactNode
  className?: string
}

export const FormGroup: React.FC<FormGroupProps> = ({ children, className = '' }) => (
  <div className={`space-y-4 ${className}`}>{children}</div>
)

/* ── DSInput ─────────────────────────────────────────────────── */
interface DSInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  containerClassName?: string
}

export const DSInput = forwardRef<HTMLInputElement, DSInputProps>(
  ({ label, helperText, error, icon, iconRight, containerClassName = '', className = '', id, required, maxLength, value, onChange, placeholder, ...props }, ref) => {
    const valLength = typeof value === 'string' ? value.length : 0

    return (
      <div className={`space-y-1.5 w-full ${containerClassName}`}>
        {label && (
          <label htmlFor={id} className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {label} {required && <span className="text-[var(--danger)]">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            required={required}
            maxLength={maxLength}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`
              w-full h-[48px] bg-transparent border-0 border-b-2 border-b-[#d8cfae] dark:border-b-slate-500 text-[var(--text-heading)]
              rounded-none px-1 paper-font-type font-bold
              placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal
              focus:outline-none focus:border-b-[var(--primary)]
              transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? '!border-b-[var(--danger)]' : ''}
              ${icon ? '!pl-8' : ''}
              ${iconRight ? '!pr-8' : ''}
              ${className}
            `}
            {...props}
          />

          {iconRight && (
            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--text-muted)] z-10">
              {iconRight}
            </span>
          )}
        </div>

        <div className="flex justify-between items-start">
          <div className="flex-1">
            {error && <HelperText error>{error}</HelperText>}
            {!error && helperText && <HelperText>{helperText}</HelperText>}
          </div>
          {maxLength && (
            <div className="text-xs text-[var(--text-muted)] mt-1 ml-2 shrink-0">
              {valLength} / {maxLength}
            </div>
          )}
        </div>
      </div>
    )
  }
)

DSInput.displayName = 'DSInput'

/* ── DSSelect ─────────────────────────────────────────────────── */
interface DSSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helperText?: string
  error?: string
  containerClassName?: string
}

export const DSSelect = forwardRef<HTMLSelectElement, DSSelectProps>(
  ({ label, helperText, error, containerClassName = '', className = '', id, required, children, ...props }, ref) => (
    <div className={`space-y-1.5 w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {label} {required && <span className="text-[var(--danger)]">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={id}
          required={required}
          className={`
            w-full h-[48px] bg-[#fffdf4] dark:bg-[#1c2333] border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-[var(--text-heading)]
            rounded-md px-3.5 pr-10 paper-font-type font-bold appearance-none
            focus:outline-none focus:border-solid focus:border-[var(--primary)]
            transition-colors duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? '!border-[var(--danger)]' : ''}
            ${className}
          `}
          {...props}
        >
          {children}
        </select>

        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {error && <HelperText error>{error}</HelperText>}
      {!error && helperText && <HelperText>{helperText}</HelperText>}
    </div>
  )
)

DSSelect.displayName = 'DSSelect'

/* ── DSTextarea ─────────────────────────────────────────────── */
interface DSTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
  containerClassName?: string
}

export const DSTextarea = forwardRef<HTMLTextAreaElement, DSTextareaProps>(
  ({ label, helperText, error, containerClassName = '', className = '', id, required, maxLength, value, onChange, placeholder, ...props }, ref) => {
    const valLength = typeof value === 'string' ? value.length : 0

    return (
      <div className={`space-y-1.5 w-full ${containerClassName}`}>
        {label && (
          <label htmlFor={id} className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {label} {required && <span className="text-[var(--danger)]">*</span>}
          </label>
        )}

        <div className="relative">
          <textarea
            ref={ref}
            id={id}
            required={required}
            maxLength={maxLength}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`
              w-full min-h-[160px] bg-[#fffdf4] dark:bg-[#1c2333] border border-[#e5dcc3] dark:border-white/10 text-[var(--text-heading)]
              rounded-md p-3.5 paper-font-type font-bold leading-[28px]
              bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_27px,rgba(37,99,235,0.10)_27px,rgba(37,99,235,0.10)_28px)]
              placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal
              focus:outline-none focus:border-[var(--primary)]
              transition-colors duration-150 resize-y
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? '!border-[var(--danger)]' : ''}
              ${className}
            `}
            {...props}
          />
        </div>

        <div className="flex justify-between items-start">
          <div className="flex-1">
            {error && <HelperText error>{error}</HelperText>}
            {!error && helperText && <HelperText>{helperText}</HelperText>}
          </div>
          {maxLength && (
            <div className="text-xs text-[var(--text-muted)] mt-1 ml-2 shrink-0">
              {valLength} / {maxLength}
            </div>
          )}
        </div>
      </div>
    )
  }
)

DSTextarea.displayName = 'DSTextarea'

