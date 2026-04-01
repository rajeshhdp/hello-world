"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface MetricRow {
  date: string;
  avg_accuracy: number | null;
  avg_fluency: number | null;
  exercises_count: number;
}

interface ProgressChartsProps {
  metrics: MetricRow[];
}

export default function ProgressCharts({ metrics }: ProgressChartsProps) {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 text-center">
        <p className="text-slate-500 text-sm">
          Complete some exercises to see your progress charts.
        </p>
      </div>
    );
  }

  const chartData = metrics.map((m) => ({
    date: new Date(m.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    accuracy: m.avg_accuracy !== null ? Math.round(m.avg_accuracy) : null,
    fluency: m.avg_fluency !== null ? Math.round(m.avg_fluency) : null,
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
        <p className="text-sm font-medium text-slate-300 mb-4">
          Accuracy & Fluency (last 30 days)
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ left: -20, right: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e2e8f0",
              }}
              labelStyle={{ color: "#94a3b8" }}
            />
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ fill: "#6366f1", r: 3 }}
              connectNulls
              name="Accuracy %"
            />
            <Line
              type="monotone"
              dataKey="fluency"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 3 }}
              connectNulls
              name="Fluency %"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-3 h-0.5 bg-indigo-500 inline-block rounded" />
            Accuracy
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />
            Fluency
          </span>
        </div>
      </div>
    </div>
  );
}
