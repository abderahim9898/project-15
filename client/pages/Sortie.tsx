import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { ArrowLeft, AlertCircle, RotateCcw, TrendingDown, Users, Calendar, Briefcase } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";

interface SortieRecord {
  qz: string;
  month: string | number;
  years: string | number;
  sex: string;
  contrado: string;
  department: string;
  nbBaja: number;
}

interface MonthData {
  month: string | number;
  [key: string]: string | number;
}

interface StatCard {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}

export default function Sortie() {
  const [data, setData] = useState<SortieRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedYear, setSelectedYear] = useState<string | number>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedContract, setSelectedContract] = useState<string>("");

  useEffect(() => {
    const fetchSortieData = async () => {
      try {
        setLoading(true);
        setError(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            controller.abort();
          }
        }, 60000);

        console.log("Fetching sortie data...");
        const response = await fetch("/api/sortie", {
          signal: controller.signal,
          headers: { "Accept": "application/json" },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch sortie data: ${response.status}`);
        }

        const rawData = await response.json();
        console.log("Sortie data received:", rawData);

        if (Array.isArray(rawData) && rawData.length > 1) {
          const processedData: SortieRecord[] = [];

          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || !Array.isArray(row) || row.length < 7) continue;

            const qz = (row[0] || "").toString().trim();
            const month = row[1] || "";
            const years = row[2] || "";
            const sex = (row[3] || "").toString().trim();
            const contrado = (row[4] || "").toString().trim();
            const department = (row[5] || "").toString().trim();
            const nbBaja = parseInt(row[6]) || 0;

            if (qz && month && years && department) {
              processedData.push({
                qz,
                month,
                years,
                sex,
                contrado,
                department,
                nbBaja,
              });
            }
          }

          console.log("Processed sortie records:", processedData.length);
          setData(processedData);
        } else {
          console.warn("No sortie data received from server");
          setData([]);
        }
      } catch (err) {
        console.error("Error fetching sortie data:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load sortie data";
        setError(errorMessage);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSortieData();
  }, [retryKey]);

  const uniqueYears = useMemo(() => {
    const years = Array.from(new Set(data.map((r) => r.years))).sort((a, b) =>
      parseInt(String(b)) - parseInt(String(a))
    );
    return years;
  }, [data]);

  const uniqueMonths = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.month))).sort((a, b) =>
      parseInt(String(a)) - parseInt(String(b))
    );
  }, [data]);

  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.department))).sort();
  }, [data]);

  const uniqueContracts = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.contrado))).sort();
  }, [data]);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    return data.filter((record) => {
      if (selectedYear && String(record.years) !== String(selectedYear)) return false;
      if (selectedMonth && String(record.month) !== String(selectedMonth)) return false;
      if (selectedDepartment && record.department !== selectedDepartment) return false;
      if (selectedContract && record.contrado !== selectedContract) return false;
      return true;
    });
  }, [data, selectedYear, selectedMonth, selectedDepartment, selectedContract]);

  const uniqueQZs = useMemo(() => {
    return Array.from(new Set(filteredData.map((r) => r.qz))).sort();
  }, [filteredData]);


  // Statistics based on filtered data
  const stats = useMemo(() => {
    const totalBaja = filteredData.reduce((sum, r) => sum + r.nbBaja, 0);
    const byQZ: Record<string, number> = {};
    const bySex: Record<string, number> = {};
    const byContrado: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};

    filteredData.forEach((record) => {
      byQZ[record.qz] = (byQZ[record.qz] || 0) + record.nbBaja;
      bySex[record.sex] = (bySex[record.sex] || 0) + record.nbBaja;
      byContrado[record.contrado] = (byContrado[record.contrado] || 0) + record.nbBaja;
      byDepartment[record.department] = (byDepartment[record.department] || 0) + record.nbBaja;
    });

    return {
      totalBaja,
      byQZ,
      bySex,
      byContrado,
      byDepartment,
      uniqueQZCount: Object.keys(byQZ).length,
    };
  }, [filteredData]);

  // Chart data - by month and QZ (only includes QZs that have actual data for each month)
  const chartData = useMemo(() => {
    const monthMap = new Map<string | number, MonthData>();

    // Initialize months 1-12 without pre-populating QZs
    for (let i = 1; i <= 12; i++) {
      monthMap.set(i, { month: `Mois ${i}/${selectedYear}` });
    }

    // Add QZ data only when it exists in filtered data
    filteredData.forEach((record) => {
      const monthNum = parseInt(String(record.month)) || 0;
      if (monthMap.has(monthNum)) {
        const monthData = monthMap.get(monthNum)!;
        monthData[record.qz] = (monthData[record.qz] as number || 0) + record.nbBaja;
      }
    });

    // Return all months (1-12) with the selected year, sorted
    return Array.from(monthMap.values()).sort((a, b) => {
      const aMonth = parseInt(String(a.month).split("/")[0].replace("Mois ", "")) || 0;
      const bMonth = parseInt(String(b.month).split("/")[0].replace("Mois ", "")) || 0;
      return aMonth - bMonth;
    });
  }, [filteredData, selectedYear]);

  // Chart data - by department (updated from filtered stats)
  const departmentChartData = useMemo(() => {
    return Object.entries(stats.byDepartment)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [stats]);

  // Chart data - by sex (updated from filtered stats)
  const sexChartData = useMemo(() => {
    return Object.entries(stats.bySex).map(([name, value]) => ({
      name,
      value,
    }));
  }, [stats]);

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
  const qzColors = uniqueQZs.reduce(
    (acc, qz, idx) => {
      acc[qz] = colors[idx % colors.length];
      return acc;
    },
    {} as Record<string, string>
  );

  const totalFemale = useMemo(() => {
    return stats.bySex["M"] || stats.bySex["m"] || 0;
  }, [stats.bySex]);

  const totalMale = useMemo(() => {
    return stats.bySex["H"] || stats.bySex["h"] || 0;
  }, [stats.bySex]);

  const statCards: StatCard[] = [
    {
      icon: <TrendingDown className="w-6 h-6" />,
      label: "Total Sorties",
      value: stats.totalBaja,
      color: "bg-red-500/10 border-red-200 dark:border-red-900",
    },
    {
      icon: <Users className="w-6 h-6" />,
      label: "Total Femme",
      value: totalFemale,
      color: "bg-pink-500/10 border-pink-200 dark:border-pink-900",
    },
    {
      icon: <Users className="w-6 h-6" />,
      label: "Total Homme",
      value: totalMale,
      color: "bg-blue-500/10 border-blue-200 dark:border-blue-900",
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      label: "Types Contrats",
      value: Object.keys(stats.byContrado).length,
      color: "bg-green-500/10 border-green-200 dark:border-green-900",
    },
  ];

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🚪 Sorties
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

        {/* Filter Section */}
        {!loading && data.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Filtres
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Année
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Toutes les années</option>
                  {uniqueYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mois
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous les mois</option>
                  {uniqueMonths.map((month) => (
                    <option key={month} value={month}>
                      Mois {month}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Département
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous les départements</option>
                  {uniqueDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type de Contrat
                </label>
                <select
                  value={selectedContract}
                  onChange={(e) => setSelectedContract(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous les contrats</option>
                  {uniqueContracts.map((contract) => (
                    <option key={contract} value={contract}>
                      {contract}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des données...</p>
          </div>
        ) : data.length === 0 ? (
          <Alert>
            <AlertDescription>Aucune donnée de sortie disponible</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-6 ${card.color} backdrop-blur-sm transition-all hover:shadow-lg`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {card.label}
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                        {card.value}
                      </p>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 opacity-70">
                      {card.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Chart - Sorties par Mois et QZ */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Sorties par Mois et QZ
                </h2>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Année:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Toutes les années</option>
                    {uniqueYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="w-full h-96 bg-white dark:bg-slate-900 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                    <YAxis label={{ value: "Nombre de Sorties", angle: -90, position: "insideLeft" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    {uniqueQZs.map((qz) => (
                      <Bar
                        key={qz}
                        dataKey={qz}
                        fill={qzColors[qz]}
                        name={qz}
                        stackId="a"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Secondary Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Chart */}
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Sorties par Département
                </h2>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          border: "none",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="value" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sex Distribution */}
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Distribution par Sexe
                </h2>
                <div className="w-full h-80 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sexChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sexChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          border: "none",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Detail Table */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Données Détaillées des Sorties
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">QZ</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Mois</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Années</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Sexe</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Contrado</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Département</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Nombre Baja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                          Aucune donnée disponible
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((record, idx) => (
                        <tr
                          key={`${record.qz}-${record.month}-${record.years}-${record.sex}-${idx}`}
                          className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{record.qz}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.month}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.years}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.sex}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.contrado}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.department}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded font-semibold">
                              {record.nbBaja}
                            </span>
                          </td>
                        </tr>
                      ))
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
