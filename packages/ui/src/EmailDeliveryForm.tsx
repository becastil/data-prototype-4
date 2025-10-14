"use client";

import { useState } from "react";
import { Mail, Loader2, Send, Plus, X } from "lucide-react";
import { arrayBufferToBase64 } from "./utils/base64";

interface EmailDeliveryFormProps {
  planYearId: string;
  clientName: string;
  planYearLabel: string;
}

export function EmailDeliveryForm({
  planYearId,
  clientName,
  planYearLabel,
}: EmailDeliveryFormProps) {
  const [recipients, setRecipients] = useState<string[]>([""]);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState(
    `Claims & Expenses vs Budget - ${clientName} (${planYearLabel})`
  );
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRecipient = () => {
    setRecipients([...recipients, ""]);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, value: string) => {
    const updated = [...recipients];
    updated[index] = value;
    setRecipients(updated);
  };

  const addCcRecipient = () => {
    setCcRecipients([...ccRecipients, ""]);
  };

  const removeCcRecipient = (index: number) => {
    setCcRecipients(ccRecipients.filter((_, i) => i !== index));
  };

  const updateCcRecipient = (index: number, value: string) => {
    const updated = [...ccRecipients];
    updated[index] = value;
    setCcRecipients(updated);
  };

  const handleSend = async () => {
    setGenerating(true);
    setSending(false);
    setError(null);
    setSuccess(false);

    try {
      // Validate recipients
      const validRecipients = recipients.filter((r) => r.trim() !== "");
      if (validRecipients.length === 0) {
        throw new Error("At least one recipient is required");
      }

      const validCc = ccRecipients.filter((r) => r.trim() !== "");

      // Step 1: Fetch calculation data
      const calcRes = await fetch(
        `/api/budget/calculate?planYearId=${planYearId}`
      );
      if (!calcRes.ok) {
        throw new Error("Failed to fetch calculations");
      }
      const calcData = await calcRes.json();

      // Step 2: Generate HTML
      const htmlRes = await fetch("/api/budget/generate-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...calcData,
          clientName,
          planYearLabel,
          planYearId,
        }),
      });

      if (!htmlRes.ok) {
        throw new Error("Failed to generate HTML");
      }

      const { html } = await htmlRes.json();

      // Step 3: Generate PDF
      setGenerating(false);
      setSending(true);

      const pdfRes = await fetch("/api/budget/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "text/html",
          "X-Plan-Year-Id": planYearId,
        },
        body: html,
      });

      if (!pdfRes.ok) {
        throw new Error("Failed to generate PDF");
      }

      const pdfBlob = await pdfRes.blob();
      const pdfBuffer = await pdfBlob.arrayBuffer();
      const pdfBase64 = arrayBufferToBase64(pdfBuffer);

      // Step 4: Generate email body
      const topDelta = `${
        calcData.ytd.variancePercent > 0 ? "Over" : "Under"
      } budget by ${Math.abs(calcData.ytd.variancePercent).toFixed(1)}%`;

      const emailBody = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #0066b2; border-bottom: 2px solid #0066b2; padding-bottom: 10px;">Claims & Expenses vs Budget Report</h2>

  <p>Dear Team,</p>

  <p>Please find attached the <strong>Claims & Expenses vs Budget</strong> report for <strong>${clientName}</strong> (${planYearLabel}).</p>

  <h3 style="color: #1f2937; margin-top: 20px;">Executive Summary</h3>
  <ul style="margin: 10px 0; padding-left: 25px;">
    <li style="margin: 8px 0;">YTD variance: <strong>${
      calcData.ytd.variancePercent > 0 ? "+" : ""
    }${calcData.ytd.variancePercent.toFixed(1)}%</strong> vs budget</li>
    <li style="margin: 8px 0;">Top delta: ${topDelta}</li>
  </ul>

  <p>The attached 2-page PDF contains:</p>
  <ol style="margin: 10px 0; padding-left: 25px;">
    <li style="margin: 8px 0;"><strong>Detailed monthly expense table</strong> with variance analysis</li>
    <li style="margin: 8px 0;"><strong>Visual trend charts</strong> and expense mix breakdown</li>
  </ol>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #d1d5db; font-size: 10pt; color: #6b7280;">
    <p><strong>Disclaimer:</strong> This report contains aggregated claims data for budget analysis purposes only. All figures are subject to final reconciliation.</p>
    <p style="margin-top: 15px;"><strong>Gallagher Benefits Services</strong><br>Confidential & Proprietary</p>
  </div>
</body>
</html>
      `;

      // Step 5: Send email
      const sendRes = await fetch("/api/budget/deliver/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: validRecipients,
          cc: validCc.length > 0 ? validCc : undefined,
          subject,
          htmlBody: emailBody,
          pdfBase64,
          planYearId,
        }),
      });

      if (!sendRes.ok) {
        const errorData = await sendRes.json();
        throw new Error(errorData.error || "Failed to send email");
      }

      setSuccess(true);
      setRecipients([""]);
      setCcRecipients([]);
    } catch (err: any) {
      console.error("Send error:", err);
      setError(err.message);
    } finally {
      setGenerating(false);
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Email PDF Report</h3>
        <p className="text-sm text-gray-500 mt-1">
          Generate and send the 2-page Claims & Expenses vs Budget PDF report
        </p>
      </div>

      {/* Recipients */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          To: <span className="text-red-600">*</span>
        </label>
        <div className="space-y-2">
          {recipients.map((recipient, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="email"
                placeholder="recipient@example.com"
                value={recipient}
                onChange={(e) => updateRecipient(idx, e.target.value)}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {recipients.length > 1 && (
                <button
                  onClick={() => removeRecipient(idx)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addRecipient}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Add recipient
        </button>
      </div>

      {/* CC Recipients */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          CC: (optional)
        </label>
        {ccRecipients.length === 0 ? (
          <button
            onClick={addCcRecipient}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add CC recipient
          </button>
        ) : (
          <div className="space-y-2">
            {ccRecipients.map((cc, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="email"
                  placeholder="cc@example.com"
                  value={cc}
                  onChange={(e) => updateCcRecipient(idx, e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => removeCcRecipient(idx)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              onClick={addCcRecipient}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add another CC
            </button>
          </div>
        )}
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subject:
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
          Email sent successfully!
        </div>
      )}

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={generating || sending || recipients[0].trim() === ""}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {generating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating PDF...
          </>
        ) : sending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Sending Email...
          </>
        ) : (
          <>
            <Send className="h-5 w-5" />
            Generate & Send Report
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        This will generate a 2-page PDF and send it to all recipients
      </p>
    </div>
  );
}
