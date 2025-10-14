"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

interface FeeWindow {
  id?: string;
  feeName: string;
  unitType: string;
  rate: number;
  appliesTo: string;
  effectiveStart: string;
  effectiveEnd: string;
}

interface BudgetConfigEditorProps {
  planYearId: string;
  onSaveComplete?: () => void;
}

export function BudgetConfigEditor({
  planYearId,
  onSaveComplete,
}: BudgetConfigEditorProps) {
  const [feeWindows, setFeeWindows] = useState<FeeWindow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, [planYearId]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/budget/config?planYearId=${planYearId}`);
      if (!res.ok) {
        throw new Error("Failed to load configuration");
      }
      const data = await res.json();
      setFeeWindows(data.feeWindows || []);
    } catch (err: any) {
      console.error("Load config error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addFeeWindow = () => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31);

    setFeeWindows([
      ...feeWindows,
      {
        feeName: "",
        unitType: "MONTHLY",
        rate: 0,
        appliesTo: "FIXED",
        effectiveStart: yearStart.toISOString().split("T")[0],
        effectiveEnd: yearEnd.toISOString().split("T")[0],
      },
    ]);
  };

  const updateFeeWindow = (index: number, field: keyof FeeWindow, value: any) => {
    const updated = [...feeWindows];
    updated[index] = { ...updated[index], [field]: value };
    setFeeWindows(updated);
  };

  const removeFeeWindow = (index: number) => {
    setFeeWindows(feeWindows.filter((_, i) => i !== index));
  };

  const saveConfig = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/budget/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planYearId, feeWindows }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save configuration");
      }

      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Fee Windows</h3>
          <p className="text-sm text-gray-500 mt-1">
            Define rates, fees, and effective dates for budget calculations
          </p>
        </div>
        <button
          onClick={addFeeWindow}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Fee
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {feeWindows.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-gray-500">No fee windows configured yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Click "Add Fee" to create your first fee window.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feeWindows.map((fw, idx) => (
            <div
              key={idx}
              className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white shadow-sm"
            >
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-gray-700">
                  Fee #{idx + 1}
                </span>
                <button
                  onClick={() => removeFeeWindow(idx)}
                  className="text-red-600 hover:text-red-800"
                  title="Remove fee"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fee Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Admin Fee, Stop Loss Premium"
                    value={fw.feeName}
                    onChange={(e) =>
                      updateFeeWindow(idx, "feeName", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Type
                  </label>
                  <select
                    value={fw.unitType}
                    onChange={(e) =>
                      updateFeeWindow(idx, "unitType", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ANNUAL">Annual</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="PEPM">PEPM (Per Member)</option>
                    <option value="PEPEM">PEPEM (Per Employee)</option>
                    <option value="PERCENT_OF_CLAIMS">% of Claims</option>
                    <option value="FLAT">Flat Rate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={fw.rate}
                    onChange={(e) =>
                      updateFeeWindow(idx, "rate", Number(e.target.value))
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Applies To
                  </label>
                  <select
                    value={fw.appliesTo}
                    onChange={(e) =>
                      updateFeeWindow(idx, "appliesTo", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="FIXED">Fixed Costs</option>
                    <option value="CLAIMS">Claims</option>
                    <option value="RX">Rx</option>
                    <option value="ADMIN">Admin</option>
                    <option value="STOP_LOSS">Stop Loss</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective Start
                  </label>
                  <input
                    type="date"
                    value={fw.effectiveStart}
                    onChange={(e) =>
                      updateFeeWindow(idx, "effectiveStart", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective End
                  </label>
                  <input
                    type="date"
                    value={fw.effectiveEnd}
                    onChange={(e) =>
                      updateFeeWindow(idx, "effectiveEnd", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={saveConfig}
        disabled={saving || feeWindows.length === 0}
        className="w-full bg-green-600 text-white py-2 px-4 rounded font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Configuration
          </>
        )}
      </button>
    </div>
  );
}
