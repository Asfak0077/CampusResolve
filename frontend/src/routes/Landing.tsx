import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Hero from '../components/landing/Hero'
import Statistics from '../components/landing/Statistics'
import Features from '../components/landing/Features'
import { HowItWorks, WhyChooseUs, FAQ } from '../components/landing/AdditionalSections'
import { useAuthStore } from '../store/authStore'
import ThemeToggle from '../components/shared/ThemeToggle'
import AmbientBackground from '../components/shared/AmbientBackground'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ArrowRight, LogIn } from 'lucide-react'

const LandingPage = () => {
  const role = useAuthStore((state) => state.role)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <div className="paper-desk min-h-screen relative text-[var(--text-primary)] overflow-x-hidden font-sans transition-colors duration-300">
      
      {/* Global Background Ambient Animation */}
      <AmbientBackground />

      {/* Top Header / Actions Bar */}
      <header className="relative z-50 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="paper-font-type h-9 w-9 rounded-md flex items-center justify-center bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] font-bold text-sm shadow-[0_2px_0_#0f172a] dark:shadow-[0_2px_0_#64748b] border border-[#0f172a] dark:border-[#cbd5e1] -rotate-3">
            CR
          </div>
          <span className="paper-font-type text-lg font-bold text-[var(--text-primary)] tracking-tight">
            CampusResolve
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login">
            <Button size="sm" icon={<LogIn className="w-4 h-4" />}>
              Portal Login
            </Button>
          </Link>
        </div>
      </header>

      {/* 3. Professional Page Flow:
          Hero Section
          ↓
          Statistics Section
          ↓
          Core Features
          ↓
          How It Works
          ↓
          Why Choose CampusResolve (Workflow & Benefits)
          ↓
          Platform Screenshots Preview
          ↓
          Testimonials
          ↓
          FAQ
          ↓
          Footer
      */}
      <main className="relative z-10 space-y-4">
        
        {/* 1. Hero Section */}
        <Hero />

        {/* 2. Statistics Section */}
        <Statistics />

        {/* 3. Core Features */}
        <Features />

        {/* 4. How It Works */}
        <HowItWorks />

        {/* 5. Why Choose CampusResolve & Workflow & Benefits */}
        <WhyChooseUs />

        {/* Call to Action Banner */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card hoverEffect={false} className="p-8 sm:p-10 text-center shadow-[0_1px_2px_rgba(60,50,30,0.2),0_16px_40px_rgba(60,50,30,0.25)] overflow-hidden relative">
              <div className="absolute top-0 left-10 w-24 h-7 bg-[rgba(253,230,138,0.75)] border-x border-dashed border-[rgba(120,100,70,0.35)] -rotate-6" />
              <div className="absolute top-0 right-10 w-24 h-7 bg-[rgba(253,230,138,0.75)] border-x border-dashed border-[rgba(120,100,70,0.35)] rotate-6" />
              <div className="relative z-10 space-y-4 max-w-xl mx-auto">
                <span className="paper-stamp-inline text-[10px] text-blue-700 dark:text-sky-300">Official notice</span>
                <h3 className="paper-font-type text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {isAuthenticated ? 'Ready To Continue Your Session?' : 'Ready To Experience CampusResolve?'}
                </h3>
                <p className="paper-font-type text-xs sm:text-sm font-bold text-stone-500 dark:text-slate-400 leading-relaxed">
                  Log in using your registered credentials to access instant complaint lodging, real-time tracking, and faculty responses.
                </p>
                <div className="pt-2">
                  <Link to={role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : role === 'student' ? '/student' : '/login'}>
                    <Button variant="secondary" size="lg" icon={<ArrowRight className="w-5 h-5 text-blue-600" />}>
                      {isAuthenticated ? 'Go To Dashboard' : 'Launch Portal Now'}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        </section>

        {/* Frequently Asked Questions */}
        <FAQ />
      </main>
    </div>
  )
}

export default LandingPage
