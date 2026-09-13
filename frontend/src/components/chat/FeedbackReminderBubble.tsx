import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Star, X } from 'lucide-react'
import { useState } from 'react'

interface FeedbackReminderBubbleProps {
  resolvedCount: number
}

const FeedbackReminderBubble = ({ resolvedCount }: FeedbackReminderBubbleProps) => {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || resolvedCount === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.92 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 1.5 }}
        className="paper-card fixed bottom-28 right-6 z-40 w-72 overflow-hidden rounded-md transition-colors"
      >
        {/* Gradient top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Icon + label */}
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 bg-emerald-50 dark:bg-emerald-950/50 -rotate-2">
                <Star className="h-4 w-4 text-emerald-500 fill-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  Feedback Pending
                </p>
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
            🎉 You have{' '}
            <span className="font-black text-emerald-600 dark:text-emerald-400">{resolvedCount} resolved</span>{' '}
            complaint{resolvedCount > 1 ? 's' : ''}. Share your experience and help improve the system!
          </p>

          <Link
            to="/student/feedback"
            onClick={() => setDismissed(true)}
            className="paper-font-type mt-4 flex items-center justify-center w-full h-10 px-5 text-xs gap-2 rounded-md font-bold tracking-wide bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_3px_0_#0f172a] dark:shadow-[0_3px_0_#64748b] transition-all"
          >
            ✨ Submit Feedback Now
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default FeedbackReminderBubble

