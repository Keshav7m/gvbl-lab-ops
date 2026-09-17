"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardStats } from "@/lib/dashboard";

const VIOLET = "#5B2A86";
const VIOLET_LIGHT = "#A57BCF";
const BLUE = "#3F5BC4";
const GREEN = "#059669";
const GRID = "#E4DDEC";
const AXIS = { fontSize: 11, fill: "#6F6A7C" };

const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 12, boxShadow: "0 8px 24px -8px rgba(46,22,71,.25)" },
  cursor: { fill: "rgba(91,42,134,0.06)" },
};

function ChartPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
      <div className="mt-3 h-64">{children}</div>
    </div>
  );
}

export function DailySamplesChart({ data }: { data: DashboardStats["dailySeries"] }) {
  return (
    <ChartPanel title="Samples — last 14 days" subtitle="Summed across all reports for each day">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip {...tooltipStyle} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="received" name="Received" fill={VIOLET_LIGHT} radius={[3, 3, 0, 0]} />
          <Bar dataKey="processed" name="Processed" fill={VIOLET} radius={[3, 3, 0, 0]} />
          <Bar dataKey="completed" name="Completed / Dispatched" fill={GREEN} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}

export function MonthlyVolumeChart({ data }: { data: DashboardStats["monthlySeries"] }) {
  return (
    <ChartPanel title="Monthly volume — last 12 months" subtitle="Reports filed and samples processed">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip {...tooltipStyle} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="processed" name="Samples processed" stroke={VIOLET} strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="reports" name="Reports" stroke={BLUE} strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}

export function ActivityChart({ data }: { data: DashboardStats["activityFrequency"] }) {
  const rows = [...data].sort((a, b) => b.count - a.count);
  return (
    <ChartPanel title="Laboratory activities — last 30 days" subtitle="Number of reports in which each activity was ticked">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="label" tick={{ ...AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={150} />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey="count" name="Reports" fill={VIOLET} radius={[0, 3, 3, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
