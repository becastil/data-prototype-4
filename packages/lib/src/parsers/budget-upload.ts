import Papa from "papaparse";
import * as XLSX from "xlsx";
import { MonthlyActualsRowSchema, type MonthlyActualsRow } from "../types/budget";

export interface ParseError {
  row: number;
  column: string;
  value: any;
  error: string;
}

export interface ParseResult {
  data: MonthlyActualsRow[];
  errors: ParseError[];
  totalRows: number;
}

/**
 * Normalizes numeric and string values from CSV/XLSX
 * Strips $, commas, and whitespace from numeric fields
 */
function normalizeValue(val: any): any {
  if (val === null || val === undefined) {
    return "";
  }

  if (typeof val === "string") {
    // Strip $, commas, and extra whitespace
    const cleaned = val.replace(/[$,\s]/g, "");
    return cleaned === "" ? "" : cleaned;
  }

  return val;
}

/**
 * Normalizes all fields in a row object
 */
function normalizeRow(row: any): any {
  const normalized: any = {};

  for (const [key, val] of Object.entries(row)) {
    normalized[key] = normalizeValue(val);
  }

  return normalized;
}

/**
 * Parses CSV file buffer and validates against schema
 */
export async function parseCSV(
  buffer: Buffer,
  encoding?: BufferEncoding
): Promise<ParseResult> {
  const resolvedEncoding: BufferEncoding = encoding ?? "utf8";

  return new Promise((resolve) => {
    Papa.parse(buffer.toString(resolvedEncoding), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (results) => {
        resolve(validateRows(results.data as any[]));
      },
      error: (error: Error) => {
        resolve({
          data: [],
          errors: [{ row: 0, column: "", value: "", error: error.message }],
          totalRows: 0,
        });
      },
    });
  });
}

/**
 * Parses XLSX file buffer and validates against schema
 */
export function parseXLSX(buffer: Buffer): ParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return {
        data: [],
        errors: [{ row: 0, column: "", value: "", error: "No sheets found in workbook" }],
        totalRows: 0,
      };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: "",
      header: undefined, // Use first row as header
    });

    // Transform headers to match expected format
    const transformedRows = rows.map((row: any) => {
      const transformed: any = {};
      for (const [key, val] of Object.entries(row)) {
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, "_");
        transformed[normalizedKey] = val;
      }
      return transformed;
    });

    return validateRows(transformedRows);
  } catch (error: any) {
    return {
      data: [],
      errors: [{ row: 0, column: "", value: "", error: error.message }],
      totalRows: 0,
    };
  }
}

/**
 * Validates parsed rows against MonthlyActualsRowSchema
 */
function validateRows(rows: any[]): ParseResult {
  const data: MonthlyActualsRow[] = [];
  const errors: ParseError[] = [];

  rows.forEach((row, idx) => {
    // Normalize all fields
    const normalized = normalizeRow(row);

    // Validate with Zod schema
    const result = MonthlyActualsRowSchema.safeParse(normalized);

    if (result.success) {
      data.push(result.data);
    } else {
      // Collect all validation errors for this row
      result.error.issues.forEach((issue) => {
        errors.push({
          row: idx + 2, // +2 for header row and 1-indexed
          column: issue.path.join(".") || "unknown",
          value: normalized[issue.path[0] as string],
          error: issue.message,
        });
      });
    }
  });

  return {
    data,
    errors,
    totalRows: rows.length,
  };
}

/**
 * Determines file type from filename
 */
export function getFileType(filename: string): "csv" | "xlsx" | "unknown" {
  const lowerFilename = filename.toLowerCase();

  if (lowerFilename.endsWith(".csv")) {
    return "csv";
  }

  if (lowerFilename.endsWith(".xlsx") || lowerFilename.endsWith(".xls")) {
    return "xlsx";
  }

  return "unknown";
}

/**
 * Main parse function that auto-detects file type
 */
export async function parseFile(
  buffer: Buffer,
  filename: string
): Promise<ParseResult> {
  const fileType = getFileType(filename);

  if (fileType === "csv") {
    return await parseCSV(buffer);
  }

  if (fileType === "xlsx") {
    return parseXLSX(buffer);
  }

  return {
    data: [],
    errors: [{ row: 0, column: "", value: "", error: "Unsupported file type" }],
    totalRows: 0,
  };
}
