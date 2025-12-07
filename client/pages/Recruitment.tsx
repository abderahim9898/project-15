import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { ArrowLeft, AlertCircle, RotateCcw, Users, Briefcase, TrendingUp, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";

const formatDate = (dateString: string): string => {
  try {
    // Parse the ISO date string and extract date components directly
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = match[1];
      const month = match[2];
      const day = match[3];
      return `${day}-${month}-${year}`;
    }
    return dateString;
  } catch {
    return dateString;
  }
};

interface RecruitmentRecord {
  date: string;
  semaine: string | number;
  qz: string;
  mois: string | number;
  departement: string;
  transSecteur: string;
  sourceRecrutement: string;
  interime: string;
  nbr: number;
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

export default function Recruitment() {
  const [data, setData] = useState<RecruitmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedSector, setSelectedSector] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let retryTimeoutId: NodeJS.Timeout | null = null;

    const fetchRecruitmentData = async (attempt = 1) => {
      let shouldRetry = false;
      try {
        if (!isMounted) return;
        setLoading(true);
        setError(null);

        controller = new AbortController();
        timeoutId = setTimeout(() => {
          console.warn("Recruitment fetch timeout - aborting");
          if (controller && !controller.signal.aborted) {
            controller.abort();
          }
        }, 40000);

        console.log(`Fetching recruitment data (attempt ${attempt})...`);
        const response = await fetch("/api/recruitment", {
          signal: controller.signal,
          headers: {
            "Accept": "application/json",
          },
          method: "GET",
        });

        if (timeoutId) clearTimeout(timeoutId);

        if (!isMounted) return;

        console.log("Recruitment fetch response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Server error response:", errorText);
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const rawData = await response.json();
        console.log("Recruitment data received, records count:", Array.isArray(rawData) ? rawData.length : "invalid");

        if (!isMounted) return;

        if (Array.isArray(rawData) && rawData.length > 1) {
          const processedData: RecruitmentRecord[] = [];

          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || !Array.isArray(row) || row.length < 9) continue;

            const date = (row[0] || "").toString().trim();
            const semaine = row[1] || "";
            const qz = (row[2] || "").toString().trim();
            const mois = row[3] || "";
            const departement = (row[4] || "").toString().trim();
            const transSecteur = (row[5] || "").toString().trim();
            const sourceRecrutement = (row[6] || "").toString().trim();
            const interime = (row[7] || "").toString().trim();
            const nbr = parseInt(row[8]) || 0;

            if (date && departement && sourceRecrutement) {
              processedData.push({
                date,
                semaine,
                qz,
                mois,
                departement,
                transSecteur,
                sourceRecrutement,
                interime,
                nbr,
              });
            }
          }

          console.log("Processed recruitment records:", processedData.length);
          if (isMounted) {
            setData(processedData);
            setError(null);
            setLoading(false);
          }
        } else {
          console.warn("Invalid data format received from server");
          if (isMounted) {
            setData([]);
            setError("No recruitment data available");
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Error fetching recruitment data (attempt " + attempt + "):", err);
        if (isMounted) {
          let errorMessage = "Failed to load recruitment data";

          if (err instanceof TypeError) {
            console.error("TypeError details:", (err as Error).message);
            if ((err as Error).message.includes("Failed to fetch")) {
              errorMessage = "Network connection issue. Retrying...";
              shouldRetry = attempt < 3;
            } else {
              errorMessage = `Network error: ${(err as Error).message}`;
            }
          } else if (err instanceof Error) {
            if (err.name === "AbortError") {
              errorMessage = "Request timed out. Retrying...";
              shouldRetry = attempt < 2;
            } else {
              errorMessage = err.message;
            }
          }

          if (shouldRetry) {
            console.log(`Scheduling retry in 2 seconds...`);
            retryTimeoutId = setTimeout(() => {
              if (isMounted) {
                fetchRecruitmentData(attempt + 1);
              }
            }, 2000);
          } else {
            setError(errorMessage);
            setData([]);
            setLoading(false);
          }
        }
      }
    };

    fetchRecruitmentData();

    return () => {
      try {
        isMounted = false;
        if (timeoutId) clearTimeout(timeoutId);
        if (retryTimeoutId) clearTimeout(retryTimeoutId);
        if (controller && !controller.signal.aborted) {
          try {
            controller.abort();
          } catch (e) {
            // Ignore abort errors
          }
        }
      } catch (e) {
        // Ignore all cleanup errors
      }
    };
  }, [retryKey]);

  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.departement))).sort();
  }, [data]);

  const uniqueSources = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.sourceRecrutement))).sort();
  }, [data]);

  const uniqueMonths = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.mois))).sort((a, b) =>
      parseInt(String(a)) - parseInt(String(b))
    );
  }, [data]);

  const uniqueSectors = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.transSecteur))).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((record) => {
      if (selectedDepartment && record.departement !== selectedDepartment) return false;
      if (selectedSource && record.sourceRecrutement !== selectedSource) return false;
      if (selectedMonth && String(record.mois) !== String(selectedMonth)) return false;
      if (selectedSector && record.transSecteur !== selectedSector) return false;
      return true;
    });
  }, [data, selectedDepartment, selectedSource, selectedMonth, selectedSector]);

  const stats = useMemo(() => {
    const totalRecruits = filteredData.reduce((sum, r) => sum + r.nbr, 0);
    const byDepartment: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const bySector: Record<string, number> = {};
    const byInterime: Record<string, number> = {};
    const byMonth: Record<string | number, number> = {};

    filteredData.forEach((record) => {
      byDepartment[record.departement] = (byDepartment[record.departement] || 0) + record.nbr;
      bySource[record.sourceRecrutement] = (bySource[record.sourceRecrutement] || 0) + record.nbr;
      bySector[record.transSecteur] = (bySector[record.transSecteur] || 0) + record.nbr;
      byInterime[record.interime] = (byInterime[record.interime] || 0) + record.nbr;
      byMonth[record.mois] = (byMonth[record.mois] || 0) + record.nbr;
    });

    return {
      totalRecruits,
      uniqueDepartmentCount: Object.keys(byDepartment).length,
      uniqueSourceCount: Object.keys(bySource).length,
      byDepartment,
      bySource,
      bySector,
      byInterime,
      byMonth,
    };
  }, [filteredData]);

  const departmentChartData = useMemo(() => {
    return Object.entries(stats.byDepartment)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [stats]);

  const sourceChartData = useMemo(() => {
    return Object.entries(stats.bySource)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  const sectorChartData = useMemo(() => {
    return Object.entries(stats.bySector)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  const interimeChartData = useMemo(() => {
    return Object.entries(stats.byInterime)
      .map(([name, value]) => ({ name, value }));
  }, [stats]);

  const monthChartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      month: `Mois ${i + 1}`,
      recruits: stats.byMonth[i + 1] || 0,
    }));
  }, [stats]);

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

  const temporaryRecruits = stats.byInterime["Oui"] || stats.byInterime["OUI"] || 0;
  const permanentRecruits = stats.totalRecruits - temporaryRecruits;
  const uniqueInterimTypes = Object.keys(stats.byInterime).length;

  const statCards: StatCard[] = [
    {
      icon: <Users className="w-6 h-6" />,
      label: "Total Recrutements",
      value: stats.totalRecruits,
      color: "bg-blue-500/10 border-blue-200 dark:border-blue-900",
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      label: "Type de Interime",
      value: uniqueInterimTypes,
      color: "bg-green-500/10 border-green-200 dark:border-green-900",
    },
    
    {
      icon: <Calendar className="w-6 h-6" />,
      label: "Départements",
      value: stats.uniqueDepartmentCount,
      color: "bg-purple-500/10 border-purple-200 dark:border-purple-900",
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
            👨‍💼 Recrutement
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
                  Source de Recrutement
                </label>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Toutes les sources</option>
                  {uniqueSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Secteur
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous les secteurs</option>
                  {uniqueSectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
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
            <AlertDescription>Aucune donnée de recrutement disponible</AlertDescription>
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

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recruitment by Month */}
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Recrutements par Mois
                </h2>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                      <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} fontSize={12} />
                      <YAxis label={{ value: "Nombre de Recrutements", angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          border: "none",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="recruits"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: "#3b82f6", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recruitment by Department */}
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Recrutements par Département 
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
                      <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recruitment by Source */}
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Recrutements par Source
                </h2>
                <div className="w-full h-80 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sourceChartData.map((entry, index) => (
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

              {/* Recruitment by Sector */}
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Recrutements par Secteur
                </h2>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                      <YAxis label={{ value: "Nombre de Recrutements", angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          border: "none",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="value" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recruitment by Contract Type */}
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Recrutements par Contrat
                </h2>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={interimeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                      <YAxis label={{ value: "Nombre de Recrutements", angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          border: "none",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="value" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Detail Table */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Données Détaillées des Recrutements
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Semaine</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">QZ</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Mois</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Département</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Secteur</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Source</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Intérim</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Nombre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                          Aucune donnée disponible
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((record, idx) => (
                        <tr
                          key={`${record.date}-${record.qz}-${record.departement}-${idx}`}
                          className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{formatDate(record.date)}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.semaine}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.qz}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.mois}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.departement}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.transSecteur}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.sourceRecrutement}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.interime}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded font-semibold">
                              {record.nbr}
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
