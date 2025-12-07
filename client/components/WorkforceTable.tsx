import { useEffect, useState } from "react";
import Layout from "./Layout";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface WorkerRow {
  codigo: number;
  matricula: string;
  nombre: string;
  nif: string;
  sexo: string;
  edad: number;
  telefono: string;
  contrato: string;
  centro: string;
  grupo: string;
  encargado: string;
  departamento: string;
  puesto: string;
  fechaAlta: string;
  fechaBaja: string;
  transportista: string;
  prH1: number;
  prH2: number;
  prAS: number;
  baja: string;
}

interface ContractStats {
  totalWorkers: number;
  menCount: number;
  womenCount: number;
}

interface DepartmentStats {
  nombre: string;
  totalWorkers: number;
  contractStats: Record<string, ContractStats>;
}

export default function WorkforceTable() {
  const [departmentStats, setDepartmentStats] = useState<Record<string, DepartmentStats>>({});
  const [allContracts, setAllContracts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Normalize various age formats into one of the five buckets
  const normalizeAgeBucket = (ageRaw: any): string | null => {
    if (ageRaw === null || ageRaw === undefined) return null;
    // If it's a number already
    if (typeof ageRaw === 'number') {
      const age = ageRaw;
      if (isNaN(age)) return null;
      if (age < 20) return '<20';
      if (age < 30) return '20-29';
      if (age < 40) return '30-39';
      if (age < 50) return '40-49';
      return '>50';
    }

    // Otherwise string
    const raw = String(ageRaw).trim();
    if (raw.length === 0) return null;

    // Direct matches like '<20' or '>50'
    const ltMatch = raw.match(/^<\s*(\d{1,3})$/);
    if (ltMatch) {
      const n = Number(ltMatch[1]);
      if (n <= 20) return '<20';
      return '<' + n;
    }
    const gtMatch = raw.match(/^>\s*(\d{1,3})$/);
    if (gtMatch) {
      const n = Number(gtMatch[1]);
      if (n >= 50) return '>50';
      return '>' + n;
    }

    // Range like '20-29' or '20 – 29'
    const rangeMatch = raw.match(/^(\d{1,3})\s*[-–]\s*(\d{1,3})$/);
    if (rangeMatch) {
      const low = Number(rangeMatch[1]);
      const high = Number(rangeMatch[2]);
      if (!isNaN(low) && !isNaN(high)) {
        if (high < 20) return '<20';
        if (low < 20) return '<20';
        if (low >= 20 && high <= 29) return '20-29';
        if (low >= 30 && high <= 39) return '30-39';
        if (low >= 40 && high <= 49) return '40-49';
        if (low >= 50) return '>50';
      }
    }

    // If it's a plain number string
    const numMatch = raw.match(/^(\d{1,3})$/);
    if (numMatch) {
      const n = Number(numMatch[1]);
      if (n < 20) return '<20';
      if (n < 30) return '20-29';
      if (n < 40) return '30-39';
      if (n < 50) return '40-49';
      return '>50';
    }

    // Try to extract first number
    const anyNum = raw.match(/(\d{1,3})/);
    if (anyNum) {
      const n = Number(anyNum[1]);
      if (!isNaN(n)) {
        if (n < 20) return '<20';
        if (n < 30) return '20-29';
        if (n < 40) return '30-39';
        if (n < 50) return '40-49';
        return '>50';
      }
    }

    return null;
  };
  const [ageBuckets, setAgeBuckets] = useState<{ name: string; value: number }[]>([ { name: '<20', value: 0 }, { name: '20-29', value: 0 }, { name: '30-39', value: 0 }, { name: '40-49', value: 0 }, { name: '>50', value: 0 } ]);

  // Helper to process raw workforce array data (Google Script format)
  const processWorkforceData = (data: any[]): { stats: Record<string, DepartmentStats>; contracts: string[]; ageBuckets: { name: string; value: number }[] } => {
    const stats: Record<string, DepartmentStats> = {};
    const contractsSet = new Set<string>();
    const ageMap: Record<string, number> = { '<20': 0, '20-29': 0, '30-39': 0, '40-49': 0, '>50': 0 };

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !Array.isArray(row)) continue;

      const worker: WorkerRow = {
        codigo: row[0] || 0,
        matricula: row[1] || '',
        nombre: row[2] || '',
        nif: row[3] || '',
        sexo: row[4] || '',
        edad: row[5] || 0,
        telefono: row[6] || '',
        contrato: row[7] || '',
        centro: row[8] || '',
        grupo: row[9] || '',
        encargado: row[10] || '',
        departamento: row[11] || '',
        puesto: row[12] || '',
        fechaAlta: row[13] || '',
        fechaBaja: row[14] || '',
        transportista: row[15] || '',
        prH1: row[16] || 0,
        prH2: row[17] || 0,
        prAS: row[18] || 0,
        baja: row[19] || '',
      };

      const dept = worker.departamento?.trim() || '';
      const contract = worker.contrato?.trim() || '';

      // age bucket
      const bucket = normalizeAgeBucket(worker.edad);
      if (bucket) ageMap[bucket] = (ageMap[bucket] || 0) + 1;

      if (!dept) continue;

      contractsSet.add(contract);

      if (!stats[dept]) {
        stats[dept] = { nombre: dept, totalWorkers: 0, contractStats: {} };
      }

      stats[dept].totalWorkers++;

      if (!stats[dept].contractStats[contract]) {
        stats[dept].contractStats[contract] = { totalWorkers: 0, menCount: 0, womenCount: 0 };
      }

      stats[dept].contractStats[contract].totalWorkers++;

      const isWoman = worker.sexo !== 'H' && worker.sexo !== '';
      if (isWoman) {
        stats[dept].contractStats[contract].womenCount++;
      } else if (worker.sexo === 'H') {
        stats[dept].contractStats[contract].menCount++;
      }
    }

    const ageBuckets = [
      { name: '<20', value: ageMap['<20'] },
      { name: '20-29', value: ageMap['20-29'] },
      { name: '30-39', value: ageMap['30-39'] },
      { name: '40-49', value: ageMap['40-49'] },
      { name: '>50', value: ageMap['>50'] },
    ];

    return { stats, contracts: Array.from(contractsSet).sort(), ageBuckets };
  };

  // Sample fallback dataset (header row then rows). Used when remote API is unreachable.
  const fallbackData = [
    ['codigo','matricula','nombre','nif','sexo','edad','telefono','contrato','centro','grupo','encargado','departamento','puesto','fechaAlta','fechaBaja','transportista','prH1','prH2','prAS','baja'],
    [1,'M001','Juan Perez','NIF1','H',30,'','Fijo','C1','G1','','Campo','Puesto A','','','','',0,0,''],
    [2,'M002','Maria Lopez','NIF2','F',28,'','Temporal','C1','G1','','Almacen','Puesto B','','','','',0,0,''],
    [3,'M003','Ana Gomez','NIF3','F',35,'','Fijo','C1','G1','','Estructora','Puesto C','','','','',0,0,''],
  ];

  useEffect(() => {
    let isMounted = true;
    const abortControllers: AbortController[] = [];

    const fetchData = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);
        setError(null);

        // Try multiple URL forms to be resilient to base path differences
        const candidates = [
          '/api/workforce',
          '/.netlify/functions/api/workforce',
          window.location.origin + '/api/workforce',
          window.location.origin + '/.netlify/functions/api/workforce',
          './api/workforce',
          './.netlify/functions/api/workforce',
        ];

        let response: Response | null = null;
        let lastError: any = null;

        const tryFetch = async (url: string) => {
          const controller = new AbortController();
          abortControllers.push(controller);
          const timeout = setTimeout(() => controller.abort(), 15000);
          try {
            const res = await fetch(url, { method: 'GET', signal: controller.signal, headers: { Accept: 'application/json' } });
            clearTimeout(timeout);
            return res;
          } catch (e) {
            clearTimeout(timeout);
            if (isMounted) {
              lastError = e;
            }
            return null;
          }
        };

        for (const url of candidates) {
          if (!isMounted) break;
          try {
            console.debug('Attempting fetch to', url);
            const res = await tryFetch(url);
            if (res && res.ok) {
              response = res;
              break;
            }
            if (res && !res.ok) {
              lastError = new Error(`Server responded ${res.status} for ${url}`);
            }
          } catch (e) {
            lastError = e;
            console.debug('Fetch attempt failed for', url, e);
          }
        }

        if (!isMounted) return;

        if (!response) {
          console.error('All fetch attempts failed. Falling back to local data. Last error:', lastError);
          const { stats, contracts, ageBuckets: fbAges } = processWorkforceData(fallbackData as any);
          setDepartmentStats(stats);
          setAllContracts(contracts);
          setAgeBuckets(fbAges);
          setError("Impossible de charger les données distantes — les données locales ont été chargées à la place.");
          return;
        }

        const data = await response.json();

        if (!isMounted) return;

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Invalid data format from server');
        }

        const stats: Record<string, DepartmentStats> = {};
        const contractsSet = new Set<string>();
        const ageMap: Record<string, number> = { '<20': 0, '20-29': 0, '30-39': 0, '40-49': 0, '>50': 0 };

        for (let i = 1; i < data.length; i++) {
          try {
            const row = data[i];
            if (!row || !Array.isArray(row)) continue;

            const worker: WorkerRow = {
              codigo: row[0] || 0,
              matricula: row[1] || '',
              nombre: row[2] || '',
              nif: row[3] || '',
              sexo: row[4] || '',
              edad: row[5] || 0,
              telefono: row[6] || '',
              contrato: row[7] || '',
              centro: row[8] || '',
              grupo: row[9] || '',
              encargado: row[10] || '',
              departamento: row[11] || '',
              puesto: row[12] || '',
              fechaAlta: row[13] || '',
              fechaBaja: row[14] || '',
              transportista: row[15] || '',
              prH1: row[16] || 0,
              prH2: row[17] || 0,
              prAS: row[18] || 0,
              baja: row[19] || '',
            };

            const dept = worker.departamento?.trim() || '';
            const contract = worker.contrato?.trim() || '';

            // Process age bucket from column F (row[5])
            const bucket = normalizeAgeBucket(worker.edad);
            if (bucket) ageMap[bucket] = (ageMap[bucket] || 0) + 1;

            if (!dept || dept === '') continue;

            contractsSet.add(contract);

            if (!stats[dept]) {
              stats[dept] = {
                nombre: dept,
                totalWorkers: 0,
                contractStats: {},
              };
            }

            stats[dept].totalWorkers++;

            if (!stats[dept].contractStats[contract]) {
              stats[dept].contractStats[contract] = {
                totalWorkers: 0,
                menCount: 0,
                womenCount: 0,
              };
            }

            stats[dept].contractStats[contract].totalWorkers++;

            const isWoman = worker.sexo !== 'H' && worker.sexo !== '';
            if (isWoman) {
              stats[dept].contractStats[contract].womenCount++;
            } else if (worker.sexo === 'H') {
              stats[dept].contractStats[contract].menCount++;
            }
          } catch (rowError) {
            console.warn('Error processing row', i, rowError);
            continue;
          }
        }

        if (isMounted) {
          setDepartmentStats(stats);
          setAllContracts(Array.from(contractsSet).sort());

          const ages = [ '<20', '20-29', '30-39', '40-49', '>50' ].map((name) => ({ name, value: ageMap[name] || 0 }));
          setAgeBuckets(ages);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching workforce data:', err);
          const msg = err instanceof Error ? err.message : String(err);
          let userMsg = "Impossible de charger les données de la main-d'œuvre: " + msg;
          if (msg && msg.toLowerCase().includes('failed to fetch')) {
            userMsg += " — Vérifiez que l'API est accessible et que les redirections (p.ex. Netlify functions) sont configurées";
          }
          setError(userMsg);
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
      abortControllers.forEach(controller => {
        try {
          controller.abort();
        } catch (e) {
          // Silently ignore abort errors on cleanup
        }
      });
    };
  }, [retryKey]);

  const departments = Object.values(departmentStats).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const totalWorkers = departments.reduce((sum, dept) => sum + dept.totalWorkers, 0);
  const totalWomen = departments.reduce((sum, dept) => {
    return sum + Object.values(dept.contractStats).reduce((s, cs) => s + cs.womenCount, 0);
  }, 0);
  const totalMen = totalWorkers - totalWomen;

  // Calculate contract percentages
  const contractData = allContracts.map((contract) => {
    let total = 0;
    departments.forEach((dept) => {
      const stats = dept.contractStats[contract];
      if (stats) {
        total += stats.totalWorkers;
      }
    });
    return {
      name: contract,
      value: total,
      percentage: totalWorkers > 0 ? ((total / totalWorkers) * 100).toFixed(1) : 0,
    };
  }).sort((a, b) => b.value - a.value);

  // Colors for pie chart
  const COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308',
    '#14b8a6', '#f97316', '#6366f1', '#d946ef',
  ];

  // Prepare gender data for selected departments (case-insensitive match)
  const targetDeptKeys = ['campo', 'almacen', 'estructora'];
  const deptGenderData = targetDeptKeys.map((key) => {
    const dept = departments.find((d) => d.nombre && d.nombre.toLowerCase().includes(key));
    const men = dept ? Object.values(dept.contractStats).reduce((s, cs) => s + cs.menCount, 0) : 0;
    const women = dept ? Object.values(dept.contractStats).reduce((s, cs) => s + cs.womenCount, 0) : 0;
    return {
      key,
      label: dept ? dept.nombre : key.charAt(0).toUpperCase() + key.slice(1),
      men,
      women,
      data: [
        { name: 'H', value: men },
        { name: 'F', value: women },
      ],
    };
  });

  // Preferred contract order provided by user; remaining contracts will appear after
  const preferredOrder = ['AGRI SUPPORT', 'BEST PROFIL', 'AGRI STRATEGIE', 'PROXAGRI', 'INDEFINIDO', 'FARM LABOR', 'AGRICONOMIE'];
  const displayedContracts = [
    ...preferredOrder.filter((p) => allContracts.includes(p)),
    ...allContracts.filter((c) => !preferredOrder.includes(c)),
  ];

  return (
    <Layout>
      <div className="max-w-full mx-auto px-2 sm:px-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour au tableau de bord
        </Link>

        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-primary flex items-center gap-3">
              Effectifs et structure du personnel
            </h1>
            
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              <div className="mb-2">{error}</div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                  onClick={() => {
                    setRetryKey((k) => k + 1);
                  }}
                >
                  Reessayer
                </button>
                <button
                  className="px-3 py-1 rounded border border-border text-sm"
                  onClick={() => {
                    // apply fallback data
                    const { stats, contracts, ageBuckets: fbAges } = processWorkforceData(fallbackData as any);
                    setDepartmentStats(stats);
                    setAllContracts(contracts);
                    setAgeBuckets(fbAges);
                    setError(null);
                  }}
                >
                  Utiliser données locales
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune donnée disponible</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-6 rounded-lg border-2 border-blue-300 bg-blue-50 shadow-md">
                  <h2 className="text-sm sm:text-base font-semibold text-blue-700 mb-2">Total Homme</h2>
                  <p className="text-4xl sm:text-5xl font-bold text-blue-600">{totalMen}</p>
                  
                </div>
                <div className="p-6 rounded-lg border-2 border-pink-300 bg-pink-50 shadow-md">
                  <h2 className="text-sm sm:text-base font-semibold text-pink-700 mb-2">Total Femmes</h2>
                  <p className="text-4xl sm:text-5xl font-bold text-pink-600">{totalWomen}</p>
                  
                </div>
                    <div className="p-6 rounded-lg border-2 border-pink-300 bg-pink-50 shadow-md">
                      <h2 className="text-sm sm:text-base font-semibold text-yellow-700 mb-2">Total Travailleurs</h2>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">{totalWorkers}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-lg border border-border shadow-lg bg-card p-6">
                  <h3 className="text-xl font-semibold text-primary mb-6">Distribution des travailleurs par type de contrat (%)</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Pie Chart */}
                    <div className="flex justify-center items-center h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={contractData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percentage }) => `${name.substring(0, 12)}: ${percentage}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {contractData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => `${value} travailleurs`}
                            contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                     {/* Age distribution horizontal bar chart */}
                    <div className="flex justify-center items-center h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ageBuckets} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} />
                          <Tooltip formatter={(value) => `${value} travailleurs`} contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }} />
                          <Bar dataKey="value" fill="#06b6d4" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Contract Summary Table */}
                  <div className="mt-8 overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-4 py-2 text-left font-semibold border-b border-border">Type de Contrat</th>
                          <th className="px-4 py-2 text-center font-semibold border-b border-border">Nombre</th>
                          <th className="px-4 py-2 text-center font-semibold border-b border-border">Pourcentage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {contractData.map((contract, idx) => (
                          <tr key={contract.name} className="hover:bg-muted/30">
                            <td className="px-4 py-2 font-medium">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                />
                                {contract.name}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center font-semibold text-blue-600">{contract.value}</td>
                            <td className="px-4 py-2 text-center font-semibold text-blue-600">{contract.percentage}%</td>
                          </tr>
                        ))}
                        <tr className="bg-accent/10 font-bold">
                          <td className="px-4 py-2">Total</td>
                          <td className="px-4 py-2 text-center text-blue-600">{totalWorkers}</td>
                          <td className="px-4 py-2 text-center text-blue-600">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  </div>

                  
                </div>
              </div>

              <div className="overflow-x-auto border border-border rounded-lg shadow-lg bg-card">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-accent text-accent-foreground sticky top-0">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold border-r border-border">
                        Groupe
                      </th>
                      {displayedContracts.map((contract) => (
                        <th
                          key={contract}
                          className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold border-r border-border whitespace-nowrap"
                        >
                          {contract}
                        </th>
                      ))}
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold">
                        Total général
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {departments.map((dept) => (
                      <tr key={dept.nombre} className="hover:bg-muted/50 transition-colors">
                        <td className="px-2 sm:px-4 py-2 sm:py-3 font-bold text-primary border-r border-border bg-muted/30">
                          {dept.nombre}
                        </td>
                        {displayedContracts.map((contract) => {
                          const stats = dept.contractStats[contract];
                          const menCount = stats ? stats.menCount : 0;
                          const womenCount = stats ? stats.womenCount : 0;
                          return (
                            <td
                              key={contract}
                              className="px-2 sm:px-4 py-2 sm:py-3 text-center border-r border-border font-semibold"
                            >
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 font-bold">
                                    {menCount}
                                  </span>
                                  <span className="text-xs text-muted-foreground">H</span>
                                </div>
                                <div className="flex items-center justify-center gap-1">
                                  <span className="inline-block px-2 py-0.5 rounded text-xs bg-pink-100 text-pink-700 font-bold">
                                    {womenCount}
                                  </span>
                                  <span className="text-xs text-muted-foreground">F</span>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-bold bg-muted/30">
                          <span className="inline-block px-2 sm:px-3 py-1 rounded bg-blue-100 text-blue-700">
                            {dept.totalWorkers}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-accent/10 font-bold">
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-primary border-r border-border bg-accent/20">
                        Total général
                      </td>
                      {displayedContracts.map((contract) => {
                        const menTotal = departments.reduce((sum, dept) => {
                          const stats = dept.contractStats[contract];
                          return sum + (stats ? stats.menCount : 0);
                        }, 0);
                        const womenTotal = departments.reduce((sum, dept) => {
                          const stats = dept.contractStats[contract];
                          return sum + (stats ? stats.womenCount : 0);
                        }, 0);
                        return (
                          <td
                            key={contract}
                            className="px-2 sm:px-4 py-2 sm:py-3 text-center border-r border-border font-semibold"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-center gap-1">
                                <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-200 text-blue-800 font-bold">
                                  {menTotal}
                                </span>
                                <span className="text-xs text-muted-foreground">H</span>
                              </div>
                              <div className="flex items-center justify-center gap-1">
                                <span className="inline-block px-2 py-0.5 rounded text-xs bg-pink-200 text-pink-800 font-bold">
                                  {womenTotal}
                                </span>
                                <span className="text-xs text-muted-foreground">F</span>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center bg-accent/20 font-semibold">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-center gap-1">
                            <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-200 text-blue-800 font-bold">
                              {totalMen}
                            </span>
                            <span className="text-xs text-muted-foreground">H</span>
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <span className="inline-block px-2 py-0.5 rounded text-xs bg-pink-200 text-pink-800 font-bold">
                              {totalWomen}
                            </span>
                            <span className="text-xs text-muted-foreground">F</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              

              {/* Gender charts for specific departments */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Répartition par genre — Départements sélectionnés</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {deptGenderData.map((d) => (
                    <div key={d.key} className="p-4 rounded-lg border border-border bg-card">
                      <h4 className="text-sm font-semibold mb-2">{d.label}</h4>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={d.data} dataKey="value" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: ${value}`}>
                              <Cell key={`${d.key}-h`} fill="#3b82f6" />
                              <Cell key={`${d.key}-f`} fill="#ec4899" />
                            </Pie>
                            <Tooltip formatter={(value) => `${value} travailleurs`} contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-blue-500 rounded-full" />
                          <span>H: {d.men}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-pink-500 rounded-full" />
                          <span>F: {d.women}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
