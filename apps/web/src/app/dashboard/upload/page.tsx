'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  Download,
  ArrowRight,
} from 'lucide-react';

type UploadStep = 'upload' | 'validate' | 'review';
type FileType = 'all-plans' | 'hdhp' | 'ppo-base' | 'ppo-buyup' | 'high-claimants';

const templates = [
  { id: 'all-plans', name: 'All Plans Monthly', description: 'Aggregated monthly data across all plans' },
  { id: 'hdhp', name: 'HDHP Monthly', description: 'High Deductible Health Plan monthly data' },
  { id: 'ppo-base', name: 'PPO Base Monthly', description: 'PPO Base plan monthly data' },
  { id: 'ppo-buyup', name: 'PPO Buy-Up Monthly', description: 'PPO Buy-Up plan monthly data' },
  { id: 'high-claimants', name: 'High-Cost Claimants', description: 'Claimants exceeding 50% of ISL' },
];

const fileTypeToApiType: Record<FileType, string> = {
  'all-plans': 'all plans',
  'hdhp': 'hdhp',
  'ppo-base': 'ppo base',
  'ppo-buyup': 'ppo buy-up',
  'high-claimants': 'hcc',
};

interface UploadPreviewSuccess {
  success: boolean;
  preview: {
    rowCount: number;
    months: string[];
    plans: string[];
    sampleRows: Record<string, string | number | null | undefined>[];
  };
  validation: {
    dataRows: number;
    sumRowDetected: boolean;
    sumValidationPassed: boolean;
  };
  reconciliationErrors?: string[];
  saved: boolean;
  import?: {
    monthsImported: number;
    rowsImported: number;
  };
  message: string;
}

interface UploadPreviewError {
  message: string;
  issues: string[] | null;
}

const DEFAULT_CLIENT_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_PLAN_YEAR_ID = '00000000-0000-0000-0000-000000000301';

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

function formatSampleValue(key: string, value: unknown) {
  if (typeof value === 'number') {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('subscriber') || lowerKey.includes('count')) {
      return numberFormatter.format(value);
    }
    return `$${numberFormatter.format(value)}`;
  }
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return String(value);
}

function UploadPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId') ?? DEFAULT_CLIENT_ID;
  const planYearId = searchParams.get('planYearId') ?? DEFAULT_PLAN_YEAR_ID;

  const [currentStep, setCurrentStep] = useState<UploadStep>('upload');
  const [selectedFileType, setSelectedFileType] = useState<FileType>('all-plans');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewResult, setPreviewResult] = useState<UploadPreviewSuccess | null>(
    null,
  );
  const [previewError, setPreviewError] = useState<UploadPreviewError | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [rawCsvPreview, setRawCsvPreview] = useState<{
    headers: string[];
    rows: string[][];
  } | null>(null);

  const handleDownloadTemplate = () => {
    window.open(`/api/template?type=${selectedFileType}`, '_blank');
  };

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setPreviewResult(null);
    setPreviewError(null);
    setImportMessage(null);
    setImportError(null);
    setRawCsvPreview(null);

    // Parse CSV to show immediate preview using PapaParse for proper handling
    try {
      const text = await file.text();
      const parseResult = Papa.parse<string[]>(text, {
        preview: 6, // Only parse first 6 rows for preview
        skipEmptyLines: true,
      });

      if (parseResult.data && parseResult.data.length > 0) {
        const headers = parseResult.data[0];
        const dataRows = parseResult.data.slice(1);
        setRawCsvPreview({ headers, rows: dataRows });
      }
    } catch (error) {
      console.error('CSV preview parsing failed:', error);
      // Don't block upload if preview fails - just skip the preview
    }

    setCurrentStep('validate');
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('clientId', clientId);
    formData.append('planYearId', planYearId);
    formData.append('fileType', fileTypeToApiType[selectedFileType]);

    try {
      const response = await fetch('/api/upload?preview=true', {
        method: 'POST',
        body: formData,
      });
      const body = await response
        .json()
        .catch(() => ({ message: 'Validation failed.' }));

      if (!response.ok) {
        const issues: string[] = [];
        if (Array.isArray(body?.errors)) {
          body.errors.forEach((err: { row?: number; field?: string; message?: string }) => {
            const details = [
              err.row ? `row ${err.row}` : null,
              err.field?.toString(),
            ]
              .filter(Boolean)
              .join(' ');
            issues.push(details ? `${details}: ${err.message}` : err.message ?? 'Validation error');
          });
        }
        if (Array.isArray(body?.reconciliationErrors)) {
          issues.push(...body.reconciliationErrors);
        }
        if (Array.isArray(body?.sumValidationErrors)) {
          issues.push(...body.sumValidationErrors);
        }

        setPreviewError({
          message: body?.message ?? 'Validation failed.',
          issues: issues.length > 0 ? issues : null,
        });
        setPreviewResult(null);
      } else {
        setPreviewResult(body as UploadPreviewSuccess);
        setPreviewError(null);
      }
    } catch (error) {
      setPreviewError({
        message:
          error instanceof Error ? error.message : 'Validation failed. Please try again.',
        issues: null,
      });
      setPreviewResult(null);
    } finally {
      setIsProcessing(false);
      setCurrentStep('review');
    }
  };

  const handleConfirm = async () => {
    if (!uploadedFile) {
      return;
    }
    setIsProcessing(true);
    setImportMessage(null);
    setImportError(null);

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('clientId', clientId);
    formData.append('planYearId', planYearId);
    formData.append('fileType', fileTypeToApiType[selectedFileType]);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const body = await response
        .json()
        .catch(() => ({ error: 'Import failed.' }));

      if (!response.ok) {
        throw new Error(body?.error ?? 'Import failed.');
      }

      setPreviewResult(body as UploadPreviewSuccess);
      setImportMessage(body?.message ?? 'Data uploaded successfully.');
      setImportError(null);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : 'Import failed. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      void handleFileUpload(file);
    }
  };

  const resetWizard = () => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setPreviewResult(null);
    setPreviewError(null);
    setImportMessage(null);
    setImportError(null);
    setRawCsvPreview(null);
    setIsProcessing(false);
  };

  const previewColumns: Array<{ key: string; label: string }> =
    selectedFileType === 'high-claimants'
      ? [
          { key: 'claimant_key', label: 'Claimant Key' },
          { key: 'plan', label: 'Plan' },
          { key: 'status', label: 'Status' },
          { key: 'medical_paid', label: 'Medical Paid' },
          { key: 'rx_paid', label: 'Rx Paid' },
        ]
      : [
          { key: 'month', label: 'Month' },
          { key: 'plan', label: 'Plan' },
          { key: 'subscribers', label: 'Subscribers' },
          { key: 'medicalPaid', label: 'Medical' },
          { key: 'rxPaid', label: 'Pharmacy' },
          { key: 'budgetedPremium', label: 'Budgeted Premium' },
        ];

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Upload Data</h1>
        <p className="text-slate-400 mt-2">Import monthly claims and expense data</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4">
        <div
          className={`flex items-center gap-2 ${
            currentStep === 'upload' ? 'text-accent-primary' : 'text-status-green'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === 'upload'
                ? 'border-accent-primary bg-accent-primary/10'
                : 'border-status-green bg-status-green/10'
            }`}
          >
            {currentStep !== 'upload' ? <CheckCircle className="w-5 h-5" /> : '1'}
          </div>
          <span className="text-sm font-medium">Upload</span>
        </div>

        <ArrowRight className="w-5 h-5 text-slate-600" />

        <div
          className={`flex items-center gap-2 ${
            currentStep === 'validate'
              ? 'text-accent-primary'
              : currentStep === 'review'
              ? 'text-status-green'
              : 'text-slate-500'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === 'validate'
                ? 'border-accent-primary bg-accent-primary/10'
                : currentStep === 'review'
                ? 'border-status-green bg-status-green/10'
                : 'border-slate-700'
            }`}
          >
            {currentStep === 'review' ? <CheckCircle className="w-5 h-5" /> : '2'}
          </div>
          <span className="text-sm font-medium">Validate</span>
        </div>

        <ArrowRight className="w-5 h-5 text-slate-600" />

        <div
          className={`flex items-center gap-2 ${
            currentStep === 'review' ? 'text-accent-primary' : 'text-slate-500'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === 'review' ? 'border-accent-primary bg-accent-primary/10' : 'border-slate-700'
            }`}
          >
            3
          </div>
          <span className="text-sm font-medium">Review</span>
        </div>
      </div>

      {/* Step 1: Upload */}
      {currentStep === 'upload' && (
        <div className="space-y-6">
          {/* File Type Selection */}
          <div className="report-card">
            <h3 className="text-lg font-semibold mb-4">Select Data Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedFileType(template.id as FileType)}
                  className={`p-4 rounded-card border-2 text-left transition-uber ${
                    selectedFileType === template.id
                      ? 'border-accent-primary bg-accent-primary/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet
                      className={`w-5 h-5 mt-0.5 ${
                        selectedFileType === template.id
                          ? 'text-accent-primary'
                          : 'text-slate-400'
                      }`}
                    />
                    <div>
                      <div className="font-semibold">{template.name}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {template.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Drop Zone */}
          <div
            className="report-card border-2 border-dashed border-slate-700 hover:border-accent-primary transition-uber cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <div className="py-12 text-center">
              <Upload className="w-16 h-16 mx-auto text-slate-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Drop your file here</h3>
              <p className="text-slate-400 mb-4">or click to browse</p>
              <p className="text-sm text-slate-500">Supports CSV and XLSX files</p>
            </div>
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleFileUpload(file);
                }
              }}
            />
          </div>

          {/* Template Download */}
          <div className="report-card bg-accent-info/5 border-accent-info/20">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-accent-info mt-0.5" />
              <div>
                <h4 className="font-semibold text-accent-info mb-1">Need a template?</h4>
                <p className="text-sm text-slate-300">
                  Download the CSV template for{' '}
                  {templates.find((t) => t.id === selectedFileType)?.name}
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="mt-2 text-sm text-accent-info hover:underline inline-flex items-center gap-2"
                  aria-label="Download CSV template"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Download Template
                </button>
              </div>
            </div>
          </div>

          {/* CSV Preview */}
          {rawCsvPreview && (
            <div className="report-card">
              <h3 className="text-lg font-semibold mb-4">CSV Preview</h3>
              <p className="text-sm text-slate-400 mb-3">
                First {rawCsvPreview.rows.length} rows from your file
              </p>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      {rawCsvPreview.headers.map((header, idx) => (
                        <th key={idx}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawCsvPreview.rows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Validate (with "On our way" feedback) */}
      {currentStep === 'validate' && isProcessing && (
        <div className="report-card">
          <div className="py-12 text-center">
            <div className="inline-flex items-center gap-3 status-pill on-way mb-4">
              <div className="w-3 h-3 rounded-full bg-accent-primary animate-pulse" />
              <span>Validating your data—on its way</span>
            </div>
            <div className="h-2 bg-base-950 rounded-full overflow-hidden max-w-md mx-auto">
              <div className="h-full bg-accent-primary animate-shimmer" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {currentStep === 'review' && (
        <div className="space-y-6">
          {previewError && (
            <div className="report-card border border-status-red/30 bg-status-red/10">
              <h3 className="text-lg font-semibold mb-2 text-status-red">Validation failed</h3>
              <p className="text-sm text-status-red/90">{previewError.message}</p>
              {previewError.issues && (
                <ul className="mt-3 space-y-2 text-sm text-status-red/80 list-disc list-inside">
                  {previewError.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {previewResult && (
            <>
              <div className="report-card">
                <h3 className="text-lg font-semibold mb-4">Validation Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-base-900 rounded-card border border-slate-800">
                    <div className="text-slate-400">Rows Detected</div>
                    <div className="text-lg font-semibold text-text-dark">
                      {previewResult.preview.rowCount}
                    </div>
                  </div>
                  <div className="p-3 bg-base-900 rounded-card border border-slate-800">
                    <div className="text-slate-400">Months Covered</div>
                    <div className="text-lg font-semibold text-text-dark">
                      {previewResult.preview.months.join(', ') || '—'}
                    </div>
                  </div>
                  <div className="p-3 bg-base-900 rounded-card border border-slate-800">
                    <div className="text-slate-400">Plans Included</div>
                    <div className="text-lg font-semibold text-text-dark">
                      {previewResult.preview.plans.join(', ') || '—'}
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-slate-300">
                  <div>
                    <CheckCircle className="inline w-4 h-4 text-status-green mr-2" />
                    Header check passed
                  </div>
                  <div>
                    <CheckCircle className={`inline w-4 h-4 mr-2 ${
                      previewResult.validation.sumValidationPassed
                        ? 'text-status-green'
                        : 'text-status-red'
                    }`} />
                    Sum row validation{' '}
                    {previewResult.validation.sumValidationPassed ? 'passed' : 'failed'}
                  </div>
                  <div className="mt-2 text-slate-400">{previewResult.message}</div>
                </div>
              </div>

              {previewResult.preview.sampleRows.length > 0 && (
                <div className="report-card">
                  <h3 className="text-lg font-semibold mb-4">Sample Rows</h3>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {previewColumns.map((column) => (
                            <th key={column.key}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewResult.preview.sampleRows.map((row, index) => (
                          <tr key={index}>
                            {previewColumns.map((column) => (
                              <td key={column.key} className="text-right">
                                {formatSampleValue(column.key, row[column.key])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {importMessage && (
            <div className="report-card border border-status-green/30 bg-status-green/10 text-status-green">
              <h3 className="text-lg font-semibold mb-1">Import complete</h3>
              <p className="text-sm">{importMessage}</p>
              {previewResult?.import && (
                <p className="text-xs text-status-green/80 mt-2">
                  Imported {previewResult.import.rowsImported} rows across{' '}
                  {previewResult.import.monthsImported} month(s).
                </p>
              )}
            </div>
          )}

          {importError && (
            <div className="report-card border border-status-red/30 bg-status-red/10 text-status-red">
              <h3 className="text-lg font-semibold mb-1">Import failed</h3>
              <p className="text-sm">{importError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={resetWizard}
              className="px-6 py-3 bg-base-900 border border-slate-700 rounded-card font-medium hover:bg-base-800 transition-uber"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleConfirm()}
              disabled={
                isProcessing || !previewResult?.success || Boolean(previewError)
              }
              className="px-6 py-3 bg-accent-primary text-base-950 rounded-card font-medium hover:bg-emerald-400 transition-uber inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-base-950 border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirm & Import
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-8">
        <div className="report-card">
          <div className="py-12 text-center">
            <div className="text-slate-400">Loading...</div>
          </div>
        </div>
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  );
}
