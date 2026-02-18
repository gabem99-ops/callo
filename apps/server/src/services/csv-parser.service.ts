/**
 * Simple CSV parser – no external dependencies.
 *
 * Handles:
 *  - Quoted fields (double-quote delimited)
 *  - Commas inside quoted fields
 *  - Newlines inside quoted fields
 *  - Escaped quotes ("" inside a quoted field → single ")
 *  - CRLF and LF line endings
 */

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
}

export function parseCsv(raw: string): CsvParseResult {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < raw.length) {
    const char = raw[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < raw.length && raw[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      // Any other character inside quotes is literal (including commas, newlines)
      currentField += char;
      i++;
      continue;
    }

    // Not inside quotes
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

    // Handle CRLF and LF as row delimiters
    if (char === "\r") {
      currentRow.push(currentField.trim());
      currentField = "";
      rows.push(currentRow);
      currentRow = [];
      // Skip optional \n after \r
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

  // Push the last field / row if there is any trailing content
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  // Filter out completely empty rows (e.g. trailing newline)
  const nonEmptyRows = rows.filter(
    (row) => row.length > 1 || (row.length === 1 && row[0] !== ""),
  );

  if (nonEmptyRows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = nonEmptyRows[0];
  const dataRows = nonEmptyRows.slice(1);

  return { headers, rows: dataRows };
}
