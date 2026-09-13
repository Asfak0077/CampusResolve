import React, { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ReactNode
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            className={`w-full h-[48px] bg-transparent border-0 border-b-2 border-b-[#d8cfae] dark:border-b-slate-500 rounded-none px-1 paper-font-type font-bold text-[var(--text-heading)] placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-b-[var(--primary)] transition-colors duration-150 ${
              error
                ? '!border-b-[var(--danger)]'
                : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs font-bold text-rose-500">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[var(--text-muted)]">{helperText}</p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  icon?: React.ReactNode
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, icon, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full min-h-[140px] bg-[#fffdf4] dark:bg-[#1c2333] border border-[#e5dcc3] dark:border-white/10 rounded-md p-3.5 paper-font-type font-bold leading-[28px] bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_27px,rgba(37,99,235,0.10)_27px,rgba(37,99,235,0.10)_28px)] placeholder:text-[var(--placeholder)] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-[var(--primary)] transition-colors duration-150 resize-y ${
            error
              ? '!border-[var(--danger)]'
              : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  icon?: React.ReactNode
  error?: string
  options?: { value: string; label: string }[]
  children?: React.ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, icon, error, options, children, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="paper-font-type block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full h-[48px] bg-[#fffdf4] dark:bg-[#1c2333] border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 rounded-md px-3.5 pr-10 paper-font-type font-bold appearance-none focus:outline-none focus:border-solid focus:border-[var(--primary)] transition-colors duration-150 cursor-pointer ${
            error
              ? '!border-[var(--danger)]'
              : ''
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[var(--surface)] text-[var(--text-primary)]">
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
