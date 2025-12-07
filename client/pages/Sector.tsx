import Layout from "@/components/Layout";
import FilterPanel from "@/components/FilterPanel";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getFarms,
  getWorkersByFarm,
  type Farm,
  type Worker,
} from "@/lib/firebase";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Helper function to calculate days worked
const calculateDaysWorked = (entryDate: string, exitDate?: string): number => {
  const start = new Date(entryDate);
  const end = exitDate ? new Date(exitDate) : new Date();
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Helper function to calculate average period for a farm
const calculateAveragePeriod = (workers: Worker[]): number => {
  if (workers.length === 0) return 0;
  const totalDays = workers.reduce((sum, worker) => {
    return sum + calculateDaysWorked(worker.dateEntree, worker.dateSortie);
  }, 0);
  return Math.round(totalDays / workers.length);
};

// Helper function to calculate monthly turnover
const calculateMonthlyTurnover = (
  workers: Worker[],
  startDate: string,
  endDate: string
): Array<{ month: string; turnover: number }> => {
  const monthlyData: Record<string, { departures: number; total: number }> = {};

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Initialize months
  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    const monthKey = d.toISOString().substring(0, 7); // YYYY-MM
    monthlyData[monthKey] = { departures: 0, total: 0 };
  }

  // Count departures and total workers per month
  workers.forEach((worker) => {
    const entryDate = new Date(worker.dateEntree);
    const exitDate = worker.dateSortie ? new Date(worker.dateSortie) : null;

    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const monthKey = d.toISOString().substring(0, 7);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      // Check if worker was active in this month
      if (entryDate <= monthEnd && (!exitDate || exitDate >= monthStart)) {
        monthlyData[monthKey].total++;
      }

      // Check if worker departed in this month
      if (exitDate && exitDate >= monthStart && exitDate <= monthEnd) {
        monthlyData[monthKey].departures++;
      }
    }
  });

  // Calculate turnover rate for each month
  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      turnover: data.total > 0 ? Math.round((data.departures / data.total) * 100 * 100) / 100 : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

// Helper function to calculate 12-month turnover for a specific year
const calculateYearlyTurnover = (
  workers: Worker[],
  year: number
): Array<{ month: string; turnover: number }> => {
  const monthlyData: Record<number, { departures: number; total: number }> = {};

  // Initialize all 12 months
  for (let i = 0; i < 12; i++) {
    monthlyData[i] = { departures: 0, total: 0 };
  }

  // Count departures and total workers per month
  workers.forEach((worker) => {
    const entryDate = new Date(worker.dateEntree);
    const exitDate = worker.dateSortie ? new Date(worker.dateSortie) : null;

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      // Check if worker was active in this month
      if (entryDate <= monthEnd && (!exitDate || exitDate >= monthStart)) {
        monthlyData[month].total++;
      }

      // Check if worker departed in this month
      if (exitDate && exitDate >= monthStart && exitDate <= monthEnd) {
        monthlyData[month].departures++;
      }
    }
  });

  // Convert to month names and calculate turnover rates
  const monthNames = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
    "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
  ];

  return Object.entries(monthlyData)
    .map(([monthIdx, data]) => ({
      month: monthNames[parseInt(monthIdx)],
      turnover: data.total > 0 ? Math.round((data.departures / data.total) * 100 * 100) / 100 : 0,
    }));
};

// Helper to get available years from workers data
const getAvailableYears = (workers: Worker[]): number[] => {
  const years = new Set<number>();
  workers.forEach((worker) => {
    years.add(new Date(worker.dateEntree).getFullYear());
    if (worker.dateSortie) {
      years.add(new Date(worker.dateSortie).getFullYear());
    }
  });
  return Array.from(years).sort((a, b) => b - a);
};

export default function Sector() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [workersMap, setWorkersMap] = useState<Record<string, Worker[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFarm, setExpandedFarm] = useState<string | null>(null);

  // Filter states
  const [selectedFarms, setSelectedFarms] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Initialize default date range (last 6 months) and year
  useEffect(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 6,
      now.getDate(),
    );

    setEndDate(now.toISOString().split("T")[0]);
    setStartDate(sixMonthsAgo.toISOString().split("T")[0]);
    setSelectedYear(now.getFullYear());
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const farmsData = await getFarms();

        if (!isMounted) return;

        setFarms(farmsData);
        // Set all farms as selected by default
        setSelectedFarms(farmsData.map((f) => f.id));

        const workersData: Record<string, Worker[]> = {};
        for (const farm of farmsData) {
          if (!isMounted) return;
          workersData[farm.id] = await getWorkersByFarm(farm.id);
        }

        if (isMounted) {
          setWorkersMap(workersData);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching sector data:", err);
          setError("Impossible de charger les données du secteur");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter workers based on date range and selected farms
  const filteredWorkers = useMemo(() => {
    const filtered: Worker[] = [];
    const filterStart = new Date(startDate);
    const filterEnd = new Date(endDate);

    selectedFarms.forEach((farmId) => {
      const farmWorkers = workersMap[farmId] || [];
      farmWorkers.forEach((worker) => {
        const entryDate = new Date(worker.dateEntree);
        const exitDate = worker.dateSortie ? new Date(worker.dateSortie) : null;

        // Include workers active during the date range
        // Workers are included if:
        // - They entered before/during the range AND
        // - They haven't exited yet OR exited after the range started
        if (entryDate <= filterEnd && (!exitDate || exitDate >= filterStart)) {
          filtered.push(worker);
        }
      });
    });

    return filtered;
  }, [selectedFarms, startDate, endDate, workersMap]);

  // Get all workers from selected farms for year filter
  const allSelectedFarmsWorkers = useMemo(() => {
    const all: Worker[] = [];
    selectedFarms.forEach((farmId) => {
      all.push(...(workersMap[farmId] || []));
    });
    return all;
  }, [selectedFarms, workersMap]);

  // Get available years
  const availableYears = useMemo(() => {
    return getAvailableYears(allSelectedFarmsWorkers);
  }, [allSelectedFarmsWorkers]);

  // Calculate monthly turnover (yearly view if selected, otherwise date range view)
  const monthlyTurnoverData = useMemo(() => {
    if (selectedYear) {
      return calculateYearlyTurnover(allSelectedFarmsWorkers, selectedYear);
    }
    return calculateMonthlyTurnover(filteredWorkers, startDate, endDate);
  }, [filteredWorkers, startDate, endDate, selectedYear, allSelectedFarmsWorkers]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour au tableau de bord
        </Link>

        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
              🌍 Suivi de la main-d'œuvre par secteur
            </h1>
            <p className="text-lg text-muted-foreground">
              Supervisez les travailleurs dans toutes les fermes et leur allocation actuelle
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : farms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune ferme trouvée</p>
            </div>
          ) : (
            <>
              {/* Filter Panel */}
              <FilterPanel
                farms={farms}
                selectedFarms={selectedFarms}
                onFarmsChange={setSelectedFarms}
                startDate={startDate}
                onStartDateChange={setStartDate}
                endDate={endDate}
                onEndDateChange={setEndDate}
              />

              {/* Analytics Charts */}
              <AnalyticsCharts
                workers={filteredWorkers}
                startDate={startDate}
                endDate={endDate}
              />

              {/* Monthly Turnover Chart */}
              {monthlyTurnoverData.length > 0 && (
                <div className="rounded-lg border border-border shadow-lg bg-card p-6">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-primary mb-2">
                        Taux de Rotation Mensuel
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Tendance du taux de rotation au fil des mois
                      </p>
                    </div>
                    {availableYears.length > 0 && (
                      <div className="w-40">
                        <Select value={selectedYear?.toString() || ""} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une année" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableYears.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="w-full h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTurnoverData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTurnover" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                        <YAxis
                          stroke="var(--muted-foreground)"
                          label={{ value: "Taux (%)", angle: -90, position: "insideLeft", offset: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--background)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            padding: "12px",
                          }}
                          formatter={(value) => [`${value}%`, "Taux de Rotation"]}
                          labelStyle={{ color: "var(--foreground)" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="turnover"
                          stroke="var(--accent)"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorTurnover)"
                          dot={{ fill: "var(--accent)", r: 5, strokeWidth: 2, stroke: "var(--background)" }}
                          activeDot={{ r: 7, strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Farms List Section */}
              <div>
                <h2 className="text-2xl font-bold text-primary mb-4">
                  Aperçu des fermes
                </h2>
                <div className="space-y-4">
                  {farms
                    .filter((farm) => selectedFarms.includes(farm.id))
                    .map((farm) => {
                      const workers = workersMap[farm.id] || [];
                      const activeWorkers = workers.filter(
                        (w) => w.statut === "actif",
                      );
                      const isExpanded = expandedFarm === farm.id;
                      const averagePeriod = calculateAveragePeriod(workers);

                      return (
                        <div
                          key={farm.id}
                          className="border border-border rounded-lg overflow-hidden shadow-card hover:shadow-lg transition-shadow"
                        >
                          <button
                            onClick={() =>
                              setExpandedFarm(isExpanded ? null : farm.id)
                            }
                            className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 text-left">
                              <h3 className="text-xl font-semibold text-primary">
                                {farm.nom}
                              </h3>
                              <div className="flex gap-6 mt-2 text-sm text-muted-foreground">
                                <span>
                                  👥 Travailleurs actifs :{" "}
                                  <strong>{activeWorkers.length}</strong>
                                </span>
                                <span>
                                  📊 Total travailleurs :{" "}
                                  <strong>{workers.length}</strong>
                                </span>
                                <span>
                                  🏠 Chambres :{" "}
                                  <strong>{farm.totalChambres}</strong>
                                </span>
                                <span>
                                  ⏱️ Période moyenne :{" "}
                                  <strong>{averagePeriod} jours</strong>
                                </span>
                              </div>
                            </div>
                            <div className="text-2xl transition-transform duration-200">
                              {isExpanded ? "−" : "+"}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-border px-6 py-4 bg-card/50">
                              {workers.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                  Aucun travailleur assigné à cette ferme
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  <div className="text-sm font-semibold text-primary mb-3">
                                    Travailleurs dans {farm.nom}
                                  </div>
                                  <div className="grid gap-2 max-h-96 overflow-y-auto">
                                    {workers.map((worker) => {
                                      const daysWorked = calculateDaysWorked(
                                        worker.dateEntree,
                                        worker.dateSortie,
                                      );
                                      return (
                                        <div
                                          key={worker.id}
                                          className="p-3 bg-background rounded border border-border/50 text-sm"
                                        >
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <p className="font-medium text-foreground">
                                                {worker.nom}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                Matricule : {worker.matricule}
                                              </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                              <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${
                                                  worker.statut === "actif"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-gray-100 text-gray-700"
                                                }`}
                                              >
                                                {worker.statut}
                                              </span>
                                              <span className="text-xs font-medium text-accent">
                                                ⏱️ {daysWorked} days
                                              </span>
                                            </div>
                                          </div>
                                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                            <span>
                                              ���� Entrée : {worker.dateEntree}
                                            </span>
                                            <span>🏠 Chambre : {worker.chambre}</span>
                                            <span>
                                              📍 Secteur : {worker.secteur}
                                            </span>
                                            {worker.dateSortie && (
                                              <span className="text-orange-600">
                                                📤 Sortie : {worker.dateSortie}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
