import { useEffect, useState, useMemo, useRef } from "react";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import { ArrowLeft, AlertCircle, RotateCcw, Info, Search, X, ChevronDown, BarChart3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Group {
  name: string;
  workingHours: string;
  department?: string;
  workerCount?: number;
  avgDailyWorkload?: number;
}

interface WorkerRecord {
  date: string;
  code: string;
  name: string;
  workingHours: string;
  group: string;
  department: string;
  ag: string;
}

export default function Performance() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [allWorkers, setAllWorkers] = useState<WorkerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [filterName, setFilterName] = useState("");
  const [filterCode, setFilterCode] = useState("");
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [mainTableFilterDates, setMainTableFilterDates] = useState<Set<string>>(new Set());
  const [mainTableDateDropdownOpen, setMainTableDateDropdownOpen] = useState(false);
  const [mainTableSearchQuery, setMainTableSearchQuery] = useState("");
  const [mainTableFilterDepartments, setMainTableFilterDepartments] = useState<Set<string>>(new Set());
  const [mainTableDepartmentDropdownOpen, setMainTableDepartmentDropdownOpen] = useState(false);
  const [showAGDistribution, setShowAGDistribution] = useState(false);
  const [showAGGraph, setShowAGGraph] = useState(false);
  const [showAttendanceChart, setShowAttendanceChart] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const mainTableDateDropdownRef = useRef<HTMLDivElement>(null);
  const mainTableDepartmentDropdownRef = useRef<HTMLDivElement>(null);

  const handleRetry = () => {
    setRetryKey((prev) => prev + 1);
  };

  const getGroupWorkers = (groupName: string): WorkerRecord[] => {
    return allWorkers.filter((worker) => {
      const workerGroup = worker.workingHours ? "General" : "General";
      return true;
    });
  };

  const getUniqueDepartments = useMemo(() => {
    const departments = new Set<string>();
    allWorkers.forEach((worker) => {
      if (worker.department) {
        departments.add(worker.department);
      }
    });
    return Array.from(departments).sort();
  }, [allWorkers]);

  const getAllUniqueDatesByMonth = useMemo(() => {
    const datesByMonth = new Map<string, Set<string>>();

    allWorkers.forEach((worker) => {
      try {
        const date = new Date(worker.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!datesByMonth.has(monthKey)) {
          datesByMonth.set(monthKey, new Set());
        }
        datesByMonth.get(monthKey)!.add(worker.date);
      } catch (e) {
        if (!datesByMonth.has("Invalid")) {
          datesByMonth.set("Invalid", new Set());
        }
        datesByMonth.get("Invalid")!.add(worker.date);
      }
    });

    return datesByMonth;
  }, [allWorkers]);

  const getUniqueDatesForGroup = useMemo(() => {
    if (!selectedGroup) return new Map<string, Set<string>>();

    const groupWorkers = allWorkers.filter((worker) => worker.group === selectedGroup);
    const datesByMonth = new Map<string, Set<string>>();

    groupWorkers.forEach((worker) => {
      try {
        const date = new Date(worker.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!datesByMonth.has(monthKey)) {
          datesByMonth.set(monthKey, new Set());
        }
        datesByMonth.get(monthKey)!.add(worker.date);
      } catch (e) {
        if (!datesByMonth.has("Invalid")) {
          datesByMonth.set("Invalid", new Set());
        }
        datesByMonth.get("Invalid")!.add(worker.date);
      }
    });

    return datesByMonth;
  }, [allWorkers, selectedGroup]);

  const getMonthName = (monthKey: string): string => {
    if (monthKey === "Invalid") return "Autres dates";
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  const departmentStats = useMemo(() => {
    const deptMap = new Map<string, { hours: number; count: number }>();
    let totalHours = 0;

    allWorkers.forEach((worker) => {
      const dateMatches = mainTableFilterDates.size === 0 || mainTableFilterDates.has(worker.date);
      const departmentMatches = mainTableFilterDepartments.size === 0 || mainTableFilterDepartments.has(worker.department);
      const searchMatches = !mainTableSearchQuery.trim() || worker.group.toLowerCase().includes(mainTableSearchQuery.toLowerCase());

      if (!dateMatches || !departmentMatches || !searchMatches) return;

      const workingHours = parseFloat(worker.workingHours) || 0;
      if (workingHours > 0) {
        const dept = worker.department || "(Sans département)";
        if (!deptMap.has(dept)) {
          deptMap.set(dept, { hours: 0, count: 0 });
        }
        const current = deptMap.get(dept)!;
        deptMap.set(dept, { hours: current.hours + workingHours, count: current.count + 1 });
        totalHours += workingHours;
      }
    });

    const stats = Array.from(deptMap.entries())
      .map(([dept, data]) => ({
        name: dept,
        hours: data.hours,
        percentage: totalHours > 0 ? ((data.hours / totalHours) * 100).toFixed(1) : "0.0",
        count: data.count,
      }))
      .sort((a, b) => b.hours - a.hours);

    return {
      departments: stats,
      totalHours,
    };
  }, [allWorkers, mainTableFilterDates, mainTableFilterDepartments, mainTableSearchQuery]);

  const workersWithLowHours = useMemo(() => {
    let count = 0;
    let totalWorkers = 0;

    allWorkers.forEach((worker) => {
      const dateMatches = mainTableFilterDates.size === 0 || mainTableFilterDates.has(worker.date);
      const departmentMatches = mainTableFilterDepartments.size === 0 || mainTableFilterDepartments.has(worker.department);
      const searchMatches = !mainTableSearchQuery.trim() || worker.group.toLowerCase().includes(mainTableSearchQuery.toLowerCase());

      if (!dateMatches || !departmentMatches || !searchMatches) return;

      const workingHours = parseFloat(worker.workingHours) || 0;
      if (workingHours > 0) {
        totalWorkers++;
        if (workingHours < 8) {
          count++;
        }
      }
    });

    return {
      count,
      total: totalWorkers,
      percentage: totalWorkers > 0 ? ((count / totalWorkers) * 100).toFixed(1) : "0.0",
    };
  }, [allWorkers, mainTableFilterDates, mainTableFilterDepartments, mainTableSearchQuery]);

  const agStats = useMemo(() => {
    const agDistribution = new Map<string, number>();
    let totalWithAG = 0;

    allWorkers.forEach((worker) => {
      const dateMatches = mainTableFilterDates.size === 0 || mainTableFilterDates.has(worker.date);
      const departmentMatches = mainTableFilterDepartments.size === 0 || mainTableFilterDepartments.has(worker.department);
      const searchMatches = !mainTableSearchQuery.trim() || worker.group.toLowerCase().includes(mainTableSearchQuery.toLowerCase());

      if (!dateMatches || !departmentMatches || !searchMatches) return;

      const agValue = worker.ag.trim();
      if (agValue && agValue !== "" && Number(agValue) > 0) {
        totalWithAG++;
        if (!agDistribution.has(agValue)) {
          agDistribution.set(agValue, 0);
        }
        agDistribution.set(agValue, (agDistribution.get(agValue) || 0) + 1);
      }
    });

    const distribution = Array.from(agDistribution.entries())
      .map(([value, count]) => ({
        value,
        count,
      }))
      .sort((a, b) => {
        const numA = Number(a.value);
        const numB = Number(b.value);
        return numA - numB;
      });

    return {
      totalCount: totalWithAG,
      distribution,
    };
  }, [allWorkers, mainTableFilterDates, mainTableFilterDepartments, mainTableSearchQuery]);

  const groupStatsMap = useMemo(() => {
    const statsMap = new Map<string, { workerCount: number; avgDailyWorkload: number }>();

    const groupData = new Map<
      string,
      {
        attendanceCount: number;
        uniqueDates: Set<string>;
      }
    >();

    allWorkers.forEach((worker) => {
      const workingHours = parseFloat(worker.workingHours) || 0;
      if (workingHours > 0) {
        if (!groupData.has(worker.group)) {
          groupData.set(worker.group, {
            attendanceCount: 0,
            uniqueDates: new Set(),
          });
        }
        const data = groupData.get(worker.group)!;
        data.attendanceCount += 1;
        data.uniqueDates.add(worker.date);
      }
    });

    groupData.forEach((data, groupName) => {
      const avgDaily = data.uniqueDates.size > 0 ? data.attendanceCount / data.uniqueDates.size : 0;
      statsMap.set(groupName, {
        workerCount: data.attendanceCount,
        avgDailyWorkload: avgDaily,
      });
    });

    return statsMap;
  }, [allWorkers]);

  const filteredGroups = useMemo(() => {
    let result = groups;

    // Apply date and department filters
    if (mainTableFilterDates.size > 0 || mainTableFilterDepartments.size > 0) {
      const groupHoursMap = new Map<string, { hours: number; department: string }>();
      allWorkers.forEach((worker) => {
        const dateMatches = mainTableFilterDates.size === 0 || mainTableFilterDates.has(worker.date);
        const departmentMatches = mainTableFilterDepartments.size === 0 || mainTableFilterDepartments.has(worker.department);

        if (dateMatches && departmentMatches) {
          const workingHours = parseFloat(worker.workingHours) || 0;
          if (workingHours > 0) {
            if (!groupHoursMap.has(worker.group)) {
              groupHoursMap.set(worker.group, { hours: 0, department: worker.department });
            }
            const current = groupHoursMap.get(worker.group)!;
            groupHoursMap.set(worker.group, { hours: current.hours + workingHours, department: current.department });
          }
        }
      });

      result = Array.from(groupHoursMap.entries())
        .map(([name, data]) => {
          const stats = groupStatsMap.get(name);
          return {
            name,
            workingHours: data.hours.toString(),
            department: data.department,
            workerCount: stats?.workerCount || 0,
            avgDailyWorkload: stats?.avgDailyWorkload || 0,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result = groups.map((group) => {
        const stats = groupStatsMap.get(group.name);
        return {
          ...group,
          workerCount: stats?.workerCount || 0,
          avgDailyWorkload: stats?.avgDailyWorkload || 0,
        };
      });
    }

    // Apply search filter
    if (mainTableSearchQuery.trim()) {
      const query = mainTableSearchQuery.toLowerCase();
      result = result.filter((group) =>
        group.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [groups, allWorkers, mainTableFilterDates, mainTableFilterDepartments, mainTableSearchQuery, groupStatsMap]);

  const paginationData = useMemo(() => {
    const rowsPerPage = 10;
    const totalPages = Math.ceil(filteredGroups.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = filteredGroups.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      totalPages,
      totalRows: filteredGroups.length,
      currentPage,
    };
  }, [filteredGroups, currentPage]);

  const attendanceChartData = useMemo(() => {
    if (!selectedGroup || !allWorkers || allWorkers.length === 0) {
      return [];
    }

    // Get all unique workers in this group
    const groupWorkers = allWorkers.filter((w) => w.group === selectedGroup);
    const uniqueWorkers = new Set(groupWorkers.map((w) => w.code));

    // Get unique dates and sort them
    const uniqueDates = new Set<string>();
    groupWorkers.forEach((worker) => {
      uniqueDates.add(worker.date);
    });

    // Sort dates and get last 10
    const sortedDates = Array.from(uniqueDates).sort().reverse().slice(0, 10).reverse();

    // Count present workers per date (workers with hours > 0)
    const attendanceByDate = sortedDates.map((date) => {
      const workersOnDate = groupWorkers.filter((worker) => worker.date === date);
      const presentCount = workersOnDate.filter((worker) => {
        const hours = parseFloat(worker.workingHours) || 0;
        return hours > 0; // Worker is present if they have working hours
      }).length;

      return {
        date,
        présents: presentCount,
        total: uniqueWorkers.size, // Total workers in the group
      };
    });

    return attendanceByDate;
  }, [selectedGroup, allWorkers]);

  const filteredWorkers = useMemo(() => {
    if (!selectedGroup) return [];

    const workers = allWorkers.filter((worker) => worker.group === selectedGroup);
    return workers.filter((worker) => {
      const workingHours = parseFloat(worker.workingHours) || 0;
      const hasValue = workingHours > 0;
      const dateMatch = selectedDates.size === 0 || selectedDates.has(worker.date);
      const nameMatch = !filterName || worker.name.toLowerCase().includes(filterName.toLowerCase());
      const codeMatch = !filterCode || worker.code.toLowerCase().includes(filterCode.toLowerCase());
      return hasValue && dateMatch && nameMatch && codeMatch;
    });
  }, [allWorkers, selectedDates, filterName, filterCode, selectedGroup]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchPerformanceData = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);
        setError(null);

        const timeoutId = setTimeout(() => {
          if (!abortController.signal.aborted) {
            abortController.abort();
          }
        }, 180000);

        const response = await fetch("/api/performance", {
          method: "GET",
          signal: abortController.signal,
          headers: { Accept: "application/json" },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!isMounted) return;

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Invalid data format from server");
        }

        const groupHoursMap = new Map<string, number>();
        const workersList: WorkerRecord[] = [];

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !Array.isArray(row)) continue;

          const date = (row[0] || "").toString().trim();
          const code = (row[2] || "").toString().trim();
          const name = (row[3] || "").toString().trim();
          const workingHoursStr = (row[40] || "").toString().trim();
          const group = (row[31] || "").toString().trim();
          const department = (row[36] || "").toString().trim();
          const ag = (row[41] || "").toString().trim();

          if (code && name && date && group) {
            const workingHours = parseFloat(workingHoursStr) || 0;

            workersList.push({
              date,
              code,
              name,
              workingHours: workingHoursStr,
              group,
              department,
              ag,
            });

            if (!groupHoursMap.has(group)) {
              groupHoursMap.set(group, 0);
            }
            if (workingHours > 0) {
              groupHoursMap.set(group, (groupHoursMap.get(group) || 0) + workingHours);
            }
          }
        }

        const groupsArray: Group[] = Array.from(groupHoursMap.entries())
          .map(([name, totalHours]) => ({
            name,
            workingHours: totalHours.toString(),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (isMounted) {
          setGroups(groupsArray);
          setAllWorkers(workersList);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (isMounted) {
          if (err instanceof Error && err.name === "AbortError") {
            console.debug("Data fetch aborted");
            setError("Request timed out. Please try again.");
          } else {
            console.error("Error fetching performance data:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            if (errorMessage.includes("Failed to fetch")) {
              setError(
                "Unable to connect to the server. Please check your internet connection and try again."
              );
            } else {
              setError(
                err instanceof Error
                  ? err.message
                  : "Failed to load performance data. Please try again."
              );
            }
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPerformanceData();

    return () => {
      try {
        isMounted = false;
        if (!abortController.signal.aborted) {
          try {
            abortController.abort();
          } catch (e) {
            // Ignore errors from abort
          }
        }
      } catch (e) {
        // Ignore all cleanup errors
      }
    };
  }, [retryKey]);

  const handleGroupClick = (groupName: string) => {
    setSelectedGroup(groupName);
    setSelectedDates(new Set());
    setFilterName("");
    setFilterCode("");
  };

  const handleCloseModal = () => {
    setSelectedGroup(null);
    setSelectedDates(new Set());
    setFilterName("");
    setFilterCode("");
    setDateDropdownOpen(false);
  };

  const handleToggleDate = (date: string) => {
    const newDates = new Set(selectedDates);
    if (newDates.has(date)) {
      newDates.delete(date);
    } else {
      newDates.add(date);
    }
    setSelectedDates(newDates);
  };

  const handleToggleMonth = (monthKey: string) => {
    const dates = getUniqueDatesForGroup.get(monthKey);
    if (!dates) return;

    const newDates = new Set(selectedDates);
    const allMonthDatesSelected = Array.from(dates).every((date) => newDates.has(date));

    if (allMonthDatesSelected) {
      dates.forEach((date) => newDates.delete(date));
    } else {
      dates.forEach((date) => newDates.add(date));
    }
    setSelectedDates(newDates);
  };

  const handleToggleMainTableMonth = (monthKey: string) => {
    const dates = getAllUniqueDatesByMonth.get(monthKey);
    if (!dates) return;

    const newDates = new Set(mainTableFilterDates);
    const allMonthDatesSelected = Array.from(dates).every((date) => newDates.has(date));

    if (allMonthDatesSelected) {
      dates.forEach((date) => newDates.delete(date));
    } else {
      dates.forEach((date) => newDates.add(date));
    }
    setMainTableFilterDates(newDates);
  };

  const handleClearDates = () => {
    setSelectedDates(new Set());
  };

  const handleClearMainTableDates = () => {
    setMainTableFilterDates(new Set());
  };

  const handleSelectAllDates = () => {
    const allDates = new Set<string>();
    getUniqueDatesForGroup.forEach((dates) => {
      dates.forEach((date) => allDates.add(date));
    });
    setSelectedDates(allDates);
  };

  const handleSelectAllMainTableDates = () => {
    const allDates = new Set<string>();
    getAllUniqueDatesByMonth.forEach((dates) => {
      dates.forEach((date) => allDates.add(date));
    });
    setMainTableFilterDates(allDates);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setDateDropdownOpen(false);
      }
      if (mainTableDateDropdownRef.current && !mainTableDateDropdownRef.current.contains(event.target as Node)) {
        setMainTableDateDropdownOpen(false);
      }
      if (mainTableDepartmentDropdownRef.current && !mainTableDepartmentDropdownRef.current.contains(event.target as Node)) {
        setMainTableDepartmentDropdownOpen(false);
      }
    };

    if (dateDropdownOpen || mainTableDateDropdownOpen || mainTableDepartmentDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dateDropdownOpen, mainTableDateDropdownOpen, mainTableDepartmentDropdownOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [mainTableFilterDates, mainTableFilterDepartments, mainTableSearchQuery]);

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="text-cyan-500 hover:text-cyan-600">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold">Heures et performance ⏱️</h1>
        </div>

        {!loading && allWorkers.length > 0 && (
          <div className="mb-8 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Statistiques</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departmentStats.departments.map((dept) => (
                <div
                  key={dept.name}
                  className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 border border-cyan-200 dark:border-slate-600"
                >
                  <h3 className="font-semibold text-cyan-900 dark:text-cyan-100 mb-2 text-sm">
                    {dept.name}
                  </h3>
                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">
                        {dept.hours.toFixed(1)}h
                      </span>
                      <span className="text-sm text-cyan-600 dark:text-cyan-300">
                        {dept.percentage}% du total
                      </span>
                    </div>
                    <div className="w-full bg-cyan-200 dark:bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-cyan-600 dark:bg-cyan-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Number(dept.percentage)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 border border-orange-200 dark:border-slate-600">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2 text-sm">
                  Moins de 8 heures
                </h3>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                      {workersWithLowHours.count}
                    </span>
                    <span className="text-sm text-orange-600 dark:text-orange-300">
                      {workersWithLowHours.percentage}% du total
                    </span>
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-300">
                    {workersWithLowHours.total} travailleurs au total
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 border border-purple-200 dark:border-slate-600">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 text-sm">
                    Avancement (AG)
                  </h3>
                  <button
                    onClick={() => setShowAGDistribution(true)}
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                    title="Voir la distribution détaillée"
                  >
                    <Info size={16} />
                  </button>
                </div>
                <div className="space-y-1">
                  <span className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                    {agStats.totalCount}
                  </span>
                  <div className="text-xs text-purple-600 dark:text-purple-300">
                    travailleurs avec AG
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <AlertDescription>{error}</AlertDescription>
              </div>
              <Button
                onClick={handleRetry}
                disabled={loading}
                size="sm"
                variant="outline"
                className="flex-shrink-0"
              >
                <RotateCcw size={16} className="mr-2" />
                Réessayer
              </Button>
            </div>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Chargement des données...</p>
            </div>
          </div>
        ) : groups.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Aucune donnée de groupe disponible.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rechercher
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom de groupe..."
                    value={mainTableSearchQuery}
                    onChange={(e) => setMainTableSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  {mainTableSearchQuery && (
                    <button
                      onClick={() => setMainTableSearchQuery("")}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div ref={mainTableDepartmentDropdownRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrer par Département
                </label>
                <button
                  onClick={() => setMainTableDepartmentDropdownOpen(!mainTableDepartmentDropdownOpen)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <span className="text-sm">
                    {mainTableFilterDepartments.size === 0
                      ? "Sélectionner des départements..."
                      : `${mainTableFilterDepartments.size} département${mainTableFilterDepartments.size !== 1 ? "s" : ""} sélectionné${mainTableFilterDepartments.size !== 1 ? "s" : ""}`}
                  </span>
                  <ChevronDown size={16} className={`transition-transform ${mainTableDepartmentDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {mainTableDepartmentDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="sticky top-0 bg-gray-50 dark:bg-slate-700 p-2 border-b border-gray-200 dark:border-slate-600 flex gap-2">
                      <button
                        onClick={() => {
                          const allDepts = new Set(getUniqueDepartments);
                          setMainTableFilterDepartments(allDepts);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-cyan-500 hover:bg-cyan-600 text-white rounded transition-colors"
                      >
                        Tout sélectionner
                      </button>
                      <button
                        onClick={() => setMainTableFilterDepartments(new Set())}
                        className="flex-1 px-2 py-1 text-xs bg-gray-300 hover:bg-gray-400 dark:bg-slate-600 dark:hover:bg-slate-500 text-gray-900 dark:text-white rounded transition-colors"
                      >
                        Effacer
                      </button>
                    </div>
                    <div className="p-2 space-y-1">
                      {getUniqueDepartments.map((dept) => (
                        <label
                          key={dept}
                          className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 dark:hover:bg-slate-700 rounded cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={mainTableFilterDepartments.has(dept)}
                            onChange={() => {
                              const newDepts = new Set(mainTableFilterDepartments);
                              if (newDepts.has(dept)) {
                                newDepts.delete(dept);
                              } else {
                                newDepts.add(dept);
                              }
                              setMainTableFilterDepartments(newDepts);
                            }}
                            className="rounded w-4 h-4 text-cyan-500 focus:ring-cyan-500"
                          />
                          <span className="text-gray-700 dark:text-gray-300">{dept || "(Sans département)"}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrer par Date
                </label>
                <button
                  onClick={() => setMainTableDateDropdownOpen(!mainTableDateDropdownOpen)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                  <span className="text-sm">
                    {mainTableFilterDates.size === 0
                      ? "S��lectionner des dates..."
                      : `${mainTableFilterDates.size} date${mainTableFilterDates.size !== 1 ? "s" : ""} sélectionnée${mainTableFilterDates.size !== 1 ? "s" : ""}`}
                  </span>
                  <ChevronDown size={16} className={`transition-transform ${mainTableDateDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {mainTableDateDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="sticky top-0 bg-gray-50 dark:bg-slate-700 p-2 border-b border-gray-200 dark:border-slate-600 flex gap-2">
                    <button
                      onClick={handleSelectAllMainTableDates}
                      className="flex-1 px-2 py-1 text-xs bg-cyan-500 hover:bg-cyan-600 text-white rounded transition-colors"
                    >
                      Tout sélectionner
                    </button>
                    <button
                      onClick={handleClearMainTableDates}
                      className="flex-1 px-2 py-1 text-xs bg-gray-300 hover:bg-gray-400 dark:bg-slate-600 dark:hover:bg-slate-500 text-gray-900 dark:text-white rounded transition-colors"
                    >
                      Effacer
                    </button>
                  </div>
                  <div className="p-2 space-y-1">
                    {Array.from(getAllUniqueDatesByMonth.entries()).map(([monthKey, dates]) => {
                      const allMonthDatesSelected = Array.from(dates).every((date) => mainTableFilterDates.has(date));
                      return (
                        <div key={monthKey}>
                          <button
                            onClick={() => handleToggleMainTableMonth(monthKey)}
                            className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors ${
                              allMonthDatesSelected
                                ? "bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100"
                                : "hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {getMonthName(monthKey)}
                          </button>
                          <div className="ml-2 space-y-1">
                            {Array.from(dates)
                              .sort()
                              .map((date) => (
                                <label
                                  key={date}
                                  className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 dark:hover:bg-slate-700 rounded cursor-pointer text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    checked={mainTableFilterDates.has(date)}
                                    onChange={() => {
                                      const newDates = new Set(mainTableFilterDates);
                                      if (newDates.has(date)) {
                                        newDates.delete(date);
                                      } else {
                                        newDates.add(date);
                                      }
                                      setMainTableFilterDates(newDates);
                                    }}
                                    className="rounded w-4 h-4 text-cyan-500 focus:ring-cyan-500"
                                  />
                                  <span className="text-gray-700 dark:text-gray-300">{date}</span>
                                </label>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-900 dark:text-white">Groupe</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-900 dark:text-white">Heures de travail</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-900 dark:text-white">Nombre d'Ouvriers</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-900 dark:text-white">Moyenne</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginationData.data.map((group) => (
                    <tr
                      key={group.name}
                      className="border-b border-gray-200 dark:border-slate-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                        {group.name}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {group.workingHours || "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {group.workerCount || 0}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {group.avgDailyWorkload ? group.avgDailyWorkload.toFixed(2) : "-"} T/J
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleGroupClick(group.name)}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-sm transition-colors"
                          title="Voir les détails"
                        >
                          <Info size={16} />
                          <span>Infos</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Affichage de {paginationData.data.length > 0 ? (paginationData.currentPage - 1) * 10 + 1 : 0} à{" "}
                {Math.min(paginationData.currentPage * 10, paginationData.totalRows)} sur {paginationData.totalRows} résultats
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={paginationData.currentPage === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Précédent
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 rounded-lg border border-gray-300 dark:border-slate-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Page {paginationData.currentPage} sur {paginationData.totalPages || 1}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(paginationData.totalPages, prev + 1))}
                  disabled={paginationData.currentPage === paginationData.totalPages}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Suivant
                </button>
              </div>
            </div>
            </div>
          </div>
        )}

        {selectedGroup && (
          <Dialog open={!!selectedGroup} onOpenChange={(open) => {
            if (!open) {
              handleCloseModal();
            }
          }}>
            <DialogContent className="max-w-4xl !top-[10vh] !translate-y-0 h-[80vh] overflow-y-auto">
              <DialogHeader className="flex flex-row items-start justify-between">
                <div className="flex-1">
                  <DialogTitle>Détails du groupe: {selectedGroup}</DialogTitle>
                  <DialogDescription>
                    Liste des travailleurs et leurs heures de travail
                  </DialogDescription>
                </div>
                <button
                  onClick={() => setShowAttendanceChart(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                  title="Afficher le graphique de présence"
                >
                  <BarChart3 size={18} />
                  <span className="text-sm">Présence</span>
                </button>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div ref={dateDropdownRef} className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Filtrer par Date
                    </label>
                    <button
                      onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <span className="text-sm">
                        {selectedDates.size === 0
                          ? "Sélectionner des dates..."
                          : `${selectedDates.size} date${selectedDates.size !== 1 ? "s" : ""} sélectionnée${selectedDates.size !== 1 ? "s" : ""}`}
                      </span>
                      <ChevronDown size={16} className={`transition-transform ${dateDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {dateDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                        <div className="sticky top-0 bg-gray-50 dark:bg-slate-700 p-2 border-b border-gray-200 dark:border-slate-600 flex gap-2">
                          <button
                            onClick={handleSelectAllDates}
                            className="flex-1 px-2 py-1 text-xs bg-cyan-500 hover:bg-cyan-600 text-white rounded transition-colors"
                          >
                            Tout sélectionner
                          </button>
                          <button
                            onClick={handleClearDates}
                            className="flex-1 px-2 py-1 text-xs bg-gray-300 hover:bg-gray-400 dark:bg-slate-600 dark:hover:bg-slate-500 text-gray-900 dark:text-white rounded transition-colors"
                          >
                            Effacer
                          </button>
                        </div>

                        <div className="p-2 space-y-2">
                          {Array.from(getUniqueDatesForGroup.entries())
                            .sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
                            .map(([monthKey, dates]) => {
                              const datesArray = Array.from(dates).sort().reverse();
                              const allMonthDatesSelected = datesArray.every((date) => selectedDates.has(date));

                              return (
                                <div key={monthKey} className="space-y-1">
                                  <label className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={allMonthDatesSelected}
                                      onChange={() => handleToggleMonth(monthKey)}
                                      className="rounded h-4 w-4 cursor-pointer"
                                    />
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {getMonthName(monthKey)}
                                    </span>
                                  </label>

                                  <div className="ml-6 space-y-1">
                                    {datesArray.map((date) => (
                                      <label
                                        key={date}
                                        className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors text-sm"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selectedDates.has(date)}
                                          onChange={() => handleToggleDate(date)}
                                          className="rounded h-3 w-3 cursor-pointer"
                                        />
                                        <span className="text-gray-700 dark:text-gray-300">{date}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="filter-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Filtrer par Nom
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                      <input
                        type="text"
                        id="filter-name"
                        placeholder="Rechercher un nom..."
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="filter-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Filtrer par Code
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                      <input
                        type="text"
                        id="filter-code"
                        placeholder="Rechercher un code..."
                        value={filterCode}
                        onChange={(e) => setFilterCode(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Total: {filteredWorkers.length} enregistrement{filteredWorkers.length !== 1 ? "s" : ""} affiché{filteredWorkers.length !== 1 ? "s" : ""}
                </div>

                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Code</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Nom ET Prénom</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">TH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWorkers.length > 0 ? (
                        filteredWorkers.map((worker, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-gray-200 dark:border-slate-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-800"
                          >
                            <td className="px-4 py-3 text-gray-900 dark:text-white">{worker.date}</td>
                            <td className="px-4 py-3 text-gray-900 dark:text-white">{worker.code}</td>
                            <td className="px-4 py-3 text-gray-900 dark:text-white">{worker.name}</td>
                            <td className="px-4 py-3 text-gray-900 dark:text-white">{worker.workingHours}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            Aucun enregistrement trouvé
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showAGDistribution && (
          <Dialog open={showAGDistribution} onOpenChange={setShowAGDistribution}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Distribution de l'Avancement (AG)</DialogTitle>
                <DialogDescription>
                  Nombre de travailleurs par valeur AG
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {agStats.distribution.length > 0 ? (
                  <>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {agStats.distribution.map((item) => (
                        <div
                          key={item.value}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
                        >
                          <span className="font-medium text-gray-900 dark:text-white">
                             {item.value} H SUP
                          </span>
                          <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                            {item.count} personne{item.count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Total
                        </span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {agStats.totalCount} personne{agStats.totalCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAGGraph(true)}
                      className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <BarChart3 size={18} />
                      Afficher le Graphique
                    </button>
                  </>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    Aucune donnée AG disponible
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showAGGraph && (
          <Dialog open={showAGGraph} onOpenChange={setShowAGGraph}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Distribution de l'Avancement (AG) - Graphique</DialogTitle>
                <DialogDescription>
                  Visualisation du nombre de travailleurs par valeur AG
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {agStats.distribution.length > 0 ? (
                  <div className="w-full h-96 bg-white dark:bg-slate-900 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agStats.distribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="value" label={{ value: "Heures Supplémentaires (AG)", position: "insideBottom", offset: -5 }} />
                        <YAxis label={{ value: "Nombre de Travailleurs", angle: -90, position: "insideLeft" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value) => [`${value} personne(s)`, "Travailleurs"]}
                          labelFormatter={(label) => `${label} H SUP`}
                        />
                        <Legend />
                        <Bar dataKey="count" fill="#9333ea" name="Nombre de Travailleurs" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    Aucune donnée AG disponible
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showAttendanceChart && selectedGroup && (
          <Dialog open={showAttendanceChart} onOpenChange={setShowAttendanceChart}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Présence - {selectedGroup} (10 derniers jours)</DialogTitle>
                <DialogDescription>
                  Nombre de travailleurs présents par jour
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {attendanceChartData.length > 0 ? (
                  <>
                    <div className="w-full h-96 bg-white dark:bg-slate-900 rounded-lg p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={attendanceChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            label={{ value: "Date", position: "insideBottomRight", offset: -10 }}
                          />
                          <YAxis
                            label={{ value: "Nombre de Travailleurs Présents", angle: -90, position: "insideLeft" }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                            formatter={(value, name) => {
                              if (name === 'présents') return [`${value} présents`, 'Présents'];
                              if (name === 'total') return [`${value} total`, 'Total'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="présents"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', r: 4 }}
                            activeDot={{ r: 6 }}
                            name="Présents"
                          />
                          <Line
                            type="monotone"
                            dataKey="total"
                            stroke="#9ca3af"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: '#9ca3af', r: 4 }}
                            activeDot={{ r: 6 }}
                            name="Total"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {attendanceChartData.map((day) => (
                          <div key={day.date} className="text-center">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{day.date}</div>
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{day.présents}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">/ {day.total}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {day.total > 0 ? Math.round((day.présents / day.total) * 100) : 0}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    Aucune donnée de présence disponible
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}
