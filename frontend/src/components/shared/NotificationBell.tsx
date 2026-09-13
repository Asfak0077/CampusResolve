import { useState } from 'react'
import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useNotifications } from '../../contexts/NotificationContext'
import { formatDisplayComplaintId } from './ComplaintIdBadge'

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.role)
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

  const toggleNotifications = () => {
    setIsOpen(!isOpen)
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markRead(notification.id)
    }

    if (role === 'admin') navigate('/admin')
    else if (role === 'teacher') navigate('/teacher')
    else if (role === 'student') {
      navigate(notification.type === 'profile_updated' ? '/student/profile' : '/student/history')
    }
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleNotifications}
        className="relative w-10 h-10 rounded-md bg-[#fffdf4] dark:bg-[#1c2333] border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-solid transition-all shadow-[0_2px_0_rgba(60,50,30,0.2)] flex items-center justify-center cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-[var(--text-secondary)]" />

        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#101722]"
            />
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="paper-card absolute right-0 mt-2 w-80 z-50 origin-top-right rounded-md overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-[rgba(253,230,138,0.75)] border-x border-dashed border-[rgba(120,100,70,0.35)] -rotate-2 z-10" />
              <div className="flex items-center justify-between p-4 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10 bg-[#efe7d2]/60 dark:bg-white/5">
                <h3 className="paper-font-type font-bold text-[var(--text-heading)] text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    className="paper-font-type text-xs font-bold text-[var(--primary)] hover:underline transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-[var(--text-muted)] text-xs font-medium">
                    <p className="paper-font-hand text-[20px]">No new notifications…</p>
                  </div>
                ) : (
                  <div>
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 border-b border-dashed border-[#e5dcc3] dark:border-white/10 last:border-0 hover:bg-[#f5eedd]/70 dark:hover:bg-white/5 transition-colors cursor-pointer ${!notification.read ? 'bg-amber-50/70 dark:bg-amber-500/5 border-l-4 !border-l-red-400' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!notification.read ? 'bg-red-500' : 'bg-[#d8cfae] dark:bg-slate-600'}`} />
                          <div className="flex-1">
                            <p className={`text-xs font-bold mb-0.5 flex items-center gap-1.5 flex-wrap ${!notification.read ? 'text-[var(--text-heading)]' : 'text-[var(--text-secondary)]'}`}>
                              {(notification.metadata as any)?.complaintId && (
                                <span className="paper-font-type font-bold text-blue-700 dark:text-blue-400 text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded border-[1.5px] border-dashed border-blue-600/60 shrink-0 -rotate-1">
                                  {formatDisplayComplaintId(String((notification.metadata as any).complaintId))}
                                </span>
                              )}
                              <span className="paper-font-type">{String(notification.title || '')}</span>
                            </p>
                            <p className={`text-xs ${!notification.read ? 'text-[var(--text-heading)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                              {notification.message}
                            </p>
                            <p className="paper-font-type text-[10px] text-[var(--text-muted)] mt-1 font-bold">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-2 border-t-2 border-dashed border-[#e5dcc3] dark:border-white/10 bg-[#efe7d2]/60 dark:bg-white/5 text-center">
                <button className="paper-font-type text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors w-full py-1">
                  View all history
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationBell
