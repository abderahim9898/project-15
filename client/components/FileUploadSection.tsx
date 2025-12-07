import { useState, useRef } from "react";
import { Upload, Check, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import * as XLSX from "xlsx";

interface UploadedData {
  headers: string[];
  rows: Record<string, string | number>[];
}

interface FileUploadSectionProps {
  title: string;
  description: string;
  googleScriptUrl: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function FileUploadSection({
  title,
  description,
  googleScriptUrl,
  onSuccess,
  onError,
}: FileUploadSectionProps) {
  const [uploadedData, setUploadedData] = useState<UploadedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

          const headers: string[] = [];
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            const cell = worksheet[cellAddress];
            headers.push(cell?.v ? String(cell.v) : `Column ${col + 1}`);
          }

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
          const errorMsg = "Erreur lors de la lecture du fichier Excel";
          setError(errorMsg);
          onError?.(errorMsg);
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      const errorMsg = "Erreur lors du téléchargement du fichier";
      setError(errorMsg);
      onError?.(errorMsg);
      setLoading(false);
    }
  };

  const sendDataToGoogleSheets = async (data: UploadedData) => {
    try {
      setUploadProgress(10);

      const batchSize = 50000;
      const totalBatches = Math.ceil(data.rows.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, data.rows.length);
        const batchData = data.rows.slice(start, end);

        await fetch("/api/admin/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            googleScriptUrl: googleScriptUrl,
            action: "uploadData",
            headers: data.headers,
            data: batchData,
            isBatch: true,
            batchNumber: i,
            totalBatches: totalBatches,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {
          return { ok: true };
        });

        const progressStep = 90 / totalBatches;
        setUploadProgress(10 + (i + 1) * progressStep);
      }

      setUploadProgress(100);
      return true;
    } catch (err) {
      const errorMsg = "Erreur lors de l'envoi aux Google Sheets.";
      setError(errorMsg);
      onError?.(errorMsg);
      setUploadProgress(0);
      return false;
    }
  };

  const handleSendToGoogleSheets = async () => {
    if (!uploadedData) {
      const errorMsg = "Veuillez d'abord télécharger un fichier";
      setError(errorMsg);
      onError?.(errorMsg);
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
      onSuccess?.();
    } else {
      setUploadProgress(0);
    }

    setLoading(false);
  };

  return (
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

          {/* Upload Progress Bar */}
          {loading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  Téléchargement en cours...
                </p>
                <p className="text-sm font-bold text-accent">
                  {Math.round(uploadProgress)}%
                </p>
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
            disabled={loading}
            className="w-full gap-2"
          >
            <Upload size={18} />
            {loading ? "Envoi en cours..." : "Envoyer aux Google Sheets"}
          </Button>
        </div>
      )}
    </div>
  );
}
