'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, ArrowRight } from 'lucide-react';

/**
 * Upload Wizard Page - 3-Step Process
 *
 * Step 1: Upload - Drag-and-drop CSV/XLSX
 * Step 2: Validate - Headers, types, ranges, reconciliation
 * Step 3: Review - Preview data, stats, confirm write
 *
 * Features:
 * - Template downloads
 * - Reconciliation: Σ plans == All Plans (tolerance configurable, default $0)
 * - "On our way" feedback during processing
 */

type UploadStep = 'upload' | 'validate' | 'review';
type FileType = 'all-plans' | 'hdhp' | 'ppo-base' | 'ppo-buyup' | 'high-claimants';

const templates = [
  { id: 'all-plans', name: 'All Plans Monthly', description: 'Aggregated monthly data across all plans' },
  { id: 'hdhp', name: 'HDHP Monthly', description: 'High Deductible Health Plan monthly data' },
  { id: 'ppo-base', name: 'PPO Base Monthly', description: 'PPO Base plan monthly data' },
  { id: 'ppo-buyup', name: 'PPO Buy-Up Monthly', description: 'PPO Buy-Up plan monthly data' },
  { id: 'high-claimants', name: 'High-Cost Claimants', description: 'Claimants exceeding 50% of ISL' }
];

export default function UploadPage() {
  const [currentStep, setCurrentStep] = useState<UploadStep>('upload');
  const [selectedFileType, setSelectedFileType] = useState<FileType>('all-plans');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setIsProcessing(true);
    setCurrentStep('validate');

    // Simulate validation
    setTimeout(() => {
      setValidationResults({
        headerCheck: { passed: true, message: 'All required headers present' },
        typeCheck: { passed: true, message: 'All data types valid' },
        rangeCheck: { passed: true, message: 'All values within expected ranges' },
        reconciliation: {
          passed: true,
          message: 'Sum of plans matches All Plans (tolerance: $0.00)',
          details: {
            allPlansTotal: 5178492,
            sumOfPlans: 5178492,
            difference: 0
          }
        }
      });
      setIsProcessing(false);
      setCurrentStep('review');
    }, 2000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      handleFileUpload(file);
    }
  };

  const handleConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      alert('Data uploaded successfully! Calculations are on their way.');
      // Reset
      setCurrentStep('upload');
      setUploadedFile(null);
      setValidationResults(null);
    }, 1500);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Upload Data</h1>
        <p className="text-slate-400 mt-2">Import monthly claims and expense data</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 ${currentStep === 'upload' ? 'text-accent-primary' : 'text-status-green'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'upload' ? 'border-accent-primary bg-accent-primary/10' : 'border-status-green bg-status-green/10'}`}>
            {currentStep === 'validate' || currentStep === 'review' ? <CheckCircle className="w-5 h-5" /> : '1'}
          </div>
          <span className="text-sm font-medium">Upload</span>
        </div>

        <ArrowRight className="w-5 h-5 text-slate-600" />

        <div className={`flex items-center gap-2 ${currentStep === 'validate' ? 'text-accent-primary' : currentStep === 'review' ? 'text-status-green' : 'text-slate-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'validate' ? 'border-accent-primary bg-accent-primary/10' : currentStep === 'review' ? 'border-status-green bg-status-green/10' : 'border-slate-700'}`}>
            {currentStep === 'review' ? <CheckCircle className="w-5 h-5" /> : '2'}
          </div>
          <span className="text-sm font-medium">Validate</span>
        </div>

        <ArrowRight className="w-5 h-5 text-slate-600" />

        <div className={`flex items-center gap-2 ${currentStep === 'review' ? 'text-accent-primary' : 'text-slate-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'review' ? 'border-accent-primary bg-accent-primary/10' : 'border-slate-700'}`}>
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
              {templates.map(template => (
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
                    <FileSpreadsheet className={`w-5 h-5 mt-0.5 ${selectedFileType === template.id ? 'text-accent-primary' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-semibold">{template.name}</div>
                      <div className="text-xs text-slate-400 mt-1">{template.description}</div>
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
                if (file) handleFileUpload(file);
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
                  Download the CSV template for {templates.find(t => t.id === selectedFileType)?.name}
                </p>
                <button className="mt-2 text-sm text-accent-info hover:underline">
                  Download Template →
                </button>
              </div>
            </div>
          </div>
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
      {currentStep === 'review' && validationResults && (
        <div className="space-y-6">
          {/* Validation Results */}
          <div className="report-card">
            <h3 className="text-lg font-semibold mb-4">Validation Results</h3>
            <div className="space-y-3">
              {Object.entries(validationResults).map(([key, result]: [string, any]) => (
                <div key={key} className={`p-3 rounded-card border ${result.passed ? 'border-status-green/20 bg-status-green/5' : 'border-status-red/20 bg-status-red/5'}`}>
                  <div className="flex items-start gap-3">
                    {result.passed ? (
                      <CheckCircle className="w-5 h-5 text-status-green mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-status-red mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className="text-sm text-slate-400 mt-1">{result.message}</div>
                      {result.details && (
                        <div className="mt-2 text-xs text-slate-500">
                          <div>All Plans Total: ${result.details.allPlansTotal.toLocaleString()}</div>
                          <div>Sum of Plans: ${result.details.sumOfPlans.toLocaleString()}</div>
                          <div>Difference: ${result.details.difference.toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Preview */}
          <div className="report-card">
            <h3 className="text-lg font-semibold mb-4">Data Preview</h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Subscribers</th>
                    <th>Medical</th>
                    <th>Pharmacy</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Jun 2025</td>
                    <td className="text-right">474</td>
                    <td className="text-right">$606,934</td>
                    <td className="text-right">$57,999</td>
                    <td className="text-right font-semibold">$664,933</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="text-center text-sm text-slate-500 py-2">
                      [Additional rows...]
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => {
                setCurrentStep('upload');
                setUploadedFile(null);
                setValidationResults(null);
              }}
              className="px-6 py-3 bg-base-900 border border-slate-700 rounded-card font-medium hover:bg-base-800 transition-uber"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
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
