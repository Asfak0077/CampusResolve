// Shared — LoadingSpinner (instant render, no fade-in delay)
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-md bg-[#1e293b] dark:bg-[#f1f5f9] border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 flex items-center justify-center text-[#fffdf4] dark:text-[#0f172a] paper-font-type font-bold text-lg shadow-[0_3px_0_#0f172a] -rotate-2">
          CR
        </div>
        <div className="absolute inset-0 rounded-md border-2 border-[var(--primary)]/30 animate-ping" />
      </div>
      <div className="space-y-1 text-center">
        <p className="paper-font-type text-sm font-bold text-[var(--text-primary)]">CampusResolve</p>
        <div className="flex items-center gap-1 justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse"
              style={{ animationDelay: `${i * 0.1}s`, animationDuration: '0.6s' }}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
)

export default LoadingSpinner
