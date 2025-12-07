import { useState, useEffect } from "react";
import { type Worker, getAllSupervisors } from "@/lib/firebase";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsChartsProps {
  workers: Worker[];
  startDate?: string;
  endDate?: string;
}

export default function AnalyticsCharts({ workers, startDate, endDate }: AnalyticsChartsProps) {
  const [supervisorMap, setSupervisorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    const fetchSupervisors = async () => {
      try {
        const supervisors = await getAllSupervisors();
        if (isMounted) {
          const map: Record<string, string> = {};
          supervisors.forEach((supervisor) => {
            map[supervisor.id] = supervisor.nom;
          });
          setSupervisorMap(map);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error loading supervisors:", error);
        }
      }
    };

    fetchSupervisors();

    return () => {
      isMounted = false;
    };
  }, []);
  // Calculate average age
  const averageAge =
    workers.length > 0
      ? Math.round(
          workers.reduce((sum, w) => {
            if (w.dateNaissance) {
              const birthYear = parseInt(w.dateNaissance.split("-")[0]);
              const currentYear = new Date().getFullYear();
              return sum + (currentYear - birthYear);
            }
            return sum;
          }, 0) / workers.length,
        )
      : 0;

  // Calculate turnover rate
  const turnoverRate =
    workers.length > 0 && startDate && endDate
      ? ((workers.filter((w) => {
          if (!w.dateSortie) return false;
          const exitDate = new Date(w.dateSortie);
          const filterStart = new Date(startDate);
          const filterEnd = new Date(endDate);
          return exitDate >= filterStart && exitDate <= filterEnd;
        }).length / workers.length) * 100).toFixed(2)
      : "0.00";

  // Calculate supervisor distribution
  const supervisorData: Record<string, number> = {};
  workers.forEach((worker) => {
    const supervisorId = worker.supervisorId || "Unassigned";
    supervisorData[supervisorId] = (supervisorData[supervisorId] || 0) + 1;
  });

  const supervisorChartData = Object.entries(supervisorData)
    .map(([id, count]) => ({
      name: id === "Unassigned" ? "Unassigned" : supervisorMap[id] || id,
      value: count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 supervisors

  // Calculate gender distribution
  const genderData: Record<string, number> = {};
  workers.forEach((worker) => {
    const gender = worker.sexe || "Unknown";
    genderData[gender] = (genderData[gender] || 0) + 1;
  });

  const genderChartData = Object.entries(genderData).map(([gender, count]) => ({
    name:
      gender.toLowerCase() === "homme"
        ? "Male"
        : gender.toLowerCase() === "femme"
          ? "Female"
          : "Unknown",
    value: count,
  }));

  // Calculate age distribution
  const ageGroups: Record<string, number> = {
    "<20": 0,
    "20-29": 0,
    "30-39": 0,
    "40-49": 0,
    ">50": 0,
  };

  workers.forEach((worker) => {
    if (worker.dateNaissance) {
      const birthYear = parseInt(worker.dateNaissance.split("-")[0]);
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;

      if (age < 20) ageGroups["<20"]++;
      else if (age >= 20 && age < 30) ageGroups["20-29"]++;
      else if (age >= 30 && age < 40) ageGroups["30-39"]++;
      else if (age >= 40 && age < 50) ageGroups["40-49"]++;
      else ageGroups[">50"]++;
    }
  });

  const ageChartData = Object.entries(ageGroups).map(([range, count]) => ({
    name: range,
    value: count,
  }));

  // Calculate top 10 exit reasons
  const exitReasonsData: Record<string, number> = {};
  workers.forEach((worker) => {
    if (worker.dateSortie && worker.motif) {
      const reason = worker.motif || "Not specified";
      exitReasonsData[reason] = (exitReasonsData[reason] || 0) + 1;
    }
  });

  const topExitReasons = Object.entries(exitReasonsData)
    .map(([reason, count]) => ({
      reason,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const COLORS = [
    "#2563eb",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#6366f1",
    "#84cc16",
  ];

  const GENDER_COLORS = ["#3b82f6", "#ec4899", "#9ca3af"];
  const AGE_COLORS = ["#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981"];

  return (
    <div className="space-y-8">
      {/* Average Age Summary */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-card">
        <h3 className="text-xl font-semibold text-primary mb-4">
          Workforce Statistics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Average Age</p>
            <p className="text-4xl font-bold text-blue-600">{averageAge}</p>
            <p className="text-xs text-muted-foreground mt-2">
              years old ({workers.length} workers)
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Total Workers</p>
            <p className="text-4xl font-bold text-green-600">
              {workers.length}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Active in selected filters
            </p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Turnover Rate</p>
            <p className="text-4xl font-bold text-orange-600">{turnoverRate}%</p>
            <p className="text-xs text-muted-foreground mt-2">
              Departures in selected period
            </p>
          </div>
        </div>
      </div>

      {/* Supervisor Distribution */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-card">
        <h3 className="text-xl font-semibold text-primary mb-4">
          Workers per Supervisor (Top 10)
        </h3>
        <div className="w-full h-80">
          {supervisorChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supervisorChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" name="Workers" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No supervisor data available
            </div>
          )}
        </div>
      </div>

      {/* Gender Distribution */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-card">
        <h3 className="text-xl font-semibold text-primary mb-4">
          Gender Distribution
        </h3>
        <div className="w-full h-80">
          {genderChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={GENDER_COLORS[index % GENDER_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No gender data available
            </div>
          )}
        </div>
      </div>

      {/* Age Distribution */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-card">
        <h3 className="text-xl font-semibold text-primary mb-4">
          Workers by Age Group
        </h3>
        <div className="w-full h-80">
          {ageChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" name="Workers">
                  {ageChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={AGE_COLORS[index % AGE_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No age data available
            </div>
          )}
        </div>
      </div>

      {/* Top 10 Exit Reasons Table */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-card">
        <h3 className="text-xl font-semibold text-primary mb-4">
          Top 10 Motif de Sortie (Exit Reasons)
        </h3>
        {topExitReasons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-primary">
                    Exit Reason
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-primary">
                    Count
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-primary">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody>
                {topExitReasons.map((item, index) => {
                  const percentage =
                    workers.length > 0
                      ? ((item.count / workers.length) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <tr
                      key={index}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-foreground">
                        {item.reason}
                      </td>
                      <td className="text-right py-3 px-4 font-medium text-foreground">
                        {item.count}
                      </td>
                      <td className="text-right py-3 px-4 text-muted-foreground">
                        {percentage}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No exit reason data available
          </div>
        )}
      </div>
    </div>
  );
}
