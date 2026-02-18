"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText, ChevronRight, ChevronLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useImportLeads } from "@/lib/hooks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LeadField =
  | "firstName"
  | "lastName"
  | "phone"
  | "email"
  | "company"
  | "title"
  | "notes"
  | "skip";

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Column auto-detection helpers
// ---------------------------------------------------------------------------

const FIELD_OPTIONS: { value: LeadField; label: string }[] = [
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "company", label: "Company" },
  { value: "title", label: "Title" },
  { value: "notes", label: "Notes" },
  { value: "skip", label: "(Skip)" },
];

const HEADER_MAP: Record<string, LeadField> = {
  "first name": "firstName",
  "firstname": "firstName",
  "first": "firstName",
  "last name": "lastName",
  "lastname": "lastName",
  "last": "lastName",
  "phone": "phone",
  "phone number": "phone",
  "phonenumber": "phone",
  "mobile": "phone",
  "cell": "phone",
  "telephone": "phone",
  "email": "email",
  "email address": "email",
  "emailaddress": "email",
  "e-mail": "email",
  "company": "company",
  "company name": "company",
  "companyname": "company",
  "organization": "company",
  "org": "company",
  "title": "title",
  "job title": "title",
  "jobtitle": "title",
  "position": "title",
  "notes": "notes",
  "note": "notes",
  "comments": "notes",
  "comment": "notes",
};

function autoDetectField(header: string): LeadField {
  const normalized = header.toLowerCase().trim();
  return HEADER_MAP[normalized] ?? "skip";
}

// ---------------------------------------------------------------------------
// Minimal CSV parser (client-side, for preview only)
// ---------------------------------------------------------------------------

function parsePreviewCsv(raw: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < raw.length) {
    const char = raw[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < raw.length && raw[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      currentField += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentField.trim());
      currentField = "";
      i++;
      continue;
    }

    if (char === "\r") {
      currentRow.push(currentField.trim());
      currentField = "";
      rows.push(currentRow);
      currentRow = [];
      if (i + 1 < raw.length && raw[i + 1] === "\n") {
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentField.trim());
      currentField = "";
      rows.push(currentRow);
      currentRow = [];
      i++;
      continue;
    }

    currentField += char;
    i++;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  const nonEmpty = rows.filter(
    (row) => row.length > 1 || (row.length === 1 && row[0] !== ""),
  );

  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  return { headers: nonEmpty[0], rows: nonEmpty.slice(1) };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CsvImportModal({ open, onClose, onSuccess }: CsvImportModalProps) {
  // Steps: 1 = upload, 2 = mapping, 3 = preview/confirm
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // File state
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [csvText, setCsvText] = useState<string>("");
  const [skipFirstRow, setSkipFirstRow] = useState(true);

  // Parsed data
  const [headers, setHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<string[][]>([]);

  // Column mapping: index → field
  const [columnMapping, setColumnMapping] = useState<Record<string, LeadField>>({});

  // Drag state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import mutation
  const { mutate: importLeads, loading: importing, error: importError } = useImportLeads();
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  // ── File handling ─────────────────────────────────

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      return;
    }
    setFileName(file.name);
    setFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);

      const parsed = parsePreviewCsv(text);
      setHeaders(parsed.headers);
      setAllRows(parsed.rows);

      // Auto-detect column mapping from headers
      const mapping: Record<string, LeadField> = {};
      parsed.headers.forEach((header, idx) => {
        mapping[String(idx)] = autoDetectField(header);
      });
      setColumnMapping(mapping);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // ── Preview rows (first 3) ────────────────────────

  const previewRows = useMemo(() => allRows.slice(0, 3), [allRows]);

  // ── Validation summary ────────────────────────────

  const validationSummary = useMemo(() => {
    // Find which column index is mapped to phone
    const phoneColIndex = Object.entries(columnMapping).find(
      ([, field]) => field === "phone",
    )?.[0];

    const dataRows = skipFirstRow ? allRows : [headers, ...allRows];

    let valid = 0;
    let missingPhone = 0;

    for (const row of dataRows) {
      if (phoneColIndex !== undefined) {
        const idx = parseInt(phoneColIndex, 10);
        const phoneVal = row[idx]?.trim();
        if (phoneVal) {
          valid++;
        } else {
          missingPhone++;
        }
      } else {
        // No phone column mapped — all rows invalid
        missingPhone++;
      }
    }

    return { total: dataRows.length, valid, missingPhone };
  }, [allRows, headers, columnMapping, skipFirstRow]);

  // ── Column mapping update ─────────────────────────

  const updateMapping = useCallback((colIndex: string, field: LeadField) => {
    setColumnMapping((prev) => ({ ...prev, [colIndex]: field }));
  }, []);

  // ── Import handler ────────────────────────────────

  const handleImport = useCallback(async () => {
    try {
      const stringMapping: Record<string, string> = {};
      for (const [k, v] of Object.entries(columnMapping)) {
        stringMapping[k] = v;
      }

      const result = await importLeads({
        csvData: csvText,
        columnMapping: stringMapping,
        skipFirstRow,
      });

      setImportResult(result.data);
    } catch {
      // error is captured by the mutation hook
    }
  }, [csvText, columnMapping, skipFirstRow, importLeads]);

  // ── Reset ─────────────────────────────────────────

  const handleClose = useCallback(() => {
    setStep(1);
    setFileName(null);
    setFileSize(0);
    setCsvText("");
    setHeaders([]);
    setAllRows([]);
    setColumnMapping({});
    setSkipFirstRow(true);
    setImportResult(null);
    onClose();
  }, [onClose]);

  const handleDone = useCallback(() => {
    onSuccess();
    handleClose();
  }, [onSuccess, handleClose]);

  // ── Render nothing if not open ────────────────────

  if (!open) return null;

  // ── Format file size ──────────────────────────────

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4">
        <Card className="border-zinc-700 bg-[#131318]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Import Leads from CSV</h2>
              <p className="mt-0.5 text-sm text-zinc-400">
                {step === 1 && "Upload your CSV file"}
                {step === 2 && "Map columns to lead fields"}
                {step === 3 && "Review and confirm import"}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 border-b border-zinc-800 px-6 py-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    s === step
                      ? "bg-indigo-500 text-white"
                      : s < step
                        ? "bg-indigo-500/20 text-indigo-400"
                        : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {s}
                </div>
                <span
                  className={`text-xs ${
                    s === step ? "text-white" : "text-zinc-500"
                  }`}
                >
                  {s === 1 ? "Upload" : s === 2 ? "Map Columns" : "Confirm"}
                </span>
                {s < 3 && (
                  <ChevronRight className="h-3 w-3 text-zinc-600" />
                )}
              </div>
            ))}
          </div>

          <CardContent className="p-6">
            {/* ── Step 1: File Upload ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
                    isDragOver
                      ? "border-indigo-500 bg-indigo-500/5"
                      : "border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <Upload className="h-8 w-8 text-zinc-500" />
                  <p className="mt-3 text-sm text-zinc-400">
                    Drag & drop a CSV file here, or{" "}
                    <span className="text-indigo-400">click to browse</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Only .csv files are supported
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>

                {fileName && (
                  <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                    <FileText className="h-5 w-5 text-indigo-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{fileName}</p>
                      <p className="text-xs text-zinc-500">
                        {formatSize(fileSize)} &middot; {allRows.length} data rows
                      </p>
                    </div>
                    <Badge variant="success">Ready</Badge>
                  </div>
                )}

                {fileName && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="skipHeader"
                      checked={skipFirstRow}
                      onChange={(e) => setSkipFirstRow(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500"
                    />
                    <label htmlFor="skipHeader" className="text-sm text-zinc-400">
                      First row contains column headers
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Column Mapping ── */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                  Map each CSV column to a lead field. Preview shows the first 3 rows.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        {headers.map((header, idx) => (
                          <th key={idx} className="px-3 py-2">
                            <div className="space-y-2">
                              <span className="block text-xs font-medium text-zinc-500">
                                {header}
                              </span>
                              <select
                                value={columnMapping[String(idx)] || "skip"}
                                onChange={(e) =>
                                  updateMapping(String(idx), e.target.value as LeadField)
                                }
                                className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                              >
                                {FIELD_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className="border-b border-zinc-800/50"
                        >
                          {headers.map((_, colIdx) => (
                            <td
                              key={colIdx}
                              className="max-w-[180px] truncate px-3 py-2 text-xs text-zinc-400"
                            >
                              {row[colIdx] || ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!Object.values(columnMapping).includes("phone") && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <p className="text-sm text-amber-400">
                      Phone is required. Please map at least one column to Phone.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Preview & Confirm ── */}
            {step === 3 && !importResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-white">
                      {validationSummary.total}
                    </p>
                    <p className="text-xs text-zinc-500">Total Rows</p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-emerald-400">
                      {validationSummary.valid}
                    </p>
                    <p className="text-xs text-zinc-500">Valid Rows</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-amber-400">
                      {validationSummary.missingPhone}
                    </p>
                    <p className="text-xs text-zinc-500">Missing Phone</p>
                  </div>
                </div>

                {/* Mapping summary */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Column Mapping
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(columnMapping)
                      .filter(([, field]) => field !== "skip")
                      .map(([colIdx, field]) => (
                        <Badge key={colIdx} variant="secondary">
                          {headers[parseInt(colIdx, 10)]} &rarr;{" "}
                          {FIELD_OPTIONS.find((f) => f.value === field)?.label}
                        </Badge>
                      ))}
                  </div>
                </div>

                {validationSummary.missingPhone > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <p className="text-sm text-amber-400">
                      {validationSummary.missingPhone} row(s) are missing a phone number and will be skipped.
                    </p>
                  </div>
                )}

                {importError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <p className="text-sm text-red-400">{importError}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Import Result ── */}
            {step === 3 && importResult && (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-4">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  <p className="mt-3 text-lg font-semibold text-white">
                    Import Complete
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-emerald-400">
                      {importResult.imported}
                    </p>
                    <p className="text-xs text-zinc-500">Imported</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-amber-400">
                      {importResult.skipped}
                    </p>
                    <p className="text-xs text-zinc-500">Skipped</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Errors
                    </p>
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-zinc-400">
                        {err}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4">
            <div>
              {step > 1 && !importResult && (
                <Button
                  variant="outline"
                  onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {importResult ? (
                <Button onClick={handleDone}>Done</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  {step === 1 && (
                    <Button
                      disabled={!fileName}
                      onClick={() => setStep(2)}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                  {step === 2 && (
                    <Button
                      disabled={!Object.values(columnMapping).includes("phone")}
                      onClick={() => setStep(3)}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                  {step === 3 && (
                    <Button
                      disabled={importing || validationSummary.valid === 0}
                      onClick={handleImport}
                    >
                      {importing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Import {validationSummary.valid} Lead
                          {validationSummary.valid !== 1 ? "s" : ""}
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
