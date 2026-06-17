import { useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar, Rectangle,
} from 'recharts';

import summaryData from '@/data/real/summary.json';
import stationData from '@/data/real/by_station.json';
import vehicleData from '@/data/real/by_vehicle.json';
import hourlyData from '@/data/real/by_hour.json';
import monthlyData from '@/data/real/by_month.json';
import dayData from '@/data/real/by_day.json';
import insightsData from '@/data/real/insights.json';

// ─────────── Types ───────────
interface StationEntry {
  name: string;
  totalViolations: number;
  approvalRate: number;
  highRisk: number;
  vehicleClass: Record<string, number>;
  weekendCount: number;
  weekdayCount: number;
}

interface VehicleClassEntry {
  vehicleClass: string;
  count: number;
  percentage: number;
  approvalRate: number;
}

interface HourlyEntry {
  hour: number;
  count: number;
  percentage: number;
  approvalRate: number;
}

interface MonthEntry {
  year: number;
  month: number;
  label: string;
  count: number;
  highRisk: number;
  weekendCount: number;
}

interface DayEntry {
  day: string;
  shortDay: string;
  count: number;
  percentage: number;
  approvalRate: number;
  isWeekend: boolean;
}

interface InsightEntry {
  id: string;
  icon: string;
  title: string;
  description: string;
  severity: 'warning' | 'danger' | 'info';
  metric: string;
  metricLabel: string;
}

type VehicleClassKey = '2W' | 'CAR' | '3W' | 'BUS' | 'HV' | 'LMV' | 'OTHER';
type DayType = 'all' | 'weekday' | 'weekend';

// ─────────── Constants ───────────
const VEHICLE_CLASSES: VehicleClassKey[] = ['2W', 'CAR', '3W', 'BUS', 'HV', 'LMV', 'OTHER'];
const PIE_COLORS = ['#A3FF12', '#FF6B35', '#FBBF24', '#DC2626', '#22C55E', '#06B6D4', '#A855F7'];

const SEVERITY_BORDER: Record<string, string> = {
  warning: 'border-l-amber',
  danger: 'border-l-red',
  info: 'border-l-lime',
};

const SEVERITY_BADGE_BG: Record<string, string> = {
  warning: 'bg-amber/15 text-amber',
  danger: 'bg-red/15 text-red',
  info: 'bg-lime/15 text-lime',
};

// ─────────── Helpers ───────────
const fmt = (n: number) => n.toLocaleString('en-IN');

const isNightHour = (h: number) => h >= 21 || h <= 6;

const getBarColor = (count: number, max: number) => {
  const ratio = count / max;
  if (ratio > 0.6) return '#DC2626';
  if (ratio > 0.3) return '#FBBF24';
  return '#22C55E';
};

const getApprovalColor = (rate: number) => {
  if (rate >= 75) return '#22C55E';
  if (rate >= 50) return '#FBBF24';
  return '#DC2626';
};

// ─────────── Custom Tooltip ───────────
interface TooltipPayload {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  formatter?: (value: number, name: string | undefined, entry: TooltipPayload) => string;
}

const GlassTooltip = ({ active, payload, label, formatter }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 shadow-xl shadow-black/50">
      {label !== undefined && (
        <p className="text-text-secondary text-xs mb-1 font-mono">{label}</p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-platinum text-sm font-mono" style={{ color: entry.color }}>
          {formatter ? formatter(entry.value ?? 0, entry.name, entry) : `${entry.name}: ${fmt(entry.value ?? 0)}`}
        </p>
      ))}
    </div>
  );
};

// ─────────── KPI Card ───────────
interface KPICardProps {
  value: string;
  label: string;
  subtitle?: string;
  borderColor: string;
  index: number;
}

const KPICard = ({ value, label, subtitle, borderColor, index }: KPICardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 24, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={`glass-card p-5 border-l-[3px] ${borderColor} hud-corner flex flex-col gap-1.5 min-w-0`}
  >
    <span className="font-mono text-2xl lg:text-3xl font-bold text-platinum tracking-tight">
      {value}
    </span>
    <span className="text-text-secondary text-sm font-medium">{label}</span>
    {subtitle && (
      <span className="text-text-muted text-xs font-mono">{subtitle}</span>
    )}
  </motion.div>
);

// ─────────── Filter Chip ───────────
interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const Chip = ({ label, active, onClick }: ChipProps) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all duration-200 border cursor-pointer
      ${active
        ? 'bg-lime/15 text-lime border-lime/30 shadow-[0_0_8px_rgba(163,255,18,0.15)]'
        : 'bg-transparent text-text-muted border-border hover:text-text-secondary hover:border-border-bright'
      }`}
  >
    {label}
  </button>
);

// ─────────── Toggle Button ───────────
interface ToggleBtnProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const ToggleBtn = ({ label, active, onClick }: ToggleBtnProps) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer
      ${active
        ? 'bg-lime/12 text-lime'
        : 'text-text-muted hover:text-text-secondary'
      }`}
  >
    {label}
  </button>
);

// ─────────── Section Header ───────────
const SectionTitle = ({ title }: { title: string }) => (
  <h3 className="font-display text-sm font-semibold text-platinum tracking-wider uppercase mb-4 flex items-center gap-2">
    <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse-glow" />
    {title}
  </h3>
);

// ─────────── Donut Center Label ───────────
const DonutCenter = ({ total }: { total: number }) => (
  <text
    x="50%"
    y="50%"
    textAnchor="middle"
    dominantBaseline="central"
    className="fill-platinum"
  >
    <tspan x="50%" dy="-8" className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {fmt(total)}
    </tspan>
    <tspan x="50%" dy="20" className="text-[10px] fill-[#6B7280]">
      TOTAL
    </tspan>
  </text>
);

// ─────────── Custom Legend ───────────
interface LegendEntryProps {
  payload?: Array<{ value: string; color: string }>;
}

const CustomLegend = ({ payload }: LegendEntryProps) => {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-text-muted text-[10px] font-mono">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────── Insight Card ───────────
const InsightCard = ({ insight, index }: { insight: InsightEntry; index: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -16 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, delay: 0.6 + index * 0.08 }}
    className={`glass-card p-4 border-l-[3px] ${SEVERITY_BORDER[insight.severity]} flex flex-col gap-2`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg shrink-0">{insight.icon}</span>
        <span className="text-platinum text-sm font-semibold truncate">{insight.title}</span>
      </div>
      <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-mono font-bold ${SEVERITY_BADGE_BG[insight.severity]}`}>
        {insight.metric}
      </span>
    </div>
    <p className="text-text-muted text-xs leading-relaxed">{insight.description}</p>
    <span className="text-text-muted text-[10px] font-mono uppercase tracking-wider">
      {insight.metricLabel}
    </span>
  </motion.div>
);

// Custom bar shape for hourly chart with night opacity
interface HourlyBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  hour?: number;
  fill?: string;
}

const HourlyBar = (props: HourlyBarProps) => {
  const { x = 0, y = 0, width = 0, height = 0, hour = 0, fill } = props;
  const night = isNightHour(hour);
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      opacity={night ? 1 : 0.55}
      radius={[2, 2, 0, 0]}
    />
  );
};

// ─────────── Main Component ───────────
const CommandDashboard = () => {
  // Filter state
  const [activeClasses, setActiveClasses] = useState<Set<VehicleClassKey>>(new Set(VEHICLE_CLASSES));
  const [dayType, setDayType] = useState<DayType>('all');

  const toggleClass = useCallback((cls: VehicleClassKey) => {
    setActiveClasses(prev => {
      const next = new Set(prev);
      if (next.has(cls)) {
        if (next.size > 1) next.delete(cls);
      } else {
        next.add(cls);
      }
      return next;
    });
  }, []);

  // ─── Filtered Data ───
  const filteredVehicleData = useMemo(() => {
    return (vehicleData.byClass as VehicleClassEntry[]).filter(v =>
      activeClasses.has(v.vehicleClass as VehicleClassKey)
    );
  }, [activeClasses]);

  const filteredVehicleTotal = useMemo(
    () => filteredVehicleData.reduce((s, v) => s + v.count, 0),
    [filteredVehicleData]
  );

  const filteredStations = useMemo(() => {
    const stations = (stationData as StationEntry[]).map(s => {
      const filteredCount = Array.from(activeClasses).reduce(
        (sum, cls) => sum + (s.vehicleClass[cls] ?? 0), 0
      );
      let dayAdjusted = filteredCount;
      if (dayType === 'weekday') {
        const ratio = s.weekdayCount / (s.weekdayCount + s.weekendCount || 1);
        dayAdjusted = Math.round(filteredCount * ratio);
      } else if (dayType === 'weekend') {
        const ratio = s.weekendCount / (s.weekdayCount + s.weekendCount || 1);
        dayAdjusted = Math.round(filteredCount * ratio);
      }
      return { ...s, filteredViolations: dayAdjusted };
    });
    return stations.sort((a, b) => b.filteredViolations - a.filteredViolations).slice(0, 15);
  }, [activeClasses, dayType]);

  const filteredDayData = useMemo(() => {
    const days = dayData as DayEntry[];
    if (dayType === 'weekday') return days.filter(d => !d.isWeekend);
    if (dayType === 'weekend') return days.filter(d => d.isWeekend);
    return days;
  }, [dayType]);

  const filteredMonthlyData = useMemo(() => {
    const months = monthlyData as MonthEntry[];
    if (dayType === 'weekend') {
      return months.map(m => ({ ...m, count: m.weekendCount }));
    }
    if (dayType === 'weekday') {
      return months.map(m => ({ ...m, count: m.count - m.weekendCount }));
    }
    return months;
  }, [dayType]);

  const hourlyEntries = hourlyData.hourly as HourlyEntry[];
  const maxHourlyCount = Math.max(...hourlyEntries.map(h => h.count));

  // ─── KPIs ───
  const kpis: KPICardProps[] = [
    {
      value: fmt(summaryData.totalViolations),
      label: 'Total Violations',
      subtitle: `${summaryData.dateRange.min} → ${summaryData.dateRange.max}`,
      borderColor: 'border-l-lime',
      index: 0,
    },
    {
      value: `${summaryData.approvalRate}%`,
      label: 'Approval Rate',
      subtitle: `${fmt(summaryData.approvedCount)} approved · ${fmt(summaryData.rejectedCount)} rejected`,
      borderColor: summaryData.approvalRate < 75 ? 'border-l-amber' : 'border-l-green',
      index: 1,
    },
    {
      value: String(summaryData.totalStations),
      label: 'Active Stations',
      subtitle: `${summaryData.totalJunctions} junctions monitored`,
      borderColor: 'border-l-green',
      index: 2,
    },
    {
      value: `${String(summaryData.peakHour).padStart(2, '0')}:00`,
      label: 'Peak Hour',
      subtitle: 'Night enforcement window',
      borderColor: 'border-l-orange',
      index: 3,
    },
    {
      value: `${summaryData.highRiskRate}%`,
      label: 'High-Risk Rate',
      subtitle: `${fmt(summaryData.highRiskCount)} flagged violations`,
      borderColor: summaryData.highRiskRate > 5 ? 'border-l-red' : 'border-l-amber',
      index: 4,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Module Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-end gap-4"
      >
        <div>
          <span className="text-lime text-[10px] font-mono font-bold tracking-[0.3em] uppercase">
            Command Center
          </span>
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-platinum mt-0.5">
            Operations Dashboard
          </h2>
        </div>
        <div className="flex-1 border-b border-border mb-1.5" />
        <span className="text-text-muted text-xs font-mono shrink-0">
          {summaryData.dateRange.min} — {summaryData.dateRange.max}
        </span>
      </motion.div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="glass-panel p-4 flex flex-col md:flex-row md:items-center gap-4"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-text-muted text-xs font-mono uppercase tracking-wider shrink-0">Vehicle</span>
          {VEHICLE_CLASSES.map(cls => (
            <Chip key={cls} label={cls} active={activeClasses.has(cls)} onClick={() => toggleClass(cls)} />
          ))}
        </div>
        <div className="hidden md:block w-px h-6 bg-border" />
        <div className="flex items-center gap-1 bg-bg-secondary rounded-lg p-0.5">
          <span className="text-text-muted text-xs font-mono uppercase tracking-wider px-2 shrink-0">Day</span>
          {(['all', 'weekday', 'weekend'] as DayType[]).map(dt => (
            <ToggleBtn key={dt} label={dt.charAt(0).toUpperCase() + dt.slice(1)} active={dayType === dt} onClick={() => setDayType(dt)} />
          ))}
        </div>
      </motion.div>

      {/* ── Row 1: Monthly Trend + Vehicle Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Monthly Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-7 glass-panel p-5"
        >
          <SectionTitle title="Monthly Violation Trend" />
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={filteredMonthlyData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="limeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A3FF12" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#A3FF12" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,255,18,0.08)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6B7280', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                axisLine={{ stroke: 'rgba(163,255,18,0.08)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<GlassTooltip formatter={(v) => `${fmt(v)} violations`} />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#A3FF12"
                strokeWidth={2.5}
                fill="url(#limeGrad)"
                dot={{ fill: '#A3FF12', r: 4, strokeWidth: 0 }}
                activeDot={{ fill: '#A3FF12', r: 6, stroke: '#07070B', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Vehicle Distribution Donut */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-5 glass-panel p-5"
        >
          <SectionTitle title="Vehicle Class Distribution" />
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={filteredVehicleData}
                dataKey="count"
                nameKey="vehicleClass"
                cx="50%"
                cy="46%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                stroke="none"
              >
                {filteredVehicleData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[VEHICLE_CLASSES.indexOf(filteredVehicleData[i].vehicleClass as VehicleClassKey) % PIE_COLORS.length]} />
                ))}
              </Pie>
              <DonutCenter total={filteredVehicleTotal} />
              <Tooltip content={<GlassTooltip formatter={(v, name) => `${name}: ${fmt(v)} (${((v / filteredVehicleTotal) * 100).toFixed(1)}%)`} />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ── Row 2: Top Stations + Hourly Pattern ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top 15 Stations */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="lg:col-span-6 glass-panel p-5"
        >
          <SectionTitle title="Top 15 Police Stations" />
          <ResponsiveContainer width="100%" height={480}>
            <BarChart
              data={filteredStations}
              layout="vertical"
              margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
              barCategoryGap="18%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,255,18,0.08)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#6B7280', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={110}
                tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: "'Inter', sans-serif" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={
                <GlassTooltip
                  formatter={(v, _, entry) => {
                    const rate = (entry.payload as StationEntry | undefined)?.approvalRate;
                    return `${fmt(v)} violations · ${rate ?? 0}% approval`;
                  }}
                />
              } />
              <Bar dataKey="filteredViolations" radius={[0, 3, 3, 0]}>
                {filteredStations.map((s, i) => (
                  <Cell key={i} fill={getApprovalColor(s.approvalRate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 justify-center">
            {[
              { color: '#22C55E', label: '≥75% Approval' },
              { color: '#FBBF24', label: '50–75%' },
              { color: '#DC2626', label: '<50%' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                <span className="text-text-muted text-[10px] font-mono">{l.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Hourly Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="lg:col-span-6 glass-panel p-5"
        >
          <SectionTitle title="24-Hour Violation Pattern" />
          <ResponsiveContainer width="100%" height={480}>
            <BarChart data={hourlyEntries} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,255,18,0.08)" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fill: '#6B7280', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                axisLine={{ stroke: 'rgba(163,255,18,0.08)' }}
                tickLine={false}
                tickFormatter={(h: number) => `${String(h).padStart(2, '0')}h`}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                content={
                  <GlassTooltip
                    formatter={(v, _, entry) => {
                      const h = (entry.payload as HourlyEntry | undefined)?.hour ?? 0;
                      const zone = isNightHour(h) ? '🌙 Night' : '☀️ Day';
                      return `${zone} · ${fmt(v)} violations`;
                    }}
                  />
                }
              />
              <Bar
                dataKey="count"
                shape={(props: HourlyBarProps) => {
                  const hour = (props as HourlyBarProps & { hour?: number }).hour ?? 0;
                  const fill = getBarColor(hourlyEntries[hour]?.count ?? 0, maxHourlyCount);
                  return <HourlyBar {...props} hour={hour} fill={fill} />;
                }}
              >
                {hourlyEntries.map((entry) => (
                  <Cell
                    key={entry.hour}
                    fill={getBarColor(entry.count, maxHourlyCount)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#DC2626]" />
              <span className="text-text-muted text-[10px] font-mono">High (Night Peak)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#FBBF24]" />
              <span className="text-text-muted text-[10px] font-mono">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#22C55E] opacity-55" />
              <span className="text-text-muted text-[10px] font-mono">Low (Daytime)</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Row 3: AI Insights + Day-of-Week ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-6 glass-panel p-5"
        >
          <SectionTitle title="AI-Derived Insights" />
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {(insightsData as InsightEntry[]).slice(0, 6).map((insight, i) => (
              <InsightCard key={insight.id} insight={insight} index={i} />
            ))}
          </div>
        </motion.div>

        {/* Day-of-Week Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="lg:col-span-6 glass-panel p-5"
        >
          <SectionTitle title="Day-of-Week Distribution" />
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={filteredDayData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,255,18,0.08)" vertical={false} />
              <XAxis
                dataKey="shortDay"
                tick={{ fill: '#9CA3AF', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
                axisLine={{ stroke: 'rgba(163,255,18,0.08)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                content={
                  <GlassTooltip
                    formatter={(v, _, entry) => {
                      const d = entry.payload as DayEntry | undefined;
                      const type = d?.isWeekend ? '🏖️ Weekend' : '💼 Weekday';
                      return `${type} · ${fmt(v)} · ${d?.approvalRate ?? 0}% approval`;
                    }}
                  />
                }
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                {filteredDayData.map((d, i) => (
                  <Cell key={i} fill={d.isWeekend ? '#FBBF24' : '#A3FF12'} fillOpacity={d.isWeekend ? 0.85 : 0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-lime opacity-80" />
              <span className="text-text-muted text-[10px] font-mono">Weekday</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber opacity-85" />
              <span className="text-text-muted text-[10px] font-mono">Weekend</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CommandDashboard;
