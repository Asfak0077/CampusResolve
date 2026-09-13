import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '../components/ds/AppShell'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { createTeacher, deleteTeacher, fetchTeachers } from '../services/teacherService'
import { Users, UserPlus, BookOpen, Award, Trash2, Search, Shield } from 'lucide-react'
import { UserAvatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { motion } from 'framer-motion'

const TeacherManagement = () => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: '', email: '', department: 'CSE', designation: 'Professor' })
  const [searchQuery, setSearchQuery] = useState('')
  const teachersQuery = useQuery({ queryKey: ['teachers'], queryFn: fetchTeachers })

  const createMutation = useMutation({
    mutationFn: createTeacher,
    onSuccess: async () => {
      setForm({ name: '', email: '', department: 'CSE', designation: 'Professor' })
      await queryClient.invalidateQueries({ queryKey: ['teachers'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teachers'] })
    }
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    createMutation.mutate(form)
  }

  if (teachersQuery.isLoading) {
    return <LoadingSpinner />
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="paper-font-type text-2xl sm:text-3xl font-bold text-[var(--text-heading)] tracking-tight">
              Faculty Directory & Management
            </h1>
            <p className="text-[13.5px] text-[var(--text-muted)] mt-1 font-medium">
              Onboard new faculty members, assign departments, and manage routing.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--active-text)] bg-[var(--active-bg)] px-3.5 py-2 rounded-[14px] border border-[var(--border-subtle)]">
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Control</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Side: Add Faculty Form */}
          <div className="lg:col-span-4">
            <form
              onSubmit={onSubmit}
              noValidate
              className="sticky top-24 p-6 sm:p-7 paper-card rounded-md space-y-5"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--active-text)] bg-[var(--active-bg)] rounded-full flex items-center gap-1.5 border border-[var(--border-subtle)]">
                    <UserPlus className="w-3 h-3" /> Onboarding
                  </span>
                </div>
                <h2 className="paper-font-type text-[20px] font-bold text-[var(--text-heading)] tracking-tight">
                  Add Faculty Member
                </h2>
                <p className="text-[12.5px] text-[var(--text-muted)] mt-0.5 font-normal">
                  Provision new faculty accounts and routing.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="teacher-name" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="teacher-name"
                    type="text"
                    required
                    placeholder="e.g. Dr. Jane Doe"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-[48px] px-4 rounded-md bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="teacher-email" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Institutional Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="teacher-email"
                    type="email"
                    required
                    placeholder="faculty@university.edu"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full h-[48px] px-4 rounded-md bg-[var(--surface-secondary)] border border-[var(--border)] text-[13.5px] font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="teacher-dept" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      Department
                    </label>
                    <select
                      id="teacher-dept"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      className="w-full h-[48px] px-3 rounded-md bg-[var(--surface-secondary)] border border-[var(--border)] text-[13px] font-semibold text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all cursor-pointer"
                    >
                      {['CSE', 'ECE', 'MECH', 'EEE', 'AIDS', 'IT'].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="teacher-desig" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      Designation
                    </label>
                    <select
                      id="teacher-desig"
                      value={form.designation}
                      onChange={(e) => setForm({ ...form, designation: e.target.value })}
                      className="w-full h-[48px] px-3 rounded-md bg-[var(--surface-secondary)] border border-[var(--border)] text-[13px] font-semibold text-[var(--text-primary)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all cursor-pointer"
                    >
                      {['Professor', 'Assoc Professor', 'Asst Professor', 'HOD'].map((desig) => (
                        <option key={desig} value={desig}>{desig}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                fullWidth
                isLoading={createMutation.isPending}
                icon={<UserPlus className="w-4 h-4" />}
                className="rounded-md h-[48px] font-bold paper-font-type bg-[#1e293b] dark:bg-[#f1f5f9] text-[#fffdf4] dark:text-[#0f172a] hover:bg-[#0f172a] dark:hover:bg-white border border-[#0f172a] dark:border-[#cbd5e1] shadow-[0_3px_0_#0f172a] dark:shadow-[0_3px_0_#64748b] cursor-pointer"
              >
                Onboard Faculty
              </Button>
            </form>
          </div>

          {/* Right Side: Faculty Roster */}
          <div className="lg:col-span-8">
            <div className="p-6 sm:p-7 paper-card rounded-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-[var(--active-bg)] text-[var(--active-text)] flex items-center justify-center border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 -rotate-2">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="paper-font-type text-[18px] font-bold text-[var(--text-heading)] tracking-tight">
                      Faculty Directory
                    </h2>
                    <p className="text-[12px] text-[var(--text-muted)] font-medium">
                      {teachersQuery.data?.length || 0} registered faculty members
                    </p>
                  </div>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="search-faculty"
                    type="text"
                    placeholder="Search directory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-[42px] pl-9 pr-3.5 rounded-md bg-[var(--surface-secondary)] border border-[var(--border)] text-[13px] font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:bg-[var(--card)] focus:outline-none focus:border-[var(--accent)] transition-all"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(teachersQuery.data ?? [])
                  .filter((teacher) => {
                    if (!searchQuery.trim()) return true
                    const q = searchQuery.toLowerCase()
                    return (
                      teacher.name.toLowerCase().includes(q) ||
                      teacher.department.toLowerCase().includes(q) ||
                      teacher.email.toLowerCase().includes(q)
                    )
                  })
                  .map((teacher) => (
                    <motion.div
                      key={teacher.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 sm:p-5 rounded-md bg-[var(--surface-secondary)] border border-[var(--border)] hover:shadow-md transition-all duration-200 space-y-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={teacher.profilePicture || teacher.profileImage}
                            name={teacher.name}
                            size="lg"
                            className="h-11 w-11 rounded-md"
                          />
                          <div>
                            <h3 className="paper-font-type text-[14.5px] font-bold text-[var(--text-heading)] leading-tight">
                              {teacher.name}
                            </h3>
                            <p className="text-[11.5px] font-medium text-[var(--text-muted)] truncate">{teacher.email}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to remove ${teacher.name}?`)) {
                              deleteMutation.mutate(teacher.id)
                            }
                          }}
                          className="p-2 rounded-md text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remove Faculty"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t-2 border-dashed border-[#e5dcc3] dark:border-white/10">
                        <span className="paper-font-type text-[10.5px] font-bold uppercase tracking-wider text-[var(--active-text)] bg-[var(--active-bg)] px-2.5 py-1 rounded-md flex items-center gap-1 border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 -rotate-[0.6deg]">
                          <BookOpen className="h-3 w-3" /> {teacher.department}
                        </span>
                        <span className="paper-font-type text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--card)] px-2.5 py-1 rounded-md border-[1.5px] border-dashed border-[#cbbf9a] dark:border-slate-500 flex items-center gap-1 -rotate-[0.6deg]">
                          <Award className="h-3 w-3" /> {teacher.designation || 'Professor'}
                        </span>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default TeacherManagement
