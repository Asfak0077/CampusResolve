import React from 'react'

export interface TableProps {
  children: React.ReactNode
  className?: string
}

export const TableContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <div className={`paper-card rounded-md overflow-hidden ${className}`}>
    <div className="overflow-x-auto">{children}</div>
  </div>
)

export const Table: React.FC<TableProps> = ({ children, className = '' }) => (
  <table className={`w-full text-left border-collapse ${className}`}>{children}</table>
)

export const TableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-[#efe7d2] dark:bg-white/5 border-b-2 border-[#d8cfae] dark:border-slate-600 sticky top-0 z-10">
    {children}
  </thead>
)

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="divide-y divide-[#e5dcc3] dark:divide-white/10 text-sm font-semibold">{children}</tbody>
)

export const TableRow: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({
  children,
  className = '',
  onClick
}) => (
  <tr
    onClick={onClick}
    className={`hover:bg-[#f5eedd]/60 dark:hover:bg-white/5 transition-colors duration-150 ${
      onClick ? 'cursor-pointer' : ''
    } ${className}`}
  >
    {children}
  </tr>
)

export const TableHead: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <th className={`px-5 py-4 paper-font-type text-[10px] font-bold uppercase tracking-widest text-[var(--text-heading)] ${className}`}>
    {children}
  </th>
)

export const TableCell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => <td className={`px-5 py-4 text-slate-700 dark:text-slate-200 ${className}`}>{children}</td>
