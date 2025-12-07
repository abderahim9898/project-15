import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { ArrowLeft, AlertCircle, RotateCcw, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TurnoverRecord {
  month: string | number;
  workersFinished: number;
  group: string;
  contractType: string;
  workersStarted: number;
  workersEndedMonth: number;
}

interface MonthData {
  month: string | number;
  totalStarted: number;
  totalFinished: number;
  averageWorkforce: number;
  turnoverRate: number;
  groups: TurnoverRecord[];
}

const formatMonthDisplay = (month: string | number): string => {
  const monthStr = String(month).trim();
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  // Check if it's YYYY-MM format (from HTML month input)
  if (/^\d{4}-\d{2}$/.test(monthStr)) {
    const [year, monthNum] = monthStr.split("-");
    return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
  }

  // Check if it's an ISO date string (contains T or Z)
  if (monthStr.includes("T") || monthStr.includes("Z")) {
    try {
      const date = new Date(monthStr);
      return `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    } catch {
      return monthStr;
    }
  }

  // Check if it contains month name (French or English)
  if (/[A-Za-zàâäæèéêëìîïòôöœùûüÿçÀÂÄÆÈÉÊËÌÎÏÒÔÖŒÙÛÜŸÇ]/.test(monthStr)) {
    return monthStr;
  }

  // Otherwise treat as month number
  return `Mois ${monthStr}`;
};

export default function Turnover() {
  const [data, setData] = useState<TurnoverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | number | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [filterMonth, setFilterMonth] = useState<string | number | null>(null);
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [filterContract, setFilterContract] = useState<string | null>(null);

  useEffect(() => {
    const fetchTurnoverData = async () => {
      try {
        setLoading(true);
        setError(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            controller.abort();
          }
        }, 60000); // 60 second timeout

        console.log("Fetching turnover data...");
        const response = await fetch("/api/turnover", {
          signal: controller.signal,
          headers: { "Accept": "application/json" },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch turnover data: ${response.status}`);
        }

        const rawData = await response.json();
        console.log("Turnover data received:", rawData);

        // Process the data - assuming format: [headers, [month, workersFinished, group, contractType, workersStarted, workersEnded], ...]
        if (Array.isArray(rawData) && rawData.length > 1) {
          const processedData: TurnoverRecord[] = [];

          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || !Array.isArray(row) || row.length < 6) continue;

            const month = row[0] || "";
            const workersFinished = parseInt(row[1]) || 0;
            const group = (row[2] || "").toString().trim();
            const contractType = (row[3] || "").toString().trim();
            const workersStarted = parseInt(row[4]) || 0;
            const workersEndedMonth = parseInt(row[5]) || 0;

            if (month && group && contractType) {
              processedData.push({
                month,
                workersFinished,
                group,
                contractType,
                workersStarted,
                workersEndedMonth,
              });
            }
          }

          console.log("Processed turnover records:", processedData.length);
          setData(processedData);
        } else {
          console.warn("No turnover data received from server");
          setData([]);
        }
      } catch (err) {
        console.error("Error fetching turnover data:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load turnover data";
        setError(errorMessage);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTurnoverData();
  }, [retryKey]);

  // Get unique filter values
  const uniqueMonths = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.month))).sort(
      (a, b) => (parseInt(String(a)) || 0) - (parseInt(String(b)) || 0)
    );
  }, [data]);

  const uniqueGroups = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.group))).sort();
  }, [data]);

  const uniqueContracts = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.contractType))).sort();
  }, [data]);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    return data.filter((record) => {
      if (filterMonth && record.month !== filterMonth) return false;
      if (filterGroup && record.group !== filterGroup) return false;
      if (filterContract && record.contractType !== filterContract) return false;
      return true;
    });
  }, [data, filterMonth, filterGroup, filterContract]);

  // Group data by month - filtered
  const monthlyData = useMemo(() => {
    const grouped = new Map<string | number, MonthData>();

    filteredData.forEach((record) => {
      if (!grouped.has(record.month)) {
        grouped.set(record.month, {
          month: record.month,
          totalStarted: 0,
          totalFinished: 0,
          averageWorkforce: 0,
          turnoverRate: 0,
          groups: [],
        });
      }

      const monthData = grouped.get(record.month)!;
      monthData.totalStarted += record.workersStarted;
      monthData.totalFinished += record.workersFinished;
      monthData.groups.push(record);
    });

    // Calculate average workforce and turnover rate for each month
    grouped.forEach((monthData) => {
      let totalAverageWorkforce = 0;

      monthData.groups.forEach((record) => {
        // For each record: average = (column e + column f) / 2
        const recordAverage = (record.workersStarted + record.workersEndedMonth) / 2;
        totalAverageWorkforce += recordAverage;
      });

      // Total average workforce for the month
      const recordCount = monthData.groups.length;
      monthData.averageWorkforce = recordCount > 0 ? totalAverageWorkforce : 0;

      // Turnover Rate = (Number of Exits / Average Workforce) * 100
      if (monthData.averageWorkforce > 0) {
        monthData.turnoverRate = (monthData.totalFinished / monthData.averageWorkforce) * 100;
      } else {
        monthData.turnoverRate = 0;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => {
      const aNum = parseInt(String(a.month)) || 0;
      const bNum = parseInt(String(b.month)) || 0;
      return aNum - bNum;
    });
  }, [filteredData]);

  // Data for trend chart
  const trendChartData = monthlyData.map((m) => ({
    month: `Mois ${m.month}`,
    tauxTurnover: parseFloat(m.turnoverRate.toFixed(2)),
  }));

  // Get selected month data
  const selectedMonthData = monthlyData.find((m) => m.month === selectedMonth);

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={32} className="text-blue-600" />
            TURNOVER 
          </h1>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
            <Button onClick={() => setRetryKey((k) => k + 1)} size="sm" className="ml-auto">
              <RotateCcw size={16} /> Réessayer
            </Button>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des données...</p>
          </div>
        ) : data.length === 0 ? (
          <Alert>
            <AlertDescription>Aucune donnée de rotation disponible</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filtres</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filter by Month */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mois</label>
                  <select
                    value={filterMonth || ""}
                    onChange={(e) => setFilterMonth(e.target.value ? e.target.value : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tous les mois</option>
                    {uniqueMonths.map((month) => (
                      <option key={month} value={month}>
                        {formatMonthDisplay(month)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Group */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Groupe</label>
                  <select
                    value={filterGroup || ""}
                    onChange={(e) => setFilterGroup(e.target.value ? e.target.value : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tous les groupes</option>
                    {uniqueGroups.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Contract Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type de Contrat</label>
                  <select
                    value={filterContract || ""}
                    onChange={(e) => setFilterContract(e.target.value ? e.target.value : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tous les types</option>
                    {uniqueContracts.map((contract) => (
                      <option key={contract} value={contract}>
                        {contract}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear filters button */}
              {(filterMonth || filterGroup || filterContract) && (
                <button
                  onClick={() => {
                    setFilterMonth(null);
                    setFilterGroup(null);
                    setFilterContract(null);
                  }}
                  className="mt-4 px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>

            {/* Trend Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Taux de turnover mensuel</h2>
              <div className="w-full h-80 bg-white dark:bg-slate-900 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                    <YAxis
                      label={{ value: "Taux de turnover (%)", angle: -90, position: "insideLeft" }}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(value) => [`${value.toFixed(2)}%`, "Taux de Turnover"]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="tauxTurnover"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ fill: "#f59e0b", r: 5 }}
                      activeDot={{ r: 7 }}
                      name="Taux de Turnover (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Résumé mensuel</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {monthlyData.map((month) => (
                  <button
                    key={month.month}
                    onClick={() => setSelectedMonth(selectedMonth === month.month ? null : month.month)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedMonth === month.month
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-slate-700 hover:border-blue-400"
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{formatMonthDisplay(month.month)}</div>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Départs:</span>
                        <span className="font-semibold text-red-600">{month.totalFinished}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Effectif moyen:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{Math.round(month.averageWorkforce)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-slate-700">
                        <span className="text-xs font-medium">Taux:</span>
                        <span className={`font-bold ${month.turnoverRate > 15 ? "text-red-600" : month.turnoverRate > 8 ? "text-orange-600" : "text-green-600"}`}>
                          {month.turnoverRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {selectedMonth ? `Détails du ${formatMonthDisplay(selectedMonth)}` : "Tous les détails"}
                {(filterMonth || filterGroup || filterContract) && (
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-2">
                    ({filteredData.length} résultat{filteredData.length !== 1 ? "s" : ""})
                  </span>
                )}
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Mois</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Groupe</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Type de Contrat</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Départs</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Effectif début</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Effectif fin</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Taux turnover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedMonth ? selectedMonthData?.groups : filteredData).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                          Aucune donnée ne correspond aux filtres sélectionnés
                        </td>
                      </tr>
                    ) : (
                      (selectedMonth ? selectedMonthData?.groups : filteredData).map((record, idx) => {
                        const avgWorkforce = (record.workersStarted + record.workersEndedMonth) / 2;
                        const turnoverRate = avgWorkforce > 0 ? (record.workersFinished / avgWorkforce) * 100 : 0;

                        return (
                          <tr
                            key={`${record.month}-${record.group}-${record.contractType}-${idx}`}
                            className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{formatMonthDisplay(record.month)}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.group}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.contractType}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded font-semibold">
                                {record.workersFinished}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                              {record.workersStarted}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                              {record.workersEndedMonth}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded font-semibold ${
                                  turnoverRate > 15
                                    ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
                                    : turnoverRate > 8
                                    ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400"
                                    : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                                }`}
                              >
                                {turnoverRate.toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
