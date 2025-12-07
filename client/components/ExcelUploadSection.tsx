import { useState, useRef } from "react";
import { Upload, Check, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import * as XLSX from "xlsx";

interface UploadedData {
  headers: string[];
  rows: Record<string, string | number>[];
}

export default function ExcelUploadSection() {
  const [uploadedData, setUploadedData] = useState<UploadedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [googleScriptUrl, setGoogleScriptUrl] = useState(
    "https://script.google.com/macros/s/AKfycbyCWTcWNX4Mc77VpOFkdoKsespFRZY2n54i5CkyM38HEO1sjOGNXR3CBcy3fhxrdB5cYg/exec"
  );
  const [showScriptUrlInput, setShowScriptUrlInput] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          // Get first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Get all columns including empty ones
          const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

          // Extract headers from the first row, preserving all columns
          const headers: string[] = [];
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            const cell = worksheet[cellAddress];
            headers.push(cell?.v ? String(cell.v) : `Column ${col + 1}`);
          }

          // Extract data rows with all columns
          const rows: Record<string, string | number>[] = [];
          for (let row = range.s.r + 1; row <= range.e.r; row++) {
            const rowData: Record<string, string | number> = {};
            for (let col = range.s.c; col <= range.e.c; col++) {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
              const cell = worksheet[cellAddress];
              rowData[headers[col - range.s.c]] = cell?.v ?? "";
            }
            rows.push(rowData);
          }

          setUploadedData({
            headers,
            rows,
          });

          setLoading(false);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
          setError("Erreur lors de la lecture du fichier Excel");
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError("Erreur lors du téléchargement du fichier");
      setLoading(false);
    }
  };

  const sendDataToGoogleSheets = async (data: UploadedData) => {
    if (!googleScriptUrl) {
      setError("Veuillez entrer l'URL de votre Google Apps Script");
      return false;
    }

    try {
      setUploadProgress(10);

      // Step 1: Clear the sheet
      setUploadProgress(20);
      const clearResponse = await fetch(googleScriptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "clearSheet",
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Google Apps Script deployments don't always return proper CORS headers
        // but they do process the request, so we continue
        return { ok: true };
      });

      setUploadProgress(40);

      // Step 2: Send data in batches
      const batchSize = 50;
      const totalBatches = Math.ceil(data.rows.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, data.rows.length);
        const batchData = data.rows.slice(start, end);

        await fetch(googleScriptUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            action: "uploadData",
            headers: i === 0 ? data.headers : undefined,
            data: batchData,
            isBatch: true,
            batchNumber: i,
            totalBatches: totalBatches,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {
          // Continue even if response can't be read due to CORS
          return { ok: true };
        });

        // Update progress: 40% to 90%
        const progressStep = (90 - 40) / totalBatches;
        setUploadProgress(40 + (i + 1) * progressStep);
      }

      setUploadProgress(100);
      return true;
    } catch (err) {
      setError("Erreur lors de l'envoi aux Google Sheets. Vérifiez l'URL du script.");
      setUploadProgress(0);
      return false;
    }
  };

  const handleSendToGoogleSheets = async () => {
    if (!uploadedData) {
      setError("Veuillez d'abord télécharger un fichier");
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress(0);

    const success = await sendDataToGoogleSheets(uploadedData);
    if (success) {
      setSuccess(true);
      setUploadedData(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setTimeout(() => {
        setSuccess(false);
        setUploadProgress(0);
      }, 2000);
    } else {
      setUploadProgress(0);
    }

    setLoading(false);
  };

  const handleTestIntegration = async () => {
    setLoading(true);
    setError(null);

    // Create sample data
    const testData: UploadedData = {
      headers: ["Date", "Employé", "Statut"],
      rows: [
        { Date: "2025-01-01", Employé: "Jean Dupont", Statut: "Présent" },
        { Date: "2025-01-01", Employé: "Marie Martin", Statut: "Absent" },
        { Date: "2025-01-02", Employé: "Jean Dupont", Statut: "Présent" },
        { Date: "2025-01-02", Employé: "Marie Martin", Statut: "Présent" },
      ],
    };

    const success = await sendDataToGoogleSheets(testData);
    if (success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="rounded-lg border border-border shadow-lg bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-primary">
            📊 Télécharger Données de Présence/Absence
          </h2>
          <Button
            onClick={handleTestIntegration}
            disabled={loading || !googleScriptUrl}
            variant="outline"
            size="sm"
          >
            {loading ? "Test en cours..." : "🧪 Tester l'intégration"}
          </Button>
        </div>

        <div className="space-y-4">
          {/* File Upload Input */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Fichier Excel
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={loading}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-border file:text-sm file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formats supportés: Excel (.xlsx, .xls) ou CSV
              </p>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-700 dark:text-green-300">
              <Check size={18} />
              <span className="text-sm">Opération réussie!</span>
            </div>
          )}

          {/* Data Preview */}
          {uploadedData && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  ✓ {uploadedData.rows.length} ligne(s) chargées
                </p>
              </div>

              {/* Google Script URL Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  URL Google Apps Script (déploiement web)
                </label>
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/d/xxxxx/usercopy?state=..."
                  value={googleScriptUrl}
                  onChange={(e) => setGoogleScriptUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Entrez l'URL du Web App déployée de Google Apps Script
                </p>
              </div>

              {/* Upload Progress Bar */}
              {loading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Téléchargement en cours...</p>
                    <p className="text-sm font-bold text-accent">{Math.round(uploadProgress)}%</p>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Send Button */}
              <Button
                onClick={handleSendToGoogleSheets}
                disabled={loading || !googleScriptUrl}
                className="w-full gap-2"
              >
                <Upload size={18} />
                {loading ? "Envoi en cours..." : "Envoyer aux Google Sheets"}
              </Button>
            </div>
          )}

          
        </div>
      </div>

     
    </div>
  );
}
