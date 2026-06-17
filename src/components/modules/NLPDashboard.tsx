/// <reference types="vite/client" />
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

import summaryData from '@/data/real/summary.json';
import stationData from '@/data/real/by_station.json';
import vehicleData from '@/data/real/by_vehicle.json';
import hourData from '@/data/real/by_hour.json';
import dayData from '@/data/real/by_day.json';
import monthData from '@/data/real/by_month.json';
import violationTypeData from '@/data/real/by_violation_type.json';
import insightsData from '@/data/real/insights.json';

// ─── Types ──────────────────────────────────────────────────
interface QueryResult {
  type: 'bar' | 'horizontal-bar' | 'area' | 'pie' | 'insights';
  title: string;
  subtitle: string;
  data: any[];
  dataKey: string;
  nameKey: string;
  insight: string;
  colors?: string[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

// ─── Constants ──────────────────────────────────────────────
const CHART_COLORS = ['#A3FF12', '#FF6B35', '#FBBF24', '#22C55E', '#818CF8', '#F472B6', '#06B6D4'];
const LIME = '#A3FF12';
const ORANGE = '#FF6B35';
const AMBER = '#FBBF24';
const GREEN = '#22C55E';

const EXAMPLE_QUERIES = [
  'Top 10 stations by violations',
  'Violations by vehicle type',
  'Hourly violation pattern',
  'Weekday vs weekend comparison',
  'Monthly trend',
  'Station approval rates',
  'Which vehicles are high risk?',
  'Top violation types',
];

// ─── Custom Tooltip ─────────────────────────────────────────
const GlassTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel px-4 py-3 shadow-lg shadow-black/50">
      <p className="font-display text-xs text-text-secondary mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color || LIME }}
          />
          <span className="font-mono text-sm text-platinum">
            {typeof entry.value === 'number'
              ? entry.value.toLocaleString()
              : entry.value}
          </span>
          {entry.payload?.percentage !== undefined && (
            <span className="font-mono text-xs text-text-muted">
              ({entry.payload.percentage}%)
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Search Icon SVG ────────────────────────────────────────
const SearchIcon = () => (
  <svg
    className="w-5 h-5 text-text-muted"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const SparkleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
    />
  </svg>
);

// ─── Query Engine ───────────────────────────────────────────
function parseQueryLocal(query: string): QueryResult {
  const q = query.toLowerCase().trim();

  // 1. SPECIFIC POLICE STATION PROFILES
  // Match police station names from Bangalore dataset
  const stationMatch = (stationData as any[]).find(s => 
    q.includes(s.name.toLowerCase()) || 
    (s.name.toLowerCase() === 'city market' && (q.includes('city market') || q.includes('kr market'))) ||
    (s.name.toLowerCase() === 'hal old airport' && (q.includes('hal') || q.includes('airport'))) ||
    (s.name.toLowerCase() === 'electronic city' && (q.includes('electronic') || q.includes('e-city'))) ||
    (s.name.toLowerCase() === 'hsr layout' && q.includes('hsr')) ||
    (s.name.toLowerCase() === 'yelahanka' && q.includes('yelahanka')) ||
    (s.name.toLowerCase() === 'whitefield' && q.includes('whitefield')) ||
    (s.name.toLowerCase() === 'indiranagar' && q.includes('indira')) ||
    (s.name.toLowerCase() === 'malleshwaram' && q.includes('malleswaram'))
  );

  if (stationMatch) {
    const vClass = stationMatch.vehicleClass;
    const chartData = Object.entries(vClass).map(([className, count]) => ({
      name: className === '2W' ? 'Two-Wheelers (2W)' : className === 'CAR' ? 'Cars (CAR)' : className === '3W' ? 'Autos (3W)' : className === 'BUS' ? 'Buses (BUS)' : className === 'HV' ? 'Heavy Vehicles (HV)' : className,
      count: count as number,
      percentage: (((count as number) / stationMatch.totalViolations) * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);

    return {
      type: 'horizontal-bar',
      title: `${stationMatch.name} Police Station Profile`,
      subtitle: `Detail summary of violations at ${stationMatch.name} · Approval Rate: ${stationMatch.approvalRate}%`,
      data: chartData,
      dataKey: 'count',
      nameKey: 'name',
      insight: `⚡ Station Profile: ${stationMatch.name} handles a total of ${stationMatch.totalViolations.toLocaleString()} violations. Case approval rate is ${stationMatch.approvalRate}%, meaning ${(100 - stationMatch.approvalRate).toFixed(1)}% of issued citations are rejected. The dominant offender vehicle type is ${chartData[0].name} (${chartData[0].percentage}%).`,
    };
  }

  // 2. JUNCTIONS & INTERSECTIONS
  if (q.includes('junction') || q.includes('cross') || q.includes('intersection') || q.includes('road')) {
    const topJunctions = [
      { name: 'Safina Plaza', count: 15449, percentage: 5.3 },
      { name: 'KR Market Junction', count: 11623, percentage: 4.0 },
      { name: 'Elite Junction', count: 11489, percentage: 3.9 },
      { name: 'Silk Board Junction', count: 9847, percentage: 3.4 },
      { name: 'Hebbal Flyover', count: 8298, percentage: 2.8 },
      { name: 'Majestic Crossing', count: 7489, percentage: 2.6 },
      { name: 'Malleshwaram 8th Cross', count: 6841, percentage: 2.3 },
    ];
    return {
      type: 'bar',
      title: 'Top Congested Junctions & Roads',
      subtitle: 'Nodes with highest recorded traffic and parking violations',
      data: topJunctions,
      dataKey: 'count',
      nameKey: 'name',
      insight: `⚡ Junction Analysis: Safina Plaza is the most critical junction node with 15,449 offenses, representing 5.3% of total citywide violations. Targeted patrols at these top 7 intersections could mitigate 24.3% of total city center violations.`,
    };
  }

  // 3. SPECIFIC VEHICLE CLASS PROFILES
  const vehicleClasses = [
    { key: '2w', synonyms: ['2w', 'scooter', 'motorcycle', 'bike', '2-wheeler', 'two-wheeler', 'two wheeler'] },
    { key: 'car', synonyms: ['car', 'suv', 'sedan'] },
    { key: '3w', synonyms: ['3w', 'auto', 'rickshaw', 'three-wheeler', 'three wheeler'] },
    { key: 'bus', synonyms: ['bus', 'buses'] },
    { key: 'hv', synonyms: ['hv', 'truck', 'heavy', 'lorry'] }
  ];
  const matchedVehicle = vehicleClasses.find(vc => vc.synonyms.some(s => q.includes(s)));

  if (matchedVehicle) {
    const classInfo = (vehicleData as any).byClass.find((v: any) => v.vehicleClass.toLowerCase() === matchedVehicle.key);
    if (classInfo) {
      // Find top stations for this vehicle class
      const topStationsForClass = [...(stationData as any[])]
        .map(s => ({
          name: s.name,
          count: s.vehicleClass[classInfo.vehicleClass] || 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        type: 'bar',
        title: `Vehicle Class Intel: ${classInfo.vehicleClass}`,
        subtitle: `Analyzing ${classInfo.count.toLocaleString()} cases (${classInfo.percentage}% of citywide volume) · Approval: ${classInfo.approvalRate}%`,
        data: topStationsForClass,
        dataKey: 'count',
        nameKey: 'name',
        insight: `⚡ Vehicle Breakdown: ${classInfo.vehicleClass} class vehicles contribute ${classInfo.percentage}% of all traffic violations in Bangalore. ${topStationsForClass[0].name} records the highest volume of ${classInfo.vehicleClass} offenses with ${topStationsForClass[0].count.toLocaleString()} citations.`,
      };
    }
  }

  // 4. APPROVAL / REJECTION RATES (Lower vs Higher)
  if (q.includes('approval') || q.includes('reject') || q.includes('approve') || q.includes('rejection') || q.includes('valid') || q.includes('status')) {
    const sorted = [...(stationData as any[])].sort((a, b) => a.approvalRate - b.approvalRate);
    const top15 = sorted.slice(0, 15);
    const lowest = top15[0];
    const highest = sorted[sorted.length - 1];

    return {
      type: 'horizontal-bar',
      title: 'Station Approval Rates (Lowest First)',
      subtitle: 'Stations ranked by case approval rate — lower means higher citation rejection',
      data: top15.map((s: any) => ({
        name: s.name,
        approvalRate: s.approvalRate,
        rejectedCount: s.rejectedCount,
        percentage: s.approvalRate,
      })),
      dataKey: 'approvalRate',
      nameKey: 'name',
      colors: top15.map((s: any) =>
        s.approvalRate < 63 ? '#DC2626' : s.approvalRate < 68 ? ORANGE : AMBER
      ),
      insight: `⚡ Approval Analysis: ${lowest.name} police station has the lowest case validation approval rate at ${lowest.approvalRate}% (a rejection rate of ${(100 - lowest.approvalRate).toFixed(1)}%). By contrast, ${highest.name} station has the highest validation rate at ${highest.approvalRate}%.`,
    };
  }

  // 5. HIGH RISK ANALYSIS
  if (q.includes('risk') || q.includes('danger') || q.includes('critical') || q.includes('hazard')) {
    const sorted = [...(stationData as any[])]
      .map((s: any) => ({
        name: s.name,
        highRisk: s.highRisk,
        total: s.totalViolations,
        riskRate: parseFloat(((s.highRisk / s.totalViolations) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.riskRate - a.riskRate)
      .slice(0, 15);

    const topRisk = sorted[0];
    const vehicleRisk = (vehicleData as any).byClass
      .map((v: any) => ({
        name: v.vehicleClass,
        riskRate: parseFloat(((v.highRisk / v.count) * 100).toFixed(1)),
      }))
      .sort((a: any, b: any) => b.riskRate - a.riskRate);

    return {
      type: 'horizontal-bar',
      title: 'High Risk Analysis by Station',
      subtitle: 'Stations ranked by percentage of high-risk violations',
      data: sorted,
      dataKey: 'riskRate',
      nameKey: 'name',
      colors: sorted.map((s) =>
        s.riskRate > 20 ? '#DC2626' : s.riskRate > 10 ? ORANGE : AMBER
      ),
      insight: `⚡ Risk Assessment: ${topRisk.name} is the highest-risk police station area with a risk rate of ${topRisk.riskRate}% (${topRisk.highRisk.toLocaleString()} high-risk violations). ${vehicleRisk[0].name} vehicles are the highest-risk class citywide at ${vehicleRisk[0].riskRate}%.`,
    };
  }

  // 6. GENERAL ENFORCEMENT SUMMARY / TOTAL COUNTS
  if (
    q.includes('how many') ||
    q.includes('total') ||
    q.includes('count') ||
    q.includes('summary') ||
    q.includes('overall') ||
    q.includes('overview') ||
    q.includes('statistic') ||
    q.includes('number of')
  ) {
    const keyKPIs = [
      { name: 'Total Violations', count: (summaryData as any).totalViolations, percentage: 100 },
      { name: 'Approved Cases', count: (summaryData as any).approvedCount, percentage: (summaryData as any).approvalRate },
      { name: 'Rejected Cases', count: (summaryData as any).rejectedCount, percentage: parseFloat((100 - (summaryData as any).approvalRate).toFixed(1)) },
      { name: 'High Risk Cases', count: Math.round((summaryData as any).totalViolations * (summaryData as any).highRiskRate / 100), percentage: (summaryData as any).highRiskRate },
    ];
    return {
      type: 'horizontal-bar',
      title: 'Enforcement Summary Overview',
      subtitle: 'High-level key performance indicators across Bengaluru Command Center',
      data: keyKPIs,
      dataKey: 'count',
      nameKey: 'name',
      insight: `⚡ Overall Summary: Bangalore Traffic Command has logged ${(summaryData as any).totalViolations.toLocaleString()} violations. Overall case approval stands at ${(summaryData as any).approvalRate}%, with ${(summaryData as any).highRiskRate}% classified as high risk (e.g. wrong-way driving, main-road blockages).`,
    };
  }

  // 7. SPECIFIC VIOLATION TYPES
  if (
    (q.includes('violation') && (q.includes('type') || q.includes('kind') || q.includes('category') || q.includes('class') || q.includes('due to') || q.includes('reason') || q.includes('why') || q.includes('cause'))) ||
    q.includes('parking') ||
    q.includes('helmet') ||
    q.includes('signal') ||
    q.includes('speed') ||
    q.includes('jumping') ||
    q.includes('license') ||
    q.includes('plate')
  ) {
    const data = (violationTypeData as any[]).slice(0, 12);
    const top2 = data.slice(0, 2);
    const top2Pct = (top2[0].percentage + top2[1].percentage).toFixed(1);

    return {
      type: 'horizontal-bar',
      title: 'Top Violation Types',
      subtitle: 'Most frequently recorded violation categories',
      data: data.map((v: any) => ({
        name: v.type,
        count: v.count,
        percentage: v.percentage,
      })),
      dataKey: 'count',
      nameKey: 'name',
      insight: `⚡ Violation Types: "${top2[0].type}" and "${top2[1].type}" make up ${top2Pct}% of all city cases. Non-parking issues (like signal jumping) are underrepresented, showing enforcement is heavily parking-oriented.`,
    };
  }

  // 8. TIME / HOURLY PATTERNS
  if (q.includes('hour') || q.includes('time') || q.includes('when') || q.includes('night') || q.includes('day') || q.includes('morning') || q.includes('evening') || q.includes('afternoon') || q.includes('busy')) {
    const data = (hourData as any).hourly;
    const peakHour = data.reduce((max: any, h: any) => (h.count > max.count ? h : max), data[0]);
    const nightViolations = data
      .filter((h: any) => h.hour >= 21 || h.hour <= 6)
      .reduce((sum: number, h: any) => sum + h.count, 0);
    const nightPct = ((nightViolations / (summaryData as any).totalViolations) * 100).toFixed(1);

    return {
      type: 'area',
      title: 'Hourly Violation Distribution',
      subtitle: '24-hour enforcement activity pattern',
      data: data.map((h: any) => ({
        name: `${h.hour.toString().padStart(2, '0')}:00`,
        count: h.count,
        percentage: h.percentage,
        approvalRate: h.approvalRate,
      })),
      dataKey: 'count',
      nameKey: 'name',
      insight: `⚡ Temporal Peak: Maximum enforcement occurs at ${peakHour.hour.toString().padStart(2, '0')}:00 with ${peakHour.count.toLocaleString()} violations (${peakHour.percentage}%). Night hours (9PM–6AM) account for ${nightPct}% of all violations.`,
    };
  }

  // 9. WEEKDAY VS WEEKEND / DAYS OF WEEK
  if (q.includes('week') || q.includes('day') || q.includes('sunday') || q.includes('monday') || q.includes('saturday') || q.includes('weekend') || q.includes('weekday')) {
    const data = dayData as any[];
    const highest = data.reduce((max, d) => (d.count > max.count ? d : max), data[0]);
    const lowest = data.reduce((min, d) => (d.count < min.count ? d : min), data[0]);

    return {
      type: 'bar',
      title: 'Day of Week Violation Pattern',
      subtitle: 'Comparing weekday vs weekend enforcement activity',
      data: data.map((d: any) => ({
        name: d.shortDay,
        count: d.count,
        percentage: d.percentage,
        approvalRate: d.approvalRate,
        fill: d.isWeekend ? ORANGE : LIME,
      })),
      dataKey: 'count',
      nameKey: 'name',
      colors: data.map((d: any) => (d.isWeekend ? ORANGE : LIME)),
      insight: `⚡ Weekly Heat: ${highest.day} records the most violations (${highest.count.toLocaleString()}) while ${lowest.day} has the least (${lowest.count.toLocaleString()}). Weekend days average higher than weekdays.`,
    };
  }

  // 10. MONTHLY TRENDS & HISTORY
  if (q.includes('month') || q.includes('trend') || q.includes('history') || q.includes('timeline') || q.includes('growth')) {
    const data = monthData as any[];
    const peak = data.reduce((max, m) => (m.count > max.count ? m : max), data[0]);
    return {
      type: 'area',
      title: 'Monthly Violation Trend',
      subtitle: `${data[0].label} — ${data[data.length - 1].label}`,
      data: data.map((m: any) => ({
        name: m.label,
        count: m.count,
        highRisk: m.highRisk,
      })),
      dataKey: 'count',
      nameKey: 'name',
      insight: `⚡ Monthly Trend: ${peak.label} was the peak month with ${peak.count.toLocaleString()} violations. High-risk incidents tracked at ${((peak.highRisk / peak.count) * 100).toFixed(1)}% of peak month volume.`,
    };
  }

  // 11. TOP POLICE STATIONS (FALLBACK FOR ANY STATION QUERIES)
  if (q.includes('station')) {
    const sorted = [...(stationData as any[])].sort(
      (a, b) => b.totalViolations - a.totalViolations
    );
    const top = sorted.slice(0, 15);
    const topStation = top[0];
    const avg = (summaryData as any).totalViolations / (summaryData as any).totalStations;
    const ratio = (topStation.totalViolations / avg).toFixed(1);

    return {
      type: 'horizontal-bar',
      title: 'Top 15 Stations by Violations',
      subtitle: `Ranked by total violations across ${(summaryData as any).totalStations} stations`,
      data: top.map((s: any) => ({
        name: s.name,
        violations: s.totalViolations,
        percentage: ((s.totalViolations / (summaryData as any).totalViolations) * 100).toFixed(1),
      })),
      dataKey: 'violations',
      nameKey: 'name',
      insight: `⚡ Station Volume: ${topStation.name} handles ${((topStation.totalViolations / (summaryData as any).totalViolations) * 100).toFixed(1)}% of all citywide violations — ${ratio}× the average station load.`,
    };
  }

  // 12. DEFAULT FALLBACK BRIEF
  return {
    type: 'insights',
    title: 'GridLock Intelligence Brief',
    subtitle: 'Key patterns and anomalies detected in enforcement data',
    data: insightsData as any[],
    dataKey: '',
    nameKey: '',
    insight: `Analyzing ${(summaryData as any).totalViolations.toLocaleString()} violations across ${(summaryData as any).totalStations} stations. Ask about stations (e.g., "Upparpet"), vehicle types ("scooters"), hours, risk, or trends.`,
  };
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function parseQueryAI(query: string): Promise<QueryResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set in .env file');
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const promptContext = `
You are GridLock AI, a smart city traffic analyst AI.
You have access to the following pre-aggregated traffic violations dataset for Bangalore (covering Nov 2023 - Apr 2024 with 292,649 records):

1. High-Level Summary (summaryData):
${JSON.stringify(summaryData)}

2. Station-Level Aggregation (stationData):
${JSON.stringify(stationData)}

3. Vehicle Class Aggregation (vehicleData):
${JSON.stringify(vehicleData)}

4. Hourly Pattern (hourData):
${JSON.stringify(hourData)}

5. Day-of-Week Aggregation (dayData):
${JSON.stringify(dayData)}

6. Monthly Aggregation (monthData):
${JSON.stringify(monthData)}

7. Violation Type Aggregation (violationTypeData):
${JSON.stringify(violationTypeData)}

8. Pre-computed Insights (insightsData):
${JSON.stringify(insightsData)}

Given the user's natural language question: "${query}"

You MUST analyze the question and return a JSON object that matches this TypeScript schema:
{
  "type": "bar" | "horizontal-bar" | "area" | "pie" | "insights",
  "title": string,
  "subtitle": string,
  "data": any[],
  "dataKey": string,
  "nameKey": string,
  "insight": string,
  "colors": string[]
}

Guidelines for data format:
- For bar/horizontal-bar/area charts: The "data" array should contain 5 to 15 items maximum for readability. The items should be objects, e.g. { name: 'Upparpet', count: 33976, percentage: 11.6, approvalRate: 76.3 }.
- For pie charts: The "data" array should contain a small list of items representing shares (e.g., vehicle classes), containing keys for name and value.
- For insights: If the query is conversational and does not map to a chart, or if the user is asking for a list of insights, return type: "insights" with data being an array of 4-5 items matching the schema of insightsData.
- If the query is about a specific police station (e.g., Upparpet, HSR, Silk Board, etc.), filter and return data for that station (e.g., its vehicle composition or hourly distribution).
- Ensure your response is strictly valid JSON and nothing else. Do not wrap in markdown code blocks like \`\`\`json.
`;

  const result = await model.generateContent(promptContext);
  const text = result.response.text();
  
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.substring(7);
  }
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.substring(3);
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }
  cleanText = cleanText.trim();
  return JSON.parse(cleanText) as QueryResult;
}

// ─── Insight Card ───────────────────────────────────────────
const InsightCallout = ({ text }: { text: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.5, duration: 0.4 }}
    className="glass-card px-5 py-4 mt-6 flex items-start gap-3"
  >
    <span className="text-xl mt-0.5 shrink-0">⚡</span>
    <div>
      <span className="font-display text-xs uppercase tracking-widest text-lime mb-1 block">
        Insight
      </span>
      <p className="text-sm text-text-secondary leading-relaxed">{text}</p>
    </div>
  </motion.div>
);

// ─── Chart Renderers ────────────────────────────────────────
const HorizontalBarResult = ({ result }: { result: QueryResult }) => {
  const maxVal = Math.max(...result.data.map((d: any) => d[result.dataKey]));

  return (
    <div className="space-y-2">
      {result.data.map((item: any, i: number) => {
        const value = item[result.dataKey];
        const width = (value / maxVal) * 100;
        const color = result.colors?.[i] || CHART_COLORS[i % CHART_COLORS.length];

        return (
          <motion.div
            key={item[result.nameKey]}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.35 }}
            className="group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-secondary w-40 truncate font-mono shrink-0 text-right">
                {item[result.nameKey]}
              </span>
              <div className="flex-1 h-7 bg-bg-secondary rounded overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ delay: i * 0.04 + 0.15, duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded relative"
                  style={{
                    background: `linear-gradient(90deg, ${color}22, ${color}88)`,
                    borderRight: `2px solid ${color}`,
                  }}
                />
                <span className="absolute inset-y-0 right-2 flex items-center font-mono text-xs text-platinum">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                  {item.percentage !== undefined && (
                    <span className="text-text-muted ml-1">({item.percentage}%)</span>
                  )}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const RechartsBarResult = ({ result }: { result: QueryResult }) => (
  <ResponsiveContainer width="100%" height={400}>
    <BarChart data={result.data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,255,18,0.06)" />
      <XAxis
        dataKey={result.nameKey}
        tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'JetBrains Mono' }}
        axisLine={{ stroke: 'rgba(163,255,18,0.12)' }}
        tickLine={false}
      />
      <YAxis
        tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
        axisLine={false}
        tickLine={false}
        tickFormatter={(v: number) =>
          v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()
        }
      />
      <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(163,255,18,0.04)' }} />
      <Bar dataKey={result.dataKey} radius={[4, 4, 0, 0]}>
        {result.data.map((_: any, i: number) => (
          <Cell
            key={i}
            fill={result.colors?.[i] || CHART_COLORS[i % CHART_COLORS.length]}
            fillOpacity={0.85}
          />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

const RechartsAreaResult = ({ result }: { result: QueryResult }) => (
  <ResponsiveContainer width="100%" height={400}>
    <AreaChart data={result.data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
      <defs>
        <linearGradient id="areaGradientLime" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={LIME} stopOpacity={0.35} />
          <stop offset="100%" stopColor={LIME} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,255,18,0.06)" />
      <XAxis
        dataKey={result.nameKey}
        tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'JetBrains Mono' }}
        axisLine={{ stroke: 'rgba(163,255,18,0.12)' }}
        tickLine={false}
        interval="preserveStartEnd"
      />
      <YAxis
        tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
        axisLine={false}
        tickLine={false}
        tickFormatter={(v: number) =>
          v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()
        }
      />
      <Tooltip content={<GlassTooltip />} />
      <Area
        type="monotone"
        dataKey={result.dataKey}
        stroke={LIME}
        strokeWidth={2}
        fill="url(#areaGradientLime)"
        dot={false}
        activeDot={{
          r: 5,
          fill: LIME,
          stroke: '#07070B',
          strokeWidth: 2,
        }}
      />
    </AreaChart>
  </ResponsiveContainer>
);

const InsightsGrid = ({ data }: { data: any[] }) => {
  const severityColors: Record<string, string> = {
    danger: 'border-red/30 bg-red-dim',
    warning: 'border-orange/30 bg-orange-dim',
    info: 'border-lime/20 bg-lime-dim',
  };

  const severityAccent: Record<string, string> = {
    danger: 'text-red',
    warning: 'text-orange',
    info: 'text-lime',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map((item: any, i: number) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className={`glass-card p-5 ${severityColors[item.severity] || 'border-border'} hud-corner`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{item.icon}</span>
              <h4 className="font-display text-sm font-semibold text-platinum">
                {item.title}
              </h4>
            </div>
            <div className="text-right">
              <span
                className={`font-mono text-lg font-bold ${severityAccent[item.severity] || 'text-lime'}`}
              >
                {item.metric}
              </span>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">
                {item.metricLabel}
              </p>
            </div>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">{item.description}</p>
        </motion.div>
      ))}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────
const NLPDashboard = () => {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const executeQuery = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSubmittedQuery(q);
    setIsProcessing(true);
    setResult(null);

    try {
      const parsed = await parseQueryAI(q);
      setResult(parsed);
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local query parser:', err);
      const parsed = parseQueryLocal(q);
      setResult(parsed);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeQuery(query);
  };

  const handleChipClick = (chipQuery: string) => {
    setQuery(chipQuery);
    executeQuery(chipQuery);
  };

  // Render the appropriate chart based on result type
  const renderResult = () => {
    if (!result) return null;

    return (
      <motion.div
        key={submittedQuery}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mt-8"
      >
        {/* Result Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse-glow" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-lime">
              Query Result
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-platinum">{result.title}</h2>
          <p className="text-sm text-text-muted mt-1">{result.subtitle}</p>
        </div>

        {/* Chart Area */}
        <div className="glass-panel p-6 hud-corner">
          {result.type === 'horizontal-bar' && <HorizontalBarResult result={result} />}
          {result.type === 'bar' && <RechartsBarResult result={result} />}
          {result.type === 'area' && <RechartsAreaResult result={result} />}
          {result.type === 'insights' && <InsightsGrid data={result.data} />}
        </div>

        {/* Insight Callout */}
        <InsightCallout text={result.insight} />
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen w-full px-4 py-8 md:px-8 lg:px-12">
      {/* Module Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 text-center"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-muted">
          Module 00
        </span>
        <h1 className="font-display text-4xl md:text-5xl font-bold mt-1">
          <span className="text-gradient-lime">Ask GridLock</span>
        </h1>
        <p className="text-text-secondary text-sm mt-2 max-w-xl mx-auto">
          Natural language intelligence interface. Query{' '}
          <span className="font-mono text-lime">
            {(summaryData as any).totalViolations.toLocaleString()}
          </span>{' '}
          violations across{' '}
          <span className="font-mono text-lime">{(summaryData as any).totalStations}</span> stations.
        </p>
      </motion.div>

      {/* Hero Search Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-3xl mx-auto mb-6"
      >
        <form onSubmit={handleSubmit} className="relative group">
          <div
            className={`glass-panel flex items-center px-5 py-4 transition-all duration-300 ${
              isFocused
                ? 'border-lime/40 shadow-[0_0_30px_rgba(163,255,18,0.12)]'
                : 'hover:border-lime/20'
            }`}
          >
            <div className="mr-3">
              {isProcessing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <SparkleIcon />
                </motion.div>
              ) : (
                <SearchIcon />
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder='Ask GridLock anything... e.g., "Which station has highest violations?"'
              className="flex-1 bg-transparent text-platinum text-base font-sans placeholder-text-muted outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="ml-2 text-text-muted hover:text-platinum transition-colors text-sm"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="ml-3 px-4 py-1.5 rounded-md bg-lime/10 border border-lime/20 text-lime text-xs font-mono uppercase tracking-wider hover:bg-lime/20 transition-all"
            >
              Query
            </button>
          </div>
          {/* Focus glow line */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[1px] bg-gradient-to-r from-transparent via-lime to-transparent"
            initial={{ width: 0 }}
            animate={{ width: isFocused ? '80%' : '0%' }}
            transition={{ duration: 0.4 }}
          />
        </form>
      </motion.div>

      {/* Example Query Chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="max-w-3xl mx-auto mb-10"
      >
        <div className="flex flex-wrap gap-2 justify-center">
          {EXAMPLE_QUERIES.map((eq, i) => (
            <motion.button
              key={eq}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 + i * 0.05, duration: 0.3 }}
              onClick={() => handleChipClick(eq)}
              className="glass-card px-3.5 py-2 text-xs text-text-secondary hover:text-lime hover:border-lime/30 transition-all duration-200 cursor-pointer font-mono whitespace-nowrap"
            >
              {eq}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Processing State */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-3xl mx-auto text-center py-12"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="inline-block mb-4"
            >
              <span className="text-lime text-3xl">⚡</span>
            </motion.div>
            <p className="font-mono text-sm text-text-muted">
              Processing query<span className="animate-pulse-glow">...</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">{!isProcessing && renderResult()}</AnimatePresence>
      </div>

      {/* Default state — show when no query */}
      {!result && !isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="max-w-3xl mx-auto text-center py-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lime/5 border border-lime/10 mb-6">
            <SparkleIcon />
          </div>
          <h3 className="font-display text-lg text-text-secondary mb-2">
            Ready to analyze
          </h3>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Type a question or click an example query above to explore enforcement data across
            Bengaluru's traffic network.
          </p>

          {/* Quick stats */}
          <div className="flex items-center justify-center gap-8 mt-8">
            {[
              {
                value: (summaryData as any).totalViolations.toLocaleString(),
                label: 'Violations',
              },
              { value: (summaryData as any).totalStations, label: 'Stations' },
              { value: (summaryData as any).uniqueVehicles.toLocaleString(), label: 'Vehicles' },
              { value: `${(summaryData as any).approvalRate}%`, label: 'Approval' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="text-center"
              >
                <p className="font-mono text-xl font-bold text-lime">{stat.value}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mt-1">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default NLPDashboard;
