'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  Download,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';

type FileType = 'all-plans' | 'hdhp' | 'ppo-base' | 'ppo-buyup' | 'high-claimants';

type FileStatus = 'empty' | 'validating' | 'valid' | 'invalid' | 'imported';

interface FileSlot {
  id: FileType;
  name: string;
  description: string;
  file: File | null;
  status: FileStatus;
  previewResult: UploadPreviewSuccess | null;
  previewError: UploadPreviewError | null;
}

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

function UploadPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId') ?? DEFAULT_CLIENT_ID;
  const planYearId = searchParams.get('planYearId') ?? DEFAULT_PLAN_YEAR_ID;

  // Initialize file slots for all 5 file types
  const [fileSlots, setFileSlots] = useState<FileSlot[]>(
    templates.map(template => ({
      id: template.id as FileType,
      name: template.name,
      description: template.description,
      file: null,
      status: 'empty' as FileStatus,
      previewResult: null,
      previewError: null,
    }))
  );

  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleDownloadTemplate = (fileType: FileType) => {
    window.open(`/api/template?type=${fileType}`, '_blank');
  };

  // Handle file selection for a specific slot
  const handleFileSelect = async (fileType: FileType, file: File) => {
    // Update slot with file and set status to validating
    setFileSlots(prev => prev.map(slot =>
      slot.id === fileType
        ? { ...slot, file, status: 'validating' as FileStatus, previewResult: null, previewError: null }
        : slot
    ));

    // Validate the file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clientId', clientId);
    formData.append('planYearId', planYearId);
    formData.append('fileType', fileTypeToApiType[fileType]);

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

        setFileSlots(prev => prev.map(slot =>
          slot.id === fileType
            ? {
                ...slot,
                status: 'invalid' as FileStatus,
                previewError: {
                  message: body?.message ?? 'Validation failed.',
                  issues: issues.length > 0 ? issues : null,
                }
              }
            : slot
        ));
      } else {
        setFileSlots(prev => prev.map(slot =>
          slot.id === fileType
            ? {
                ...slot,
                status: 'valid' as FileStatus,
                previewResult: body as UploadPreviewSuccess
              }
            : slot
        ));
      }
    } catch (error) {
      setFileSlots(prev => prev.map(slot =>
        slot.id === fileType
          ? {
              ...slot,
              status: 'invalid' as FileStatus,
              previewError: {
                message: error instanceof Error ? error.message : 'Validation failed. Please try again.',
                issues: null,
              }
            }
          : slot
      ));
    }
  };

  // Remove file from slot
  const handleFileRemove = (fileType: FileType) => {
    setFileSlots(prev => prev.map(slot =>
      slot.id === fileType
        ? { ...slot, file: null, status: 'empty' as FileStatus, previewResult: null, previewError: null }
        : slot
    ));
  };

  // Import all valid files
  const handleConfirmAll = async () => {
    const validSlots = fileSlots.filter(slot => slot.status === 'valid' && slot.file);

    if (validSlots.length === 0) {
      return;
    }

    setIsImporting(true);
    setImportMessage(null);
    setImportError(null);

    try {
      // Import each file sequentially
      const results = [];
      for (const slot of validSlots) {
        if (!slot.file) continue;

        const formData = new FormData();
        formData.append('file', slot.file);
        formData.append('clientId', clientId);
        formData.append('planYearId', planYearId);
        formData.append('fileType', fileTypeToApiType[slot.id]);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const body = await response
          .json()
          .catch(() => ({ error: 'Import failed.' }));

        if (!response.ok) {
          throw new Error(`${slot.name}: ${body?.error ?? 'Import failed'}`);
        }

        results.push(slot.name);

        // Update slot status to imported
        setFileSlots(prev => prev.map(s =>
          s.id === slot.id ? { ...s, status: 'imported' as FileStatus } : s
        ));
      }

      setImportMessage(`Successfully imported ${results.length} file(s): ${results.join(', ')}`);
      setImportError(null);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : 'Import failed. Please try again.',
      );
    } finally {
      setIsImporting(false);
    }
  };

  const resetWizard = () => {
    setFileSlots(templates.map(template => ({
      id: template.id as FileType,
      name: template.name,
      description: template.description,
      file: null,
      status: 'empty' as FileStatus,
      previewResult: null,
      previewError: null,
    })));
    setImportMessage(null);
    setImportError(null);
  };

  // Helper to count files by status
  const fileCount = {
    total: fileSlots.filter(slot => slot.file).length,
    valid: fileSlots.filter(slot => slot.status === 'valid').length,
    invalid: fileSlots.filter(slot => slot.status === 'invalid').length,
    imported: fileSlots.filter(slot => slot.status === 'imported').length,
  };

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Upload Data</h1>
          <p className="text-slate-400 mt-2">Import monthly claims and expense data - upload one or all file types</p>
        </div>
        {fileCount.total > 0 && (
          <div className="text-sm">
            <span className="text-slate-400">Files selected: </span>
            <span className="font-semibold text-accent-primary">{fileCount.total}/5</span>
            {fileCount.valid > 0 && (
              <span className="ml-3 text-status-green">
                {fileCount.valid} valid
              </span>
            )}
            {fileCount.invalid > 0 && (
              <span className="ml-3 text-status-red">
                {fileCount.invalid} invalid
              </span>
            )}
          </div>
        )}
      </div>

      {/* File Upload Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {fileSlots.map((slot) => {
          const statusColor = {
            empty: 'border-slate-700',
            validating: 'border-accent-primary',
            valid: 'border-status-green',
            invalid: 'border-status-red',
            imported: 'border-accent-primary',
          }[slot.status];

          const statusBg = {
            empty: 'bg-base-900',
            validating: 'bg-accent-primary/5',
            valid: 'bg-status-green/5',
            invalid: 'bg-status-red/5',
            imported: 'bg-accent-primary/10',
          }[slot.status];

          return (
            <div key={slot.id} className={`report-card border-2 ${statusColor} ${statusBg} transition-uber`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">{slot.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{slot.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadTemplate(slot.id)}
                  className="text-accent-info hover:text-accent-info/80 transition-uber"
                  title="Download template"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* Upload Area or File Info */}
              {!slot.file ? (
                <div
                  className="border-2 border-dashed border-slate-700 hover:border-accent-primary rounded-card p-6 text-center cursor-pointer transition-uber"
                  onClick={() => document.getElementById(`file-input-${slot.id}`)?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
                      void handleFileSelect(slot.id, file);
                    }
                  }}
                >
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-400">Drop file or click to browse</p>
                  <p className="text-xs text-slate-500 mt-1">CSV or XLSX</p>
                  <input
                    id={`file-input-${slot.id}`}
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleFileSelect(slot.id, file);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* File Name */}
                  <div className="flex items-center justify-between p-3 bg-base-900 rounded-card">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileSpreadsheet className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm truncate">{slot.file.name}</span>
                    </div>
                    {slot.status !== 'validating' && slot.status !== 'imported' && (
                      <button
                        onClick={() => handleFileRemove(slot.id)}
                        className="text-slate-400 hover:text-status-red transition-uber flex-shrink-0"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 text-sm">
                    {slot.status === 'validating' && (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
                        <span className="text-accent-primary">Validating...</span>
                      </>
                    )}
                    {slot.status === 'valid' && (
                      <>
                        <CheckCircle className="w-4 h-4 text-status-green" />
                        <span className="text-status-green">Valid - ready to import</span>
                      </>
                    )}
                    {slot.status === 'invalid' && (
                      <>
                        <AlertCircle className="w-4 h-4 text-status-red" />
                        <span className="text-status-red">Validation failed</span>
                      </>
                    )}
                    {slot.status === 'imported' && (
                      <>
                        <CheckCircle className="w-4 h-4 text-accent-primary" />
                        <span className="text-accent-primary">Imported successfully</span>
                      </>
                    )}
                  </div>

                  {/* Error Details */}
                  {slot.previewError && (
                    <div className="text-xs text-status-red/90 p-3 bg-status-red/10 rounded-card">
                      <p className="font-semibold mb-1">{slot.previewError.message}</p>
                      {slot.previewError.issues && (
                        <ul className="list-disc list-inside space-y-0.5 mt-2">
                          {slot.previewError.issues.slice(0, 3).map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                          {slot.previewError.issues.length > 3 && (
                            <li className="text-slate-400">
                              ... and {slot.previewError.issues.length - 3} more
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Success Preview */}
                  {slot.previewResult && (
                    <div className="text-xs text-slate-400 p-3 bg-base-900 rounded-card space-y-1">
                      <div><span className="text-slate-500">Rows:</span> {slot.previewResult.preview.rowCount}</div>
                      {slot.previewResult.preview.months.length > 0 && (
                        <div><span className="text-slate-500">Months:</span> {slot.previewResult.preview.months.join(', ')}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Import Messages */}
      {importMessage && (
        <div className="report-card border border-status-green/30 bg-status-green/10 text-status-green">
          <h3 className="text-lg font-semibold mb-1">Import complete</h3>
          <p className="text-sm">{importMessage}</p>
        </div>
      )}

      {importError && (
        <div className="report-card border border-status-red/30 bg-status-red/10 text-status-red">
          <h3 className="text-lg font-semibold mb-1">Import failed</h3>
          <p className="text-sm">{importError}</p>
        </div>
      )}

      {/* Action Buttons */}
      {fileCount.total > 0 && (
        <div className="flex justify-between items-center">
          <button
            onClick={resetWizard}
            className="px-6 py-3 bg-base-900 border border-slate-700 rounded-card font-medium hover:bg-base-800 transition-uber"
            disabled={isImporting}
          >
            Reset All
          </button>
          <button
            onClick={() => void handleConfirmAll()}
            disabled={isImporting || fileCount.valid === 0 || fileCount.imported > 0}
            className="px-6 py-3 bg-accent-primary text-base-950 rounded-card font-medium hover:bg-emerald-400 transition-uber inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Importing...
              </>
            ) : fileCount.imported > 0 ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Import Complete
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Import {fileCount.valid} File{fileCount.valid !== 1 ? 's' : ''}
              </>
            )}
          </button>
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
