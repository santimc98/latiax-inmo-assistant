#!/usr/bin/env node

/**
 * Analyse an Inmovilla CSV export and produce:
 *  - columns_review.csv: suggested mapping and scoring (A/B/C/X) per column.
 *  - inmovilla_canonical.csv: dataset normalized to the canonical schema (A/B fields only).
 *
 * Usage examples:
 *   node tools/etl/columns-review.mjs --input ./inmovilla_clean.csv
 *   node tools/etl/columns-review.mjs ./data/inmovilla_clean.csv --delimiter ';'
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OPTIONS = {
  delimiter: null
};

function parseArgs(argv) {
  const options = { ...DEFAULT_OPTIONS };
  const inputs = [];

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    switch (token) {
      case '--input':
      case '-i':
        options.input = argv[++i];
        break;
      case '--delimiter':
      case '-d':
        options.delimiter = argv[++i];
        break;
      case '--schema':
        options.schema = argv[++i];
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        inputs.push(token);
        break;
    }
  }

  if (!options.input) {
    if (inputs.length === 0) {
      throw new Error('Missing input CSV path. Use --input <file>');
    }
    options.input = inputs[0];
  }

  options.input = path.resolve(options.input);
  if (!options.schema) {
    options.schema = path.resolve(path.join(__dirname, 'schema.json'));
  } else {
    options.schema = path.resolve(options.schema);
  }

  options.outputDir = path.dirname(options.input);
  options.columnsReviewPath = path.join(options.outputDir, 'columns_review.csv');
  options.canonicalCsvPath = path.join(options.outputDir, 'inmovilla_canonical.csv');

  return options;
}

function printHelp() {
  console.log(`Usage: node tools/etl/columns-review.mjs --input <inmovilla_clean.csv> [options]

Options:
  --delimiter, -d    Override detected delimiter (, or ;)
  --schema           Path to schema.json (defaults to tools/etl/schema.json)
  --help, -h         Show this help message`);
}

function detectDelimiter(headerLine) {
  if (!headerLine) {
    return ',';
  }
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  if (semicolonCount > commaCount) {
    return ';';
  }
  return ',';
}

function normalizeKey(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeWhitespace(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizeBoolean(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  const text = String(value).trim().toLowerCase();
  if (text === '') {
    return '';
  }
  const trueValues = new Set(['1', 'true', 't', 'si', 'sí', 's', 'y', 'yes']);
  const falseValues = new Set(['0', 'false', 'f', 'no', 'n']);
  if (trueValues.has(text)) {
    return 'true';
  }
  if (falseValues.has(text)) {
    return 'false';
  }
  return '';
}

function normalizeNumber(value, { decimals = null } = {}) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return '';
    }
    return decimals !== null ? value.toFixed(decimals) : String(value);
  }

  let text = String(value).trim();
  if (text === '') {
    return '';
  }

  text = text
    .replace(/%/g, '')
    .replace(/€/g, '')
    .replace(/\s+/g, '')
    .replace(/m2|m²|metroscuadrados/gi, '');

  // Remove thousand separators (dot or comma) when appropriate.
  text = text.replace(/\.(?=\d{3}(?:[.,]|$))/g, '');
  text = text.replace(/,(?=\d{3}(?:[.,]|$))/g, '');

  // Replace remaining commas with dot for decimal separator.
  text = text.replace(/,/g, '.');

  // Remove any character that is not part of a number, decimal point, or minus sign.
  text = text.replace(/[^0-9.\-]/g, '');

  if (text === '' || text === '.' || text === '-' || text === '-.' || text === '.-') {
    return '';
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    return '';
  }

  if (decimals !== null) {
    return parsed.toFixed(decimals);
  }

  return String(parsed);
}

function normalizeUrl(value) {
  const text = normalizeWhitespace(value);
  if (!text) {
    return '';
  }
  try {
    const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;
    const url = new URL(withProtocol);
    return url.toString();
  } catch {
    return '';
  }
}

function splitPotentialList(value) {
  const text = normalizeWhitespace(value);
  if (!text) {
    return [];
  }
  if (
    (text.startsWith('[') && text.endsWith(']')) ||
    (text.startsWith('"') && text.endsWith('"'))
  ) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      // ignore malformed JSON content
    }
  }
  return text
    .split(/[|;,]\s*|\s{2,}/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectUrls(raw) {
  const items = Array.isArray(raw) ? raw : splitPotentialList(raw);
  const result = [];
  const seen = new Set();
  for (const candidate of items) {
    const normalized = normalizeUrl(candidate);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

const OPERATION_MAP = new Map([
  ['venta', 'venta'],
  ['comprar', 'venta'],
  ['alquiler', 'alquiler'],
  ['alquiler_larga', 'alquiler'],
  ['alquiler_temporada', 'alquiler_temporada'],
  ['alquiler_vacacional', 'alquiler_temporada'],
  ['traspaso', 'traspaso']
]);

const PROPERTY_MAP = new Map([
  ['piso', 'piso'],
  ['apartamento', 'piso'],
  ['atico', 'atico'],
  ['ático', 'atico'],
  ['duplex', 'duplex'],
  ['dúplex', 'duplex'],
  ['chalet', 'chalet'],
  ['adosado', 'adosado'],
  ['casa', 'casa'],
  ['villa', 'chalet'],
  ['local', 'local'],
  ['local_comercial', 'local'],
  ['oficina', 'oficina'],
  ['nave', 'nave'],
  ['garaje', 'garaje'],
  ['parking', 'garaje'],
  ['trastero', 'trastero'],
  ['terreno', 'terreno'],
  ['solar', 'terreno'],
  ['parcelas', 'terreno'],
  ['edificio', 'edificio']
]);

function normalizeOperationType(value) {
  const text = normalizeWhitespace(value);
  if (text === '') {
    return '';
  }
  const key = normalizeKey(text);
  for (const [pattern, canonical] of OPERATION_MAP.entries()) {
    if (key.includes(pattern)) {
      return canonical;
    }
  }
  return text.toLowerCase();
}

function normalizePropertyType(value) {
  const text = normalizeWhitespace(value);
  if (text === '') {
    return '';
  }
  const key = normalizeKey(text);
  for (const [pattern, canonical] of PROPERTY_MAP.entries()) {
    if (key.includes(pattern)) {
      return canonical;
    }
  }
  return text.toLowerCase();
}

const FIELD_NORMALIZERS = {
  listing_id: (value) => normalizeWhitespace(value),
  title: (value) => normalizeWhitespace(value),
  description: (value) => normalizeWhitespace(value),
  operation_type: (value) => normalizeOperationType(value),
  property_type: (value) => normalizePropertyType(value),
  price: (value) => normalizeNumber(value, { decimals: 0 }),
  area_m2: (value) => normalizeNumber(value, { decimals: 2 }),
  bedrooms: (value) => normalizeNumber(value, { decimals: 0 }),
  bathrooms: (value) => normalizeNumber(value, { decimals: 0 }),
  address_municipality: (value) => normalizeWhitespace(value),
  address_province: (value) => normalizeWhitespace(value),
  neighborhood: (value) => normalizeWhitespace(value),
  floor_number: (value) => normalizeWhitespace(value),
  has_elevator: (value) => normalizeBoolean(value),
  has_parking: (value) => normalizeBoolean(value),
  condition: (value) => normalizeWhitespace(value).toLowerCase(),
  energy_rating: (value) => normalizeWhitespace(value).toUpperCase(),
  latitude: (value) => normalizeNumber(value, { decimals: 6 }),
  longitude: (value) => normalizeNumber(value, { decimals: 6 }),
  reference_url: (value) => normalizeUrl(value),
  primary_image_url: (value) => normalizeUrl(value),
  photos: (value) => collectUrls(value).join('|'),
  furnished: (value) => normalizeBoolean(value),
  exterior: (value) => normalizeBoolean(value),
  terrace: (value) => normalizeBoolean(value),
  storage_room: (value) => normalizeBoolean(value),
  air_conditioning: (value) => normalizeBoolean(value),
  pets_allowed: (value) => normalizeBoolean(value),
  available_from: (value) => normalizeWhitespace(value),
  year_built: (value) => normalizeNumber(value, { decimals: 0 }),
  community_fees: (value) => normalizeNumber(value, { decimals: 2 }),
  features: (value) => normalizeWhitespace(value)
};

function normalizeValue(fieldName, rawValue) {
  const normalizer = FIELD_NORMALIZERS[fieldName];
  if (!normalizer) {
    return normalizeWhitespace(rawValue);
  }
  return normalizer(rawValue);
}

function toCsvLine(columns) {
  return columns
    .map((value) => {
      if (value === null || value === undefined) {
        return '';
      }
      const text = String(value);
      if (text === '') {
        return '';
      }
      if (/[,"\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    })
    .join(',');
}

function buildCanonicalHeaders(schema) {
  const importantFields = schema.fields
    .filter((field) => field.importance === 'A' || field.importance === 'B')
    .map((field) => field.name);
  const derivedFields = (schema.derived || [])
    .filter((field) => field.importance === 'A' || field.importance === 'B')
    .map((field) => field.name);
  return [...importantFields, ...derivedFields];
}

function formatCoverage(nonEmpty, totalRows) {
  if (totalRows === 0) {
    return '0%';
  }
  const percent = (nonEmpty / totalRows) * 100;
  return `${percent.toFixed(1)}%`;
}

function getSchemaSchemaMap(schema) {
  const canonicalByNormalized = new Map();
  const fieldsByName = new Map();

  for (const field of schema.fields) {
    fieldsByName.set(field.name, field);
    const synonyms = new Set([field.name, ...(field.synonyms || [])]);
    for (const synonym of synonyms) {
      canonicalByNormalized.set(normalizeKey(synonym), {
        field,
        synonym
      });
    }
  }

  return { canonicalByNormalized, fieldsByName };
}

function buildDiscardSet(schema) {
  const discardSet = new Set();
  for (const label of schema.discarded_synonyms || []) {
    discardSet.add(normalizeKey(label));
  }
  return discardSet;
}

function analyseColumns(headers, records, schema) {
  const totalRows = records.length;
  const stats = new Map();
  for (const header of headers) {
    stats.set(header, { nonEmpty: 0 });
  }

  for (const row of records) {
    for (const header of headers) {
      const value = row[header];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        stats.get(header).nonEmpty += 1;
      }
    }
  }

  const { canonicalByNormalized } = getSchemaSchemaMap(schema);
  const discardSet = buildDiscardSet(schema);

  const columnMappings = new Map();
  const reviewRows = [];

  for (const header of headers) {
    const normalized = normalizeKey(header);
    const coverage = formatCoverage(stats.get(header).nonEmpty, totalRows);
    if (discardSet.has(normalized)) {
      reviewRows.push({
        column_name: header,
        score: 'X',
        suggested_mapping: '',
        reason: `Contains sensitive information (${coverage} filled). Remove before sharing.`
      });
      continue;
    }

    const directMatch = canonicalByNormalized.get(normalized);
    if (directMatch) {
      const { field, synonym } = directMatch;
      columnMappings.set(header, {
        canonical: field.name,
        importance: field.importance,
        collectMany: Boolean(field.collect_many)
      });
      reviewRows.push({
        column_name: header,
        score: field.importance,
        suggested_mapping: field.name,
        reason: `Matches canonical field '${field.name}' via '${synonym}' (${coverage} coverage).`
      });
      continue;
    }

    // Attempt heuristic match by removing numeric suffixes/prefixes.
    let heuristicMatch = null;
    for (const [key, value] of canonicalByNormalized.entries()) {
      if (key.length < 3) {
        continue;
      }
      if (normalized.includes(key)) {
        heuristicMatch = value;
        break;
      }
    }

    if (heuristicMatch) {
      const { field, synonym } = heuristicMatch;
      columnMappings.set(header, {
        canonical: field.name,
        importance: field.importance,
        collectMany: Boolean(field.collect_many)
      });
      reviewRows.push({
        column_name: header,
        score: field.importance,
        suggested_mapping: field.name,
        reason: `Heuristic match to canonical field '${field.name}' via fragment '${synonym}' (${coverage} coverage).`
      });
      continue;
    }

    reviewRows.push({
      column_name: header,
      score: 'X',
      suggested_mapping: '',
      reason: `No canonical mapping found (${coverage} coverage).`
    });
  }

  return { reviewRows, columnMappings };
}

function computeDerivedFields(record) {
  const result = {};
  const price = record.price !== '' ? Number(record.price) : null;
  const area = record.area_m2 !== '' ? Number(record.area_m2) : null;
  if (price !== null && area !== null && area > 0) {
    result.price_per_m2 = (price / area).toFixed(2);
  } else {
    result.price_per_m2 = '';
  }

  const photos = (record.photos || '')
    .split('|')
    .map((value) => value.trim())
    .filter(Boolean);
  result.photo_count = photos.length > 0 ? String(photos.length) : '0';
  if ((!record.primary_image_url || record.primary_image_url.trim() === '') && photos.length > 0) {
    result.primary_image_url = photos[0];
  }

  return result;
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const csvContent = await readFile(options.input, 'utf8');
    const schema = JSON.parse(await readFile(options.schema, 'utf8'));

    const firstLine = csvContent.split(/\r?\n/, 1)[0] || '';
    const delimiter = options.delimiter || detectDelimiter(firstLine);

    const headerRow = parse(csvContent, {
      delimiter,
      to_line: 1,
      trim: true,
      relax_quotes: true
    })[0] || [];
    const headers = headerRow.map((column) => column.trim());

    const records = parse(csvContent, {
      delimiter,
      from_line: 2,
      columns: headers,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true
    });

    const { reviewRows, columnMappings } = analyseColumns(headers, records, schema);

    const reviewCsvLines = [
      toCsvLine(['column_name', 'score', 'reason', 'suggested_mapping'])
    ];
    for (const row of reviewRows) {
      reviewCsvLines.push(
        toCsvLine([row.column_name, row.score, row.reason, row.suggested_mapping])
      );
    }
    await writeFile(options.columnsReviewPath, reviewCsvLines.join('\n'), 'utf8');

    const canonicalHeaders = buildCanonicalHeaders(schema);
    const collectManyFields = new Set(
      (schema.fields || []).filter((field) => field.collect_many).map((field) => field.name)
    );
    const canonicalRows = [];

    for (const record of records) {
      const canonicalRow = {};
      const collectors = {};
      const collectorSets = {};
      for (const field of canonicalHeaders) {
        canonicalRow[field] = '';
        if (collectManyFields.has(field)) {
          collectors[field] = [];
          collectorSets[field] = new Set();
        }
      }
      for (const [originalHeader, mapping] of columnMappings.entries()) {
        if (mapping.importance !== 'A' && mapping.importance !== 'B') {
          continue;
        }
        const canonicalField = mapping.canonical;
        if (!canonicalHeaders.includes(canonicalField)) {
          continue;
        }
        const rawValue = record[originalHeader];
        const normalized = normalizeValue(canonicalField, rawValue);
        const isCollectMany =
          collectManyFields.has(canonicalField) && Object.prototype.hasOwnProperty.call(collectors, canonicalField);
        if (isCollectMany) {
          if (normalized === null || normalized === undefined || normalized === '') {
            continue;
          }
          const parts = Array.isArray(normalized)
            ? normalized
            : String(normalized)
                .split('|')
                .map((value) => value.trim())
                .filter(Boolean);
          for (const part of parts) {
            if (!collectorSets[canonicalField].has(part)) {
              collectorSets[canonicalField].add(part);
              collectors[canonicalField].push(part);
            }
          }
        } else {
          if (normalized === null || normalized === undefined || normalized === '') {
            continue;
          }
          if (canonicalRow[canonicalField] === '') {
            canonicalRow[canonicalField] = normalized;
          }
        }
      }

      for (const [field, values] of Object.entries(collectors)) {
        if (values.length > 0) {
          canonicalRow[field] = values.join('|');
        } else if (canonicalHeaders.includes(field)) {
          canonicalRow[field] = '';
        }
      }

      const derived = computeDerivedFields(canonicalRow);
      for (const [key, value] of Object.entries(derived)) {
        if (canonicalHeaders.includes(key)) {
          canonicalRow[key] = value;
        }
      }

      canonicalRows.push(canonicalRow);
    }

    const canonicalCsv = [toCsvLine(canonicalHeaders)];
    for (const row of canonicalRows) {
      const values = canonicalHeaders.map((header) => row[header] ?? '');
      canonicalCsv.push(toCsvLine(values));
    }
    await writeFile(options.canonicalCsvPath, canonicalCsv.join('\n'), 'utf8');

    console.log(`Columns review saved to ${options.columnsReviewPath}`);
    console.log(`Canonical dataset saved to ${options.canonicalCsvPath}`);
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
