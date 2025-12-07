import { useEffect, useState } from "react";
import Layout from "./Layout";
import ExcelUploadSection from "./ExcelUploadSection";
import { Link } from "react-router-dom";
import { ArrowLeft, AlertCircle, RotateCcw, ChevronLeft, ChevronRight, Search, X, Info, Download, BarChart3 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import * as XLSX from "xlsx";

interface GroupStats {
  name: string;
  total: number;
  present: number;
  absent: number;
  presentRate: number;
}

interface ContractStats {
  name: string;
  total: number;
  present: number;
  absent: number;
  presentRate: number;
}

interface CategoryStats {
  name: string;
  total: number;
  present: number;
  absent: number;
  presentRate: number;
}

interface AttendanceRecord {
  code: string;
  name: string;
  status: "P" | "A";
}

const ITEMS_PER_PAGE = 10;

export default function AttendanceChart() {
  const [rawData, setRawData] = useState<any[]>([]);
  const [groupStats, setGroupStats] = useState<GroupStats[]>([]);
  const [contractStats, setContractStats] = useState<ContractStats[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [groupPage, setGroupPage] = useState(1);
  const [contractPage, setContractPage] = useState(1);
  const [groupSearch, setGroupSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "present" | "absent">("all");
  const [modalSearch, setModalSearch] = useState("");
  const [groupAttendanceFilter, setGroupAttendanceFilter] = useState<"all" | "present" | "absent">("all");
  const [showContractGraph, setShowContractGraph] = useState(false);
  const [contractAttendanceFilter, setContractAttendanceFilter] = useState<"all" | "present" | "absent">("all");

  const handleRetry = () => {
    setRetryKey((prev) => prev + 1);
  };

  const handleGroupSearchChange = (value: string) => {
    setGroupSearch(value);
    setGroupPage(1);
  };

  const getGroupAttendanceRecords = (groupName: string): AttendanceRecord[] => {
    const records: AttendanceRecord[] = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || !Array.isArray(row)) continue;

      const group = (row[31] || "").toString().trim();
      if (group !== groupName) continue;

      const code = (row[2] || "").toString().trim();
      const name = (row[3] || "").toString().trim();
      const attendance = (row[10] || "").toString().trim().toUpperCase();

      if (code && name) {
        const status = attendance === "T" ? "P" : "A";
        records.push({ code, name, status });
      }
    }

    return records;
  };

  const getFilteredAttendanceRecords = (records: AttendanceRecord[], searchQuery: string = ""): AttendanceRecord[] => {
    let filtered = records;

    // Filter by attendance status
    if (attendanceFilter === "present") {
      filtered = filtered.filter((r) => r.status === "P");
    } else if (attendanceFilter === "absent") {
      filtered = filtered.filter((r) => r.status === "A");
    }

    // Filter by search query (code or name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => r.code.toLowerCase().includes(query) || r.name.toLowerCase().includes(query));
    }

    return filtered;
  };

  const processAttendanceData = (data: any[], selectedCategory: string = "all") => {
    const groupMap: Record<string, { total: number; present: number; absent: number }> = {};
    const contractMap: Record<string, { total: number; present: number; absent: number }> = {};
    const categoryMap: Record<string, { total: number; present: number; absent: number }> = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !Array.isArray(row)) continue;

      const group = (row[31] || "").toString().trim();
      const contract = (row[34] || "").toString().trim();
      const category = (row[36] || "").toString().trim();
      const attendance = (row[10] || "").toString().trim().toUpperCase();

      // Skip if category filter is set (and not "all") and doesn't match
      if (selectedCategory !== "all" && category !== selectedCategory) continue;

      if (!group && !contract && !category) continue;

      if (group) {
        if (!groupMap[group]) {
          groupMap[group] = { total: 0, present: 0, absent: 0 };
        }
        groupMap[group].total++;
        if (attendance === "T") {
          groupMap[group].present++;
        } else if (attendance === "I") {
          groupMap[group].absent++;
        }
      }

      if (contract) {
        if (!contractMap[contract]) {
          contractMap[contract] = { total: 0, present: 0, absent: 0 };
        }
        contractMap[contract].total++;
        if (attendance === "T") {
          contractMap[contract].present++;
        } else if (attendance === "I") {
          contractMap[contract].absent++;
        }
      }

      if (category) {
        if (!categoryMap[category]) {
          categoryMap[category] = { total: 0, present: 0, absent: 0 };
        }
        categoryMap[category].total++;
        if (attendance === "T") {
          categoryMap[category].present++;
        } else if (attendance === "I") {
          categoryMap[category].absent++;
        }
      }
    }

    const groupStatsArray: GroupStats[] = Object.entries(groupMap)
      .map(([name, stats]) => ({
        name,
        ...stats,
        presentRate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const contractStatsArray: ContractStats[] = Object.entries(contractMap)
      .map(([name, stats]) => ({
        name,
        ...stats,
        presentRate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const categoryStatsArray: CategoryStats[] = Object.entries(categoryMap)
      .map(([name, stats]) => ({
        name,
        ...stats,
        presentRate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return { groupStatsArray, contractStatsArray, categoryStatsArray };
  };

  const getFilteredGroups = () => {
    let filtered = groupStats;

    // Filter by search
    if (groupSearch.trim()) {
      filtered = filtered.filter((group) =>
        group.name.toLowerCase().includes(groupSearch.toLowerCase())
      );
    }

    // Filter by attendance status
    if (groupAttendanceFilter === "present") {
      filtered = filtered.filter((group) => group.presentRate > 0);
    } else if (groupAttendanceFilter === "absent") {
      filtered = filtered.filter((group) => group.presentRate === 0);
    }

    return filtered;
  };

  const getFilteredContracts = () => {
    let filtered = contractStats;

    // Filter by attendance status
    if (contractAttendanceFilter === "present") {
      filtered = filtered.filter((contract) => contract.presentRate > 0);
    } else if (contractAttendanceFilter === "absent") {
      filtered = filtered.filter((contract) => contract.presentRate === 0);
    }

    return filtered;
  };

  const downloadGroupsAsExcel = () => {
    const filteredGroups = getFilteredGroups();

    // Create data array with headers
    const data = [
      ["Groupe", "Total Travailleurs", "Présents", "Absents", "Taux Présence (%)"],
      ...filteredGroups.map((group) => [
        group.name,
        group.total,
        group.present,
        group.absent,
        `${group.presentRate}%`,
      ]),
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws["!cols"] = [
      { wch: 30 }, // Groupe
      { wch: 18 }, // Total
      { wch: 12 }, // Présents
      { wch: 12 }, // Absents
      { wch: 16 }, // Taux Présence
    ];

    // Style the header row
    const headerStyle = {
      fill: { fgColor: { rgb: "4B5563" } },
      font: { bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      },
    };

    // Apply header style
    for (let i = 0; i < 5; i++) {
      const cellAddress = XLSX.utils.encode_col(i) + "1";
      if (ws[cellAddress]) {
        ws[cellAddress].s = headerStyle;
      }
    }

    // Apply data row styles
    for (let i = 2; i <= data.length; i++) {
      for (let j = 0; j < 5; j++) {
        const cellAddress = XLSX.utils.encode_col(j) + i;
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            alignment: { horizontal: j === 0 ? "left" : "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "D3D3D3" } },
              bottom: { style: "thin", color: { rgb: "D3D3D3" } },
              left: { style: "thin", color: { rgb: "D3D3D3" } },
              right: { style: "thin", color: { rgb: "D3D3D3" } },
            },
          };
        }
      }
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statistiques Groupe");

    // Download file
    const fileName = `statistiques_groupe_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getGroupsPaginated = () => {
    const filtered = getFilteredGroups();
    const start = (groupPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  };

  const getContractsPaginated = () => {
    const start = (contractPage - 1) * ITEMS_PER_PAGE;
    return contractStats.slice(start, start + ITEMS_PER_PAGE);
  };

  const groupTotalPages = Math.ceil(getFilteredGroups().length / ITEMS_PER_PAGE);
  const contractTotalPages = Math.ceil(contractStats.length / ITEMS_PER_PAGE);

  const getOverallStats = () => {
    const totalPresent = groupStats.reduce((sum, group) => sum + group.present, 0);
    const totalAbsent = groupStats.reduce((sum, group) => sum + group.absent, 0);
    const totalWorkers = totalPresent + totalAbsent;
    const attendanceRate = totalWorkers > 0 ? Math.round((totalPresent / totalWorkers) * 100) : 0;
    const absenceRate = totalWorkers > 0 ? Math.round((totalAbsent / totalWorkers) * 100) : 0;

    return { totalPresent, totalAbsent, totalWorkers, attendanceRate, absenceRate };
  };

  useEffect(() => {
    let isMounted = true;
    const abortControllers: AbortController[] = [];

    const fetchAttendanceData = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);
        setError(null);

        let response: Response | null = null;
        let lastError: Error | null = null;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          if (!isMounted) break;
          let timeout: NodeJS.Timeout | null = null;
          try {
            const controller = new AbortController();
            abortControllers.push(controller);
            timeout = setTimeout(() => controller.abort(), 25000);

            console.log(`Frontend attempt ${attempt} to fetch attendance data...`);
            response = await fetch("/api/attendance", {
              method: "GET",
              signal: controller.signal,
              headers: { Accept: "application/json" }
            });

            if (timeout) clearTimeout(timeout);

            if (response && response.ok) {
              console.log(`Successfully fetched on attempt ${attempt}`);
              break;
            }

            if (response && !response.ok) {
              lastError = new Error(`Server responded with status ${response.status}`);
            }
          } catch (e) {
            if (timeout) clearTimeout(timeout);
            lastError = e instanceof Error ? e : new Error(String(e));
            console.error(`Attempt ${attempt} failed:`, lastError.message);

            if (attempt < maxRetries && isMounted) {
              console.log(`Waiting before retry ${attempt + 1}...`);
              await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
            }
          }
        }

        if (!isMounted) return;

        if (!response || !response.ok) {
          throw lastError || new Error("Failed to fetch attendance data after multiple attempts. Please try refreshing the page.");
        }

        const data = await response.json();

        if (!isMounted) return;

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Invalid data format from server");
        }

        console.log("Header row:", data[0]);
        console.log("Sample data row:", data[1]);
        console.log("Sample row[31] (AF):", data[1]?.[31]);
        console.log("Sample row[34] (AI):", data[1]?.[34]);

        const { groupStatsArray, contractStatsArray, categoryStatsArray } = processAttendanceData(data);

        if (isMounted) {
          setRawData(data);
          setGroupStats(groupStatsArray);
          setContractStats(contractStatsArray);
          setCategoryStats(categoryStatsArray);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching attendance data:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load attendance data. Please check your connection and try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAttendanceData();

    return () => {
      isMounted = false;
      abortControllers.forEach(controller => {
        try {
          controller.abort();
        } catch (e) {
          // Silently ignore abort errors on cleanup
        }
      });
    };
  }, [retryKey]);

  useEffect(() => {
    if (rawData.length > 0) {
      const { groupStatsArray, contractStatsArray, categoryStatsArray } = processAttendanceData(rawData, categoryFilter);
      setGroupStats(groupStatsArray);
      setContractStats(contractStatsArray);
      setCategoryStats(categoryStatsArray);
      setGroupPage(1);
      setContractPage(1);
    }
  }, [categoryFilter]);

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="text-cyan-500 hover:text-cyan-600">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold">Présence et absentéisme 📅</h1>
        </div>

        {/* Excel Upload Section */}
        <div className="mb-10">
          <ExcelUploadSection />
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrer par catégorie:</label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Toutes les departement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les departement</SelectItem>
                <SelectItem value="CAMPO">CAMPO</SelectItem>
                <SelectItem value="ALMACEN">ALMACEN</SelectItem>
                <SelectItem value="ESTRUCTURA">ESTRUCTURA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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
        ) : groupStats.length === 0 && contractStats.length === 0 && categoryStats.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Aucune donnée de présence disponible.</AlertDescription>
          </Alert>
        ) : (
          <>
            {(() => {
              const stats = getOverallStats();
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                  <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Travailleurs</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalWorkers}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">effectif global</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Présents</p>
                    <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{stats.totalPresent}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">travailleurs</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Absents</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.totalAbsent}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">travailleurs</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Taux de présence</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.attendanceRate}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">taux global</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Taux d'absence</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.absenceRate}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">taux global</p>
                  </div>
                </div>
              );
            })()}
            {categoryStats.length > 0 && (
              <div className="mt-8 bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-6">Attendants par Catégorie</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => value}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <Bar dataKey="total" fill="#3b82f6" name="Total" />
                    <Bar dataKey="present" fill="#10b981" name="Présents" />
                    <Bar dataKey="absent" fill="#ef4444" name="Absents" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryStats.map((category) => (
                    <div key={category.name} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                      <p className="font-semibold text-gray-900 dark:text-white mb-3">{category.name}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Total:</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">{category.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Présents:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">{category.present}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Absents:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">{category.absent}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-slate-700">
                          <span className="text-gray-600 dark:text-gray-400">Taux présence:</span>
                          <span className="font-medium text-purple-600 dark:text-purple-400">{category.presentRate}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Statistiques par groupe</h3>
                  <button
                    onClick={downloadGroupsAsExcel}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                    title="Télécharger en Excel"
                  >
                    <Download size={16} />
                    <span>Télécharger</span>
                  </button>
                </div>

                {/* Attendance Filter Checkboxes */}
                <div className="mb-4 flex items-center gap-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="groupAttendance"
                      value="all"
                      checked={groupAttendanceFilter === "all"}
                      onChange={(e) => setGroupAttendanceFilter(e.target.value as "all" | "present" | "absent")}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Tous</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="groupAttendance"
                      value="present"
                      checked={groupAttendanceFilter === "present"}
                      onChange={(e) => setGroupAttendanceFilter(e.target.value as "all" | "present" | "absent")}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">Présent équipé</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="groupAttendance"
                      value="absent"
                      checked={groupAttendanceFilter === "absent"}
                      onChange={(e) => setGroupAttendanceFilter(e.target.value as "all" | "present" | "absent")}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-red-600 dark:text-red-400 font-medium">Absent équipé</span>
                  </label>
                </div>

                <div className="mb-4 relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                    <input
                      type="text"
                      placeholder="Rechercher un groupe..."
                      value={groupSearch}
                      onChange={(e) => handleGroupSearchChange(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    {groupSearch && (
                      <button
                        onClick={() => handleGroupSearchChange("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        aria-label="Clear search"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                  {groupSearch && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {getFilteredGroups().length} groupe{getFilteredGroups().length !== 1 ? "s" : ""} trouvé{getFilteredGroups().length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div className="space-y-2 bg-white dark:bg-slate-900 rounded-lg shadow p-4">
                  {getGroupsPaginated().map((group) => (
                    <div key={group.name} className="flex items-center justify-between py-2 border-b dark:border-slate-700 last:border-b-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{group.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total: {group.total} travailleurs</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm"><span className="text-cyan-600 dark:text-cyan-400 font-semibold">{group.present}</span> / <span className="text-red-600 dark:text-red-400 font-semibold">{group.absent}</span></p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{group.presentRate}% présents</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedGroup(group.name);
                            setAttendanceFilter("all");
                            setModalSearch("");
                          }}
                          className="flex items-center gap-2 px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-sm transition"
                          title="Voir les détails"
                        >
                          <Info size={16} />
                          <span>Infos</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {getGroupsPaginated().length === 0 && groupSearch && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">Aucun groupe trouvé avec "{groupSearch}"</p>
                    </div>
                  )}
                </div>
                {groupTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => setGroupPage((p) => Math.max(1, p - 1))}
                      disabled={groupPage === 1}
                      className="p-2 rounded border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {Array.from({ length: groupTotalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setGroupPage(page)}
                        className={`px-3 py-1 rounded text-sm transition ${
                          groupPage === page
                            ? "bg-cyan-500 text-white"
                            : "border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setGroupPage((p) => Math.min(groupTotalPages, p + 1))}
                      disabled={groupPage === groupTotalPages}
                      className="p-2 rounded border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                      aria-label="Next page"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Statistiques par contrat</h3>
                  <button
                    onClick={() => setShowContractGraph(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    title="Afficher le graphique"
                  >
                    <BarChart3 size={16} />
                    <span>Graphique</span>
                  </button>
                </div>
                <div className="space-y-2 bg-white dark:bg-slate-900 rounded-lg shadow p-4">
                  {getContractsPaginated().map((contract) => (
                    <div key={contract.name} className="flex items-center justify-between py-2 border-b dark:border-slate-700 last:border-b-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{contract.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total: {contract.total} travailleurs</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm"><span className="text-cyan-600 dark:text-cyan-400 font-semibold">{contract.present}</span> / <span className="text-red-600 dark:text-red-400 font-semibold">{contract.absent}</span></p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{contract.presentRate}% présents</p>
                      </div>
                    </div>
                  ))}
                </div>
                {contractTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => setContractPage((p) => Math.max(1, p - 1))}
                      disabled={contractPage === 1}
                      className="p-2 rounded border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {Array.from({ length: contractTotalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setContractPage(page)}
                        className={`px-3 py-1 rounded text-sm transition ${
                          contractPage === page
                            ? "bg-cyan-500 text-white"
                            : "border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setContractPage((p) => Math.min(contractTotalPages, p + 1))}
                      disabled={contractPage === contractTotalPages}
                      className="p-2 rounded border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                      aria-label="Next page"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {selectedGroup && (
          <Dialog open={!!selectedGroup} onOpenChange={(open) => {
            if (!open) {
              setSelectedGroup(null);
              setModalSearch("");
            }
          }}>
            <DialogContent className="max-w-4xl !top-[10vh] !translate-y-0 h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Détails du groupe: {selectedGroup}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="radio"
                        name="attendance-filter"
                        value="all"
                        checked={attendanceFilter === "all"}
                        onChange={() => setAttendanceFilter("all")}
                        className="h-4 w-4"
                      />
                      Tous
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="radio"
                        name="attendance-filter"
                        value="present"
                        checked={attendanceFilter === "present"}
                        onChange={() => setAttendanceFilter("present")}
                        className="h-4 w-4"
                      />
                      Présents
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="radio"
                        name="attendance-filter"
                        value="absent"
                        checked={attendanceFilter === "absent"}
                        onChange={() => setAttendanceFilter("absent")}
                        className="h-4 w-4"
                      />
                      Absents
                    </label>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Total: {getFilteredAttendanceRecords(getGroupAttendanceRecords(selectedGroup), modalSearch).length} employee{getFilteredAttendanceRecords(getGroupAttendanceRecords(selectedGroup), modalSearch).length !== 1 ? "s" : ""} shown
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                  <input
                    type="text"
                    placeholder="Rechercher par code ou nom..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  {modalSearch && (
                    <button
                      onClick={() => setModalSearch("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label="Clear search"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">Code</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">Nom</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">Présence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredAttendanceRecords(getGroupAttendanceRecords(selectedGroup), modalSearch).map((record, idx) => (
                        <tr key={idx} className="border-b border-gray-200 dark:border-slate-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-800">
                          <td className="px-4 py-2 text-gray-900 dark:text-white">{record.code}</td>
                          <td className="px-4 py-2 text-gray-900 dark:text-white">{record.name}</td>
                          <td className="px-4 py-2 text-center">
                            <span
                              className={`inline-block px-2 py-1 rounded text-white text-xs font-semibold ${
                                record.status === "P"
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            >
                              {record.status === "P" ? "P - Présent" : "A - Absent"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {getFilteredAttendanceRecords(getGroupAttendanceRecords(selectedGroup), modalSearch).length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Aucun enregistrement trouvé
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showContractGraph && (
          <Dialog open={showContractGraph} onOpenChange={setShowContractGraph}>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto mt-[10%] mb-[20%]">
              <DialogHeader className="sticky top-0 bg-white dark:bg-slate-900 z-10 pb-4">
                <DialogTitle>Statistiques par Contrat - Graphique</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pr-4">
                {/* Attendance Filter for Contract */}
                <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contractAttendance"
                      value="all"
                      checked={contractAttendanceFilter === "all"}
                      onChange={(e) => setContractAttendanceFilter(e.target.value as "all" | "present" | "absent")}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Tous</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contractAttendance"
                      value="present"
                      checked={contractAttendanceFilter === "present"}
                      onChange={(e) => setContractAttendanceFilter(e.target.value as "all" | "present" | "absent")}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">Présent</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contractAttendance"
                      value="absent"
                      checked={contractAttendanceFilter === "absent"}
                      onChange={(e) => setContractAttendanceFilter(e.target.value as "all" | "present" | "absent")}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-red-600 dark:text-red-400 font-medium">Absent</span>
                  </label>
                </div>

                {/* Bar Chart for Contracts */}
                {getFilteredContracts().length > 0 ? (
                  <div className="w-full h-96 bg-white dark:bg-slate-900 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getFilteredContracts()} margin={{ top: 40, right: 30, left: 30, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis label={{ value: "Nombre de Travailleurs", angle: -90, position: "insideLeft" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            border: "none",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                        />
                        <Legend />
                        <Bar dataKey="present" fill="#10b981" name="Présents" />
                        <Bar dataKey="absent" fill="#ef4444" name="Absents" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Aucun contrat ne correspond aux filtres sélectionnés
                  </div>
                )}

                {/* Contract Details Table */}
                {getFilteredContracts().length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                          <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">Contrat</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">Total</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">Présents</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">Absents</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">Taux Présence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredContracts().map((contract) => (
                          <tr
                            key={contract.name}
                            className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                          >
                            <td className="px-4 py-2 text-gray-900 dark:text-white font-medium">{contract.name}</td>
                            <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{contract.total}</td>
                            <td className="px-4 py-2 text-right">
                              <span className="text-green-600 dark:text-green-400 font-semibold">{contract.present}</span>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <span className="text-red-600 dark:text-red-400 font-semibold">{contract.absent}</span>
                            </td>
                            <td className="px-4 py-2 text-right text-purple-600 dark:text-purple-400 font-semibold">
                              {contract.presentRate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
