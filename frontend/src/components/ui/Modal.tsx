import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { MOTION } from '../../utils/animations'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION.modal}
            onClick={onClose}
            className="fixed inset-0 bg-black/50"
          />

          {/* Modal Content — paper dossier */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={MOTION.modal}
            className={`relative w-full ${maxWidthStyles[maxWidth]} paper-card rounded-md z-10 overflow-hidden my-8 p-6 sm:p-8`}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/10 border border-transparent hover:border-dashed hover:border-[#cbbf9a] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            {title && (
              <div className="mb-6 pr-8 pb-4 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10">
                <h2 className="paper-font-type text-xl font-bold text-[var(--text-heading)] tracking-tight">
                  {title}
                </h2>
                {description && (
                  <p className="text-xs font-medium text-[var(--text-muted)] mt-1">
                    {description}
                  </p>
                )}
              </div>
            )}

            <div>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default Modal
