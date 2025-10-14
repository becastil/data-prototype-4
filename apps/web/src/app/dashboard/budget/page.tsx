import { Suspense } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  BudgetUpload,
  BudgetConfigEditor,
  VariancePreviewGrid,
  EmailDeliveryForm,
} from "@medical-reporting/ui";
import { FileUp, Settings, BarChart3, Mail, Loader2 } from "lucide-react";

interface BudgetDashboardProps {
  searchParams: { planYearId?: string };
}

export default async function BudgetDashboard({
  searchParams,
}: BudgetDashboardProps) {
  const planYearId = searchParams.planYearId || "";

  // In production, fetch client and plan year data from DB
  // For now, using placeholder data
  const clientName = "Sample Client";
  const planYearLabel = "2024 Plan Year";

  if (!planYearId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-900 font-medium">No plan year selected</p>
          <p className="text-sm text-yellow-700 mt-2">
            Please select a plan year from the dashboard to access budget
            analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Claims & Expenses vs Budget
        </h1>
        <p className="text-gray-600 mt-2">
          Upload actuals, configure budgets, analyze variance, and deliver PDF
          reports
        </p>
      </div>

      <Tabs.Root defaultValue="upload" className="w-full">
        <Tabs.List className="flex space-x-1 border-b border-gray-200 mb-6">
          <Tabs.Trigger
            value="upload"
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 border-b-2 border-transparent hover:text-blue-600 hover:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
          >
            <FileUp className="h-4 w-4" />
            1. Upload Data
          </Tabs.Trigger>

          <Tabs.Trigger
            value="config"
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 border-b-2 border-transparent hover:text-blue-600 hover:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
          >
            <Settings className="h-4 w-4" />
            2. Configure
          </Tabs.Trigger>

          <Tabs.Trigger
            value="preview"
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 border-b-2 border-transparent hover:text-blue-600 hover:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            3. Preview
          </Tabs.Trigger>

          <Tabs.Trigger
            value="deliver"
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 border-b-2 border-transparent hover:text-blue-600 hover:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
          >
            <Mail className="h-4 w-4" />
            4. Deliver
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="upload" className="focus:outline-none">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <Suspense fallback={<LoadingSpinner />}>
              <BudgetUpload planYearId={planYearId} />
            </Suspense>
          </div>
        </Tabs.Content>

        <Tabs.Content value="config" className="focus:outline-none">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <Suspense fallback={<LoadingSpinner />}>
              <BudgetConfigEditor planYearId={planYearId} />
            </Suspense>
          </div>
        </Tabs.Content>

        <Tabs.Content value="preview" className="focus:outline-none">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <Suspense fallback={<LoadingSpinner />}>
              <VariancePreviewGrid planYearId={planYearId} />
            </Suspense>
          </div>
        </Tabs.Content>

        <Tabs.Content value="deliver" className="focus:outline-none">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <Suspense fallback={<LoadingSpinner />}>
              <EmailDeliveryForm
                planYearId={planYearId}
                clientName={clientName}
                planYearLabel={planYearLabel}
              />
            </Suspense>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          Workflow Guide
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>
            <strong>Upload Data:</strong> Import monthly actuals from CSV or
            XLSX (long format with required columns)
          </li>
          <li>
            <strong>Configure:</strong> Set up fee windows, rates, effective
            dates, and budget parameters
          </li>
          <li>
            <strong>Preview:</strong> Review calculated variance analysis and
            verify accuracy
          </li>
          <li>
            <strong>Deliver:</strong> Generate 2-page PDF and email to
            stakeholders (CFOs, HR executives)
          </li>
        </ol>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}
