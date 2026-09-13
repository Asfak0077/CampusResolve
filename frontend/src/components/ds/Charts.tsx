// Design System — Enterprise Charts (Recharts Wrappers)
import React from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

/* ── Colors ─────────────────────────────────────────────────── */
export const CHART_COLORS = {
  blue: '#2563EB',
  indigo: '#4F46E5',
  emerald: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  cyan: '#06B6D4',
  violet: '#8B5CF6',
  slate: '#64748B'
}

export const PIE_COLORS = [
  CHART_COLORS.blue,
  CHART_COLORS.emerald,
  CHART_COLORS.amber,
  CHART_COLORS.red,
  CHART_COLORS.violet,
  CHART_COLORS.cyan
]

/* ── Tooltip Style — paper slip ─────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="paper-card rounded-md p-3 min-w-[160px]">
        <p className="paper-font-type text-[var(--text-heading)] font-bold text-[13px] mb-2 uppercase tracking-wider">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 text-[13px]">
            <div className="w-2.5 h-2.5 rounded-sm border border-black/20" style={{ backgroundColor: entry.color }} />
            <span className="text-[var(--text-muted)] capitalize font-medium">{entry.name}:</span>
            <span className="paper-font-type text-[var(--text-heading)] font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

/* ── Shared paper chart shell ─────────────────────────────────── */
const ChartShell: React.FC<{ title?: string; subtitle?: string; className?: string; children: React.ReactNode }> = ({
  title, subtitle, className = '', children,
}) => (
  <div className={`paper-card rounded-md p-5 sm:p-6 flex flex-col ${className}`}>
    {(title || subtitle) && (
      <div className="mb-5 pb-4 border-b-2 border-dashed border-[#e5dcc3] dark:border-white/10">
        {title && <h3 className="paper-font-type text-[15px] font-bold text-[var(--text-heading)] tracking-tight">{title}</h3>}
        {subtitle && <p className="text-[12.5px] text-[var(--text-muted)] font-medium mt-0.5">{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
)

/* ── Area Chart Card ─────────────────────────────────────────── */
interface ChartProps {
  data: any[]
  title?: string
  subtitle?: string
  height?: number
  className?: string
}

interface AreaChartCardProps extends ChartProps {
  xKey: string
  areas: { key: string; color: string; name?: string }[]
}

export const AreaChartCard: React.FC<AreaChartCardProps> = ({ data, title, subtitle, height = 300, className = '', xKey, areas }) => {
  return (
    <ChartShell title={title} subtitle={subtitle} className={className}>
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {areas.map((area) => (
                <linearGradient key={area.key} id={`color${area.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={area.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={area.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--divider)" />
            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            {areas.map((area) => (
              <Area 
                key={area.key}
                type="monotone" 
                dataKey={area.key} 
                name={area.name || area.key}
                stroke={area.color} 
                strokeWidth={3}
                fillOpacity={1} 
                fill={`url(#color${area.key})`} 
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  )
}

/* ── Bar Chart Card ──────────────────────────────────────────── */
interface BarChartCardProps extends ChartProps {
  xKey: string
  bars: { key: string; color: string; name?: string }[]
}

export const BarChartCard: React.FC<BarChartCardProps> = ({ data, title, subtitle, height = 300, className = '', xKey, bars }) => {
  return (
    <ChartShell title={title} subtitle={subtitle} className={className}>
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--divider)" />
            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-secondary)', opacity: 0.5 }} />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
            {bars.map((bar) => (
              <Bar 
                key={bar.key} 
                dataKey={bar.key} 
                name={bar.name || bar.key}
                fill={bar.color} 
                radius={[4, 4, 0, 0]} 
                maxBarSize={50}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  )
}

/* ── Donut Chart Card ────────────────────────────────────────── */
interface DonutChartCardProps extends ChartProps {
  dataKey: string
  nameKey: string
}

export const DonutChartCard: React.FC<DonutChartCardProps> = ({ data, title, subtitle, height = 300, className = '', dataKey, nameKey }) => {
  return (
    <ChartShell title={title} subtitle={subtitle} className={className}>
      <div className="flex-1 min-h-[250px]" style={{ height, width: '100%' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={110}
              paddingAngle={2}
              dataKey={dataKey}
              nameKey={nameKey}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  )
}

/* ── Line Chart Card ─────────────────────────────────────────── */
interface LineChartCardProps extends ChartProps {
  xKey: string
  lines: { key: string; color: string; name?: string }[]
}

export const LineChartCard: React.FC<LineChartCardProps> = ({ data, title, subtitle, height = 300, className = '', xKey, lines }) => {
  return (
    <ChartShell title={title} subtitle={subtitle} className={className}>
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--divider)" />
            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
            {lines.map((line) => (
              <Line 
                key={line.key}
                type="monotone" 
                dataKey={line.key} 
                name={line.name || line.key}
                stroke={line.color} 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  )
}
