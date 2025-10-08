#!/usr/bin/env node

/**
 * Convert a sanitized Inmovilla XML export into a flat CSV file that Excel can open.
 *
 * Usage:
 *   node xml-to-csv.mjs <input.xml> [output.csv] [--items propiedad] [--delimiter ,]
 *
 * Examples:
 *   node xml-to-csv.mjs ../../inmovilla_clean.xml ../../inmovilla.csv
 *   node xml-to-csv.mjs ../../inmovilla_clean.xml --items propiedad --delimiter ';'
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { parseStringPromise } from 'xml2js';

function printHelp() {
  console.log(`Usage: node xml-to-csv.mjs <input.xml> [output.csv] [options]

Options:
  --items, -i <name>     Name of the repeating element to export (default: propiedad)
  --delimiter, -d <chr>  CSV delimiter to use (default: ,)
  --help, -h             Show this help message`);
}

function parseArgs(argv) {
  const options = {
    input: null,
    output: null,
    itemKey: 'propiedad',
    delimiter: ','
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      case '--items':
      case '-i':
        options.itemKey = argv[++i] ?? null;
        break;
      case '--delimiter':
      case '-d':
        options.delimiter = argv[++i] ?? ',';
        break;
      case '--output':
      case '-o':
        options.output = argv[++i] ?? null;
        break;
      default:
        if (!options.input) {
          options.input = arg;
        } else if (!options.output) {
          options.output = arg;
        } else {
          throw new Error(`Unexpected argument: ${arg}`);
        }
        break;
    }
  }

  if (!options.input) {
    throw new Error('Missing input XML file.');
  }

  if (!options.itemKey) {
    throw new Error('Item key cannot be empty.');
  }

  if (!options.output) {
    const base = path.basename(options.input, path.extname(options.input));
    options.output = `${base}.csv`;
  }

  return {
    ...options,
    input: path.resolve(options.input),
    output: path.resolve(options.output)
  };
}

function findItemCollection(root, itemKey) {
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === null || current === undefined) {
      continue;
    }
    if (Array.isArray(current)) {
      for (const item of current) {
        queue.push(item);
      }
      continue;
    }
    if (typeof current === 'object') {
      for (const [key, value] of Object.entries(current)) {
        if (key === itemKey) {
          if (Array.isArray(value)) {
            return value;
          }
          if (value === undefined || value === null) {
            return [];
          }
          return [value];
        }
        if (value !== null && typeof value === 'object') {
          queue.push(value);
        }
      }
    }
  }

  return null;
}

function flattenRecord(node, prefix = '', target = {}) {
  if (node === null || node === undefined) {
    if (prefix) {
      target[prefix] = '';
    }
    return target;
  }

  if (typeof node !== 'object' || node instanceof Date) {
    target[prefix] = String(node);
    return target;
  }

  if (Array.isArray(node)) {
    if (node.length === 0) {
      target[prefix] = '';
      return target;
    }
    const areAllScalar = node.every(
      (item) => item === null || item === undefined || typeof item !== 'object'
    );
    if (areAllScalar) {
      const joined = node
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value))
        .join('|');
      target[prefix] = joined;
      return target;
    }
    node.forEach((value, index) => {
      const nextPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`;
      flattenRecord(value, nextPrefix, target);
    });
    return target;
  }

  for (const [key, value] of Object.entries(node)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      flattenRecord(value, nextPrefix, target);
    } else {
      target[nextPrefix] = value === undefined || value === null ? '' : String(value);
    }
  }

  return target;
}

function toCsvValue(value, delimiter) {
  const stringValue = value ?? '';
  if (stringValue === '') {
    return '';
  }
  const needsQuoting =
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r') ||
    stringValue.includes(delimiter);
  const cleaned = stringValue.replace(/\r?\n/g, ' ');
  if (!needsQuoting) {
    return cleaned;
  }
  return `"${cleaned.replace(/"/g, '""')}"`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const xmlContent = await readFile(options.input, 'utf8');
  const parsed = await parseStringPromise(xmlContent, {
    explicitArray: false,
    mergeAttrs: true,
    trim: true
  });

  const items = findItemCollection(parsed, options.itemKey);
  if (!items) {
    throw new Error(
      `Could not find any '${options.itemKey}' elements in ${options.input}. ` +
        `Use --items to specify a different node name.`
    );
  }

  const rows = items.map((item) => flattenRecord(item));
  if (rows.length === 0) {
    console.warn(`No '${options.itemKey}' nodes found. Nothing to export.`);
    await writeFile(options.output, '');
    return;
  }

  const headerSet = new Set();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!headerSet.has(key)) {
        headerSet.add(key);
      }
    });
  });
  const headers = Array.from(headerSet);

  const csvLines = [headers.map((header) => toCsvValue(header, options.delimiter)).join(options.delimiter)];
  for (const row of rows) {
    const line = headers
      .map((header) => {
        const value = Object.prototype.hasOwnProperty.call(row, header) ? row[header] : '';
        return toCsvValue(value, options.delimiter);
      })
      .join(options.delimiter);
    csvLines.push(line);
  }

  await writeFile(options.output, csvLines.join('\n'), 'utf8');
  console.log(`CSV written to ${options.output} (${rows.length} rows, ${headers.length} columns)`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
