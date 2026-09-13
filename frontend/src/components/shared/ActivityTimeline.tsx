import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, MessageSquare, UserCheck, Shield } from 'lucide-react';

interface TimelineEvent {
  status: string;
  timestamp: string;
  updatedBy: string;
  notes?: string;
}

interface ActivityTimelineProps {
  events: TimelineEvent[];
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ events }) => {
  if (!events || events.length === 0) return null;

  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted': return <Circle className="w-4 h-4 text-indigo-400" />;
      case 'assigned': return <UserCheck className="w-4 h-4 text-blue-400" />;
      case 'in progress': return <Clock className="w-4 h-4 text-amber-400" />;
      case 'resolved': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'escalated': return <Shield className="w-4 h-4 text-rose-400" />;
      case 'feedback submitted': return <MessageSquare className="w-4 h-4 text-purple-400" />;
      default: return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-[#e5dcc3] dark:before:bg-white/10">
      {sortedEvents.map((event, index) => (
        <motion.div 
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
        >
          {/* Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 bg-[var(--surface-secondary)] text-[var(--text-primary)] -rotate-2 transition-colors z-10 shrink-0">
            {getIcon(event.status)}
          </div>
          
          {/* Content */}
          <div className="w-[calc(100%-4rem)] md:w-full p-4 rounded-md border border-[#e5dcc3] dark:border-white/10 bg-[var(--paper)] ml-6 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10 pb-2">
              <span className="paper-font-type text-sm font-bold text-[var(--text-heading)] uppercase tracking-wider">{event.status}</span>
              <time className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                {new Date(event.timestamp).toLocaleString()}
              </time>
            </div>
            <div className="paper-font-type text-xs text-[var(--primary)] font-bold mb-2 uppercase tracking-wider">
              Action by: {event.updatedBy}
            </div>
            {event.notes && (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">
                "{event.notes}"
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ActivityTimeline;
