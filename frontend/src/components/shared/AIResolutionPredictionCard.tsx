import React from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles, Clock, ShieldAlert, CheckCircle2,
  TrendingUp, Building2, AlertTriangle,
  Info, Cpu, Check
} from 'lucide-react'
import { AIResolutionPrediction } from '../../types/domain'

interface AIResolutionPredictionCardProps {
  prediction: AIResolutionPrediction | null
  isLoading?: boolean
  error?: string | null
  onApplyPriority?: (priority: 'low' | 'medium' | 'high') => void
  onApplyDepartment?: (department: string) => void
  className?: string
}

export const AIResolutionPredictionCard: React.FC<AIResolutionPredictionCardProps> = ({
  prediction,
  isLoading = false,
  error = null,
  onApplyPriority,
  onApplyDepartment,
  className = ''
}) => {
  if (error && !prediction) {
    return (
      <div className={`paper-card p-4 rounded-md text-rose-500 text-xs font-semibold flex items-center gap-2 ${className}`}>
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Unable to generate AI prediction at the moment. You can still proceed with submission.</span>
      </div>
    )
  }

  if (!prediction && !isLoading) {
    return null
  }

  // Risk Color Helper
  const getRiskStyle = (risk?: string) => {
    switch (risk?.toLowerCase()) {
      case 'high':
        return {
          bg: 'bg-rose-500/15',
          border: 'border-rose-500/30',
          text: 'text-rose-600 dark:text-rose-400',
          dot: 'bg-rose-500',
          bar: 'bg-gradient-to-r from-rose-500 to-red-600'
        }
      case 'medium':
        return {
          bg: 'bg-amber-500/15',
          border: 'border-amber-500/30',
          text: 'text-amber-600 dark:text-amber-400',
          dot: 'bg-amber-500',
          bar: 'bg-gradient-to-r from-amber-500 to-orange-500'
        }
      case 'low':
      default:
        return {
          bg: 'bg-emerald-500/15',
          border: 'border-emerald-500/30',
          text: 'text-emerald-600 dark:text-emerald-400',
          dot: 'bg-emerald-500',
          bar: 'bg-gradient-to-r from-emerald-500 to-teal-500'
        }
    }
  }

  const riskStyle = getRiskStyle(prediction?.escalationRisk)
  const slaPct = prediction?.slaSuccessProbability || 90

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`paper-card rounded-md p-5 sm:p-6 relative overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_3px_0_#0f172a] -rotate-2 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="paper-font-type text-sm sm:text-base font-bold text-[var(--text-heading)] tracking-tight leading-tight">
                AI Resolution Prediction
              </h3>
              {isLoading && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 animate-pulse border border-purple-500/20">
                  <Cpu className="w-3 h-3 animate-spin" /> Analyzing...
                </span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Intelligent pre-submission resolution forecast
            </p>
          </div>
        </div>

        {/* Confidence Badge */}
        {prediction && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 dark:bg-indigo-400/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5 shadow-xs">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{prediction.confidenceLevel} confidence – {prediction.confidenceScore}%</span>
            </span>
          </div>
        )}
      </div>

      {/* Prediction Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 py-4 relative z-10">
        
        {/* Metric 1: Expected Resolution Time */}
        <div className="p-3.5 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)] flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" /> Resolution Time
          </span>
          <p className="paper-font-type text-[13.5px] font-bold text-[var(--text-heading)] tracking-tight">
            {isLoading ? 'Calculating...' : prediction?.expectedResolutionTime || 'Estimated: 4–8 hours'}
          </p>
        </div>

        {/* Metric 2: Escalation Risk */}
        <div className="p-3.5 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)] flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-500" /> Escalation Risk
          </span>
          <div className="flex items-center gap-2">
            <span className={`paper-font-type px-2.5 py-0.5 rounded-md text-xs font-bold tracking-wide border-[1.5px] border-dashed flex items-center gap-1.5 -rotate-[0.6deg] ${riskStyle.bg} ${riskStyle.text} ${riskStyle.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${riskStyle.dot}`} />
              {prediction?.escalationRisk || 'Low'} Risk
            </span>
          </div>
        </div>

        {/* Metric 3: Suggested Priority */}
        <div className="p-3.5 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Suggested Priority
            </span>
            {onApplyPriority && prediction?.suggestedPriority && (
              <button
                type="button"
                onClick={() => {
                  const p = (prediction.suggestedPriority || '').toLowerCase()
                  if (p === 'low' || p === 'medium' || p === 'high') {
                    onApplyPriority(p)
                  } else if (p === 'critical' || p === 'urgent') {
                    onApplyPriority('high')
                  }
                }}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Apply
              </button>
            )}
          </div>
          <p className="paper-font-type text-[13.5px] font-bold text-[var(--text-heading)] tracking-tight">
            {prediction?.suggestedPriority || 'Medium'}
          </p>
        </div>

        {/* Metric 4: Recommended Department */}
        <div className="p-3.5 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-500" /> Recommended Dept.
            </span>
            {onApplyDepartment && prediction?.recommendedDepartment && (
              <button
                type="button"
                onClick={() => prediction?.recommendedDepartment && onApplyDepartment(prediction.recommendedDepartment)}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Apply
              </button>
            )}
          </div>
          <p className="paper-font-type text-[13.5px] font-bold text-[var(--text-heading)] tracking-tight truncate">
            {prediction?.recommendedDepartment || 'Maintenance'}
          </p>
        </div>

      </div>

      {/* SLA Success Probability Bar */}
      <div className="p-3.5 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)] space-y-2 relative z-10 mb-3.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            SLA Success Probability
          </span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
            {slaPct}% probability of resolution within SLA
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${slaPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-full ${riskStyle.bar}`}
          />
        </div>
      </div>

      {/* Explanation & Recommended Action Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
        
        {/* AI Explanation */}
        <div className="p-3 rounded-md bg-[var(--paper)] border border-[#e5dcc3] dark:border-white/10 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
              AI Explanation
            </span>
            <p className="font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
              {prediction?.aiExplanation || 'Similar infrastructure complaints in this location were usually resolved within one working day.'}
            </p>
          </div>
        </div>

        {/* Recommended Action */}
        <div className="p-3 rounded-md bg-[var(--paper)] border border-[#e5dcc3] dark:border-white/10 flex items-start gap-2.5">
          <Check className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
              Recommended Action
            </span>
            <p className="font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
              {prediction?.recommendedAction || 'Assign this complaint to the electrical maintenance team immediately.'}
            </p>
          </div>
        </div>

      </div>

      {/* Data Grounding & Pattern Notice */}
      <div className="pt-3 mt-3 border-t-2 border-dashed border-[#e5dcc3] dark:border-white/10 flex items-center justify-between text-[10.5px] font-medium text-slate-500 dark:text-slate-400 relative z-10">
        <span className="italic">
          {prediction?.dataSource === 'historical' && prediction.historicalCount && prediction.historicalCount > 0
            ? `Prediction grounded on ${prediction.historicalCount} similar historical complaints resolved in the database.`
            : 'Prediction based on complaint category and general resolution patterns.'}
        </span>
        <span className="hidden sm:inline font-semibold text-indigo-600 dark:text-indigo-400">
          CampusResolve AI Intelligence
        </span>
      </div>

    </motion.div>
  )
}

export default AIResolutionPredictionCard
