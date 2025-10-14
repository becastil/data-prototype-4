"use client";

import { useState } from "react";
import { Upload, AlertCircle, CheckCircle, FileText, Loader2 } from "lucide-react";

interface ParseError {
  row: number;
  column: string;
  value: any;
  error: string;
}

interface BudgetUploadProps {
  planYearId: string;
  onUploadComplete?: () => void;
}

export function BudgetUpload({ planYearId, onUploadComplete }: BudgetUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<ParseError[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    // Reset previous results when new file selected
    setResult(null);
    setErrors([]);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);
    setErrors([]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("planYearId", planYearId);

    try {
      const res = await fetch("/api/budget/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setResult(data);
        setErrors([]);
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        setErrors(data.errors || []);
        setResult(data);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      setErrors([
        {
          row: 0,
          column: "",
          value: "",
          error: error.message || "Upload failed",
        },
      ]);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.name.endsWith(".csv") || droppedFile.name.endsWith(".xlsx"))) {
      setFile(droppedFile);
      setResult(null);
      setErrors([]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="mt-2 block text-sm font-medium text-gray-900">
              Upload CSV or XLSX
            </span>
            <span className="mt-1 block text-xs text-gray-500">
              or drag and drop file here
            </span>
            <input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
          {file && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span>{file.name}</span>
              <span className="text-gray-400">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded p-4 text-sm">
        <p className="font-medium mb-2">Required columns (long format):</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><code className="bg-white px-1">service_month</code> (YYYY-MM-01)</li>
          <li><code className="bg-white px-1">domestic_facility_ip_op</code></li>
          <li><code className="bg-white px-1">non_domestic_ip_op</code></li>
          <li><code className="bg-white px-1">non_hospital_medical</code></li>
          <li><code className="bg-white px-1">rx_claims</code></li>
          <li><code className="bg-white px-1">ee_count_active_cobra</code></li>
          <li><code className="bg-white px-1">member_count</code></li>
        </ul>
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading & Validating...
          </>
        ) : (
          "Upload & Validate"
        )}
      </button>

      {result && result.success && (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-900">Success!</span>
          </div>
          <p className="mt-1 text-sm text-green-800">
            Imported {result.rowsImported} rows of data
          </p>
          {result.preview && result.preview.length > 0 && (
            <details className="mt-3">
              <summary className="text-sm font-medium cursor-pointer text-green-700">
                View preview (first 5 rows)
              </summary>
              <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto border border-green-200">
                {JSON.stringify(result.preview, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-900">
              Validation Errors ({errors.length})
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <ul className="text-sm space-y-1 text-red-800">
              {errors.slice(0, 20).map((err, idx) => (
                <li key={idx} className="font-mono text-xs">
                  <span className="font-bold">Row {err.row}</span>
                  {err.column && (
                    <>
                      , <span className="text-red-600">{err.column}</span>
                    </>
                  )}
                  : {err.error}
                </li>
              ))}
            </ul>
            {errors.length > 20 && (
              <p className="mt-2 text-xs text-red-600">
                ... and {errors.length - 20} more errors
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
