import Layout from "@/components/Layout";
import CategoryCard from "@/components/CategoryCard";
import SummaryCard from "@/components/SummaryCard";
import { useState, useEffect } from "react";
import { getDashboardSummary } from "@/lib/firebase";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

const categories = [
  {
    icon: "👥",
    title: "Structure de la main-d'œuvre et du personnel",
    
    href: "/workforce",
  },
  {
    icon: "📋",
    title: "Recrutement",

    href: "/recruitment",
  },
  {
    icon: "👥",
    title: "Effectif",

    href: "/effectif",
  },
  {
    icon: "🚪",
    title: "Sortie",

    href: "/sortie",
  },
  {
    icon: "📅",
    title: "Présence et absentéisme",
    
    href: "/attendance",
  },
  {
    icon: "⏱️",
    title: "Heures et performance",
    
    href: "/performance",
  },
  {
    icon: "📊",
    title: "Turnover",

    href: "/turnover",
  },
  {
    icon: "🌍",
    title: "Suivi de la main-d'œuvre par secteur",

    href: "/sector",
  },
];

interface DashboardSummary {
  totalWorkers: number;
  totalFarms: number;
  workersEntering: number;
  workersLeaving: number;
}

interface AttendanceStats {
  totalPresent: number;
  totalAbsent: number;
  attendanceRate: number;
  absenceRate: number;
}

interface WorkforceStats {
  totalDepartments: number;
  averageAge: number;
  totalMen: number;
  totalWomen: number;
  totalWorkers: number;
}

interface SectorStats {
  totalFarms: number;
  averageWorkersPerId: number;
}

export default function Index() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [workforceStats, setWorkforceStats] = useState<WorkforceStats | null>(null);
  const [sectorStats, setSectorStats] = useState<SectorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const abortControllers: AbortController[] = [];
    const timeoutIds: NodeJS.Timeout[] = [];

    const fetchWithTimeout = async (url: string, timeout = 30000): Promise<Response | null> => {
      const controller = new AbortController();
      abortControllers.push(controller);
      const timeoutId = setTimeout(() => {
        if (isMounted && !controller.signal.aborted) {
          try {
            controller.abort();
          } catch (e) {
            // Ignore errors from abort
          }
        }
      }, timeout);
      timeoutIds.push(timeoutId);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);
        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        if (isMounted) {
          if (err instanceof Error) {
            if (err.name === 'AbortError') {
              console.debug('Request timeout or aborted:', url);
            } else {
              console.debug('Fetch error:', err.message);
            }
          }
        }
        return null;
      }
    };

    const fetchAllStats = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);

        // Check server health first
        try {
          const healthResponse = await fetchWithTimeout("/health", 5000);
          if (!healthResponse || !healthResponse.ok) {
            console.warn("⚠️ Server health check failed, API may not be available");
          } else {
            console.log("✅ Server is healthy");
          }
        } catch (err) {
          console.debug("Health check failed:", err instanceof Error ? err.message : "Unknown");
        }

        // Fetch dashboard summary with proper error handling
        try {
          const dashboardData = await getDashboardSummary();
          if (!isMounted) return;

          setSummary({
            totalWorkers: dashboardData.totalWorkers,
            totalFarms: dashboardData.totalFarms,
            workersEntering: dashboardData.workersEntering,
            workersLeaving: dashboardData.workersLeaving,
          });

          // Calculate sector stats from dashboard data
          if (dashboardData.farms) {
            const farmCount = dashboardData.farms.length;
            const totalWorkerCount = dashboardData.totalWorkers;
            const avgWorkersPerId = farmCount > 0 ? Math.round(totalWorkerCount / farmCount) : 0;

            if (isMounted) {
              setSectorStats({
                totalFarms: farmCount,
                averageWorkersPerId: avgWorkersPerId,
              });
            }
          }
        } catch (err) {
          if (isMounted) {
            // Suppress Firebase AbortError - it's not a critical error
            if (err instanceof Error && err.name === 'AbortError') {
              console.debug("Dashboard fetch was aborted (component unmounted)");
            } else {
              console.error("Error fetching dashboard summary:", err);
            }
            setSummary(null);
            setSectorStats(null);
          }
        }

        // Fetch attendance data in parallel
        fetchWithTimeout("/api/attendance", 30000)
          .then((attendanceResponse) => {
            if (!isMounted) return null;

            if (!attendanceResponse) {
              console.debug("Attendance: No response received");
              return null;
            }

            if (attendanceResponse.ok) {
              return attendanceResponse.json();
            } else {
              console.debug("Attendance: Response status", attendanceResponse.status);
              return null;
            }
          })
          .then((attendanceData) => {
            if (!isMounted) return;

            if (Array.isArray(attendanceData) && attendanceData.length > 0) {
              let totalPresent = 0;
              let totalAbsent = 0;

              for (let i = 1; i < attendanceData.length; i++) {
                const row = attendanceData[i];
                if (!row || !Array.isArray(row)) continue;
                const attendance = (row[10] || "").toString().trim().toUpperCase();
                if (attendance === "T") {
                  totalPresent++;
                } else if (attendance === "I") {
                  totalAbsent++;
                }
              }

              const total = totalPresent + totalAbsent;
              const attendanceRate = total > 0 ? Math.round((totalPresent / total) * 100) : 0;
              const absenceRate = total > 0 ? Math.round((totalAbsent / total) * 100) : 0;

              if (isMounted) {
                setAttendanceStats({
                  totalPresent,
                  totalAbsent,
                  attendanceRate,
                  absenceRate,
                });
              }
            }
          })
          .catch((err) => {
            if (isMounted) {
              console.debug("Attendance stats error (non-critical):", err instanceof Error ? err.message : "Unknown error");
            }
          });

        // Fetch workforce data in parallel
        fetchWithTimeout("/api/workforce", 30000)
          .then((workforceResponse) => {
            if (!isMounted) return null;

            if (!workforceResponse) {
              console.debug("Workforce: No response received");
              return null;
            }

            if (workforceResponse.ok) {
              return workforceResponse.json();
            } else {
              console.debug("Workforce: Response status", workforceResponse.status);
              return null;
            }
          })
          .then((workforceData) => {
            if (!isMounted) return;

            if (Array.isArray(workforceData) && workforceData.length > 0) {
              const departmentSet = new Set<string>();
              let totalAge = 0;
              let totalMen = 0;
              let totalWorkers = 0;
              let ageCount = 0;

              for (let i = 1; i < workforceData.length; i++) {
                const row = workforceData[i];
                if (!row || !Array.isArray(row)) continue;

                const dept = (row[11] || "").toString().trim();
                const sexo = (row[4] || "").toString().trim();
                const edad = row[5];

                if (dept) departmentSet.add(dept);

                // Count all valid workers
                totalWorkers++;

                if (sexo === "H") {
                  totalMen++;
                }

                if (typeof edad === "number" && edad > 0) {
                  totalAge += edad;
                  ageCount++;
                }
              }

              const averageAge = ageCount > 0 ? Math.round(totalAge / ageCount) : 0;
              // Calculate women as: total workers - total men
              const totalWomen = Math.max(0, totalWorkers - totalMen);

              if (isMounted) {
                setWorkforceStats({
                  totalDepartments: departmentSet.size,
                  averageAge,
                  totalMen,
                  totalWomen,
                  totalWorkers,
                });
              }
            }
          })
          .catch((err) => {
            if (isMounted) {
              console.debug("Workforce stats error (non-critical):", err instanceof Error ? err.message : "Unknown error");
            }
          });

        // Set loading to false after a short delay to allow data to come in
        const loadingTimeoutId = setTimeout(() => {
          if (isMounted) {
            setLoading(false);
          }
        }, 1000);
        timeoutIds.push(loadingTimeoutId);
      } catch (err) {
        if (isMounted) {
          console.error("Error in fetchAllStats:", err);
          setLoading(false);
        }
      }
    };

    fetchAllStats();

    return () => {
      try {
        isMounted = false;

        // Clear all timeouts
        try {
          timeoutIds.slice().forEach(id => {
            try {
              clearTimeout(id);
            } catch (e) {
              // Ignore errors
            }
          });
          timeoutIds.length = 0;
        } catch (e) {
          // Ignore iteration errors
        }

        // Abort all fetch requests - use slice to avoid issues with concurrent modifications
        try {
          abortControllers.slice().forEach(controller => {
            try {
              if (controller && !controller.signal.aborted) {
                controller.abort();
              }
            } catch (e) {
              // Silently ignore all abort errors
            }
          });
          abortControllers.length = 0;
        } catch (e) {
          // Ignore iteration errors
        }
      } catch (e) {
        // Ignore all cleanup errors
      }
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      if (direction === "left") {
        scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  return (
    <Layout>
      <div className="space-y-8 sm:space-y-12">
        {/* Categories - YouTube Style Menu */}
        <div>
          <h3 className="text-xl sm:text-2xl font-semibold text-primary mb-4 sm:mb-6">
            Catégories RH
          </h3>

          <div className="relative group">
            {/* Left scroll button */}
            <button
              onClick={() => scroll("left")}
              className="absolute -left-4 top-1/2 transform -translate-y-1/2 z-10 hidden lg:flex items-center justify-center w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all opacity-0 group-hover:opacity-100"
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Scrollable container */}
            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
              style={{ scrollBehavior: "smooth" }}
            >
              {categories.map((category) => (
                <div
                  key={category.title}
                  className="flex-shrink-0"
                >
                  <CategoryCard
                    icon={category.icon}
                    title={category.title}
                    description={category.description}
                    href={category.href}
                  />
                </div>
              ))}
            </div>

            {/* Right scroll button */}
            <button
              onClick={() => scroll("right")}
              className="absolute -right-4 top-1/2 transform -translate-y-1/2 z-10 hidden lg:flex items-center justify-center w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all opacity-0 group-hover:opacity-100"
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Introduction Section */}

        {/* Summary Cards */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Primary Stats */}
            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <SummaryCard
                  icon="👥"
                  title="Total Travailleurs (Secteur)"
                  value={summary.totalWorkers}
                  color="blue"
                />
                <SummaryCard
                  icon="🌾"
                    title="Total Fermes (Secteur)"
                  value={summary.totalFarms}
                  color="green"
                />
                <SummaryCard
                  icon="📥"
                    title="Travailleurs Entrants (Secteur)"
                  value={summary.workersEntering}
                  subtitle="30 derniers jours"
                  color="green"
                />
                <SummaryCard
                  icon="📤"
                    title="Travailleurs Sortants (Secteur)"
                  value={summary.workersLeaving}
                  subtitle="30 derniers jours"
                  color="orange"
                />
              </div>
            )}

            {/* Attendance Stats */}
            {attendanceStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <SummaryCard
                  icon="✅"
                  title="Présents Aujourd'hui"
                  value={attendanceStats.totalPresent}
                  color="green"
                />
                <SummaryCard
                  icon="❌"
                  title="Absents Aujourd'hui"
                  value={attendanceStats.totalAbsent}
                  color="red"
                />
                <SummaryCard
                  icon="📊"
                  title="Taux de Présence"
                  value={`${attendanceStats.attendanceRate}%`}
                  color="blue"
                />
                <SummaryCard
                  icon="📉"
                  title="Taux d'Absence"
                  value={`${attendanceStats.absenceRate}%`}
                  color="orange"
                />
              </div>
            )}

            {/* Workforce Stats */}
            {workforceStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <SummaryCard
                  icon="🏢"
                  title="Départements"
                  value={workforceStats.totalDepartments}
                  color="blue"
                />
                <SummaryCard
                  icon="👨"
                  title="Hommes"
                  value={workforceStats.totalMen}
                  color="green"
                />
                <SummaryCard
                  icon="👩"
                  title="Femmes"
                  value={workforceStats.totalWomen}
                  color="red"
                />
                <SummaryCard
                  icon="🎂"
                  title="Âge Moyen"
                  value={`${workforceStats.averageAge} ans`}
                  color="orange"
                />
              </div>
            )}

          </>
        )}
      </div>
    </Layout>
  );
}
