#!/usr/bin/env node
'use strict';

/**
 * Import the PSA PSGC 2Q 2026 workbook into the OMPH database.
 *
 * Usage:
 *   node scripts/import-psgc.js
 *   node scripts/import-psgc.js --file ./data/PSGC-2Q-2026-Publication-Datafile.xlsx
 *   node scripts/import-psgc.js --dry-run
 *
 * The importer:
 *   - reads the "PSGC" worksheet
 *   - imports Reg, Prov, City, Mun and Bgy
 *   - intentionally skips SubMun because it is not needed for the normal
 *     patient address hierarchy
 *   - uses the official 10-digit PSGC as the stable unique key
 *   - is safe to run repeatedly (upsert behavior)
 *   - handles NCR and independent/HUC cities that have no province
 *   - handles barangays that are coded under a SubMun by attaching them to
 *     the parent City/Municipality
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const db = require('../models');

const DEFAULT_FILE = path.resolve(
  __dirname,
  '../data/PSGC-2Q-2026-Publication-Datafile.xlsx'
);
const CHUNK_SIZE = 1000;

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const filePath = getArg('--file') || DEFAULT_FILE;
const dryRun = process.argv.includes('--dry-run');

function clean(value) {
  if (value === undefined || value === null) return null;
  const valueString = String(value).trim();
  return valueString === '' ? null : valueString;
}

/**
 * Normalize a header/key coming out of the workbook so that we are immune
 * to CRLF vs LF, non-breaking spaces, and stray surrounding whitespace.
 */
function normalizeHeader(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/\u00A0/g, ' ')   // NBSP -> space
    .replace(/[\r\n]+/g, ' ')  // CR/LF runs -> single space
    .replace(/\s+/g, ' ')      // collapse all whitespace
    .trim();
}

function code10(value) {
  const valueString = clean(value);
  if (!valueString) return null;
  const digits = valueString.replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
}

function code9(value) {
  const valueString = clean(value);
  if (!valueString) return null;
  const digits = valueString.replace(/\D/g, '');
  return digits.length === 9 ? digits : null;
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function now() {
  return new Date();
}

async function bulkUpsert(Model, records, updateFields, transaction) {
  for (const part of chunk(records, CHUNK_SIZE)) {
    await Model.bulkCreate(part, {
      transaction,
      updateOnDuplicate: updateFields,
    });
  }
}

async function main() {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `PSGC workbook not found: ${filePath}\n` +
        `Put the downloaded PSA .xlsx file there or use --file /path/to/file.xlsx`
    );
  }

  const workbook = XLSX.readFile(filePath, {
    cellDates: false,
    raw: true,
  });

  if (!workbook.Sheets.PSGC) {
    throw new Error('The workbook does not contain a "PSGC" worksheet.');
  }

  const sheet = workbook.Sheets.PSGC;
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: true,
  });

  // Re-key every row using normalized headers so that lookups by
  // human-readable column name are stable across PSA file revisions.
  const rows = rawRows.map((row) => {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      out[normalizeHeader(key)] = value;
    }
    return out;
  });

  // Expected columns, expressed in normalized form.
  const requiredColumns = [
    '10-digit PSGC',
    'Name',
    'Correspondence Code',
    'Geographic Level',
    'Old names',
    'City Class',
    'Income Classification (DOF DO No. 074.2024)',
    'Urban / Rural (based on 2020 CPH)',
    '2024 Population',
    'Status',
  ];

  const sampleKeys = rows.length ? Object.keys(rows[0]) : [];
  for (const column of requiredColumns) {
    if (!sampleKeys.includes(column)) {
      throw new Error(
        `Expected PSGC column not found: "${column}"\n` +
          `Found columns: ${sampleKeys.join(', ')}`
      );
    }
  }

  const parsed = rows
    .map((row) => ({
      psgcCode: code10(row['10-digit PSGC']),
      name: clean(row['Name']),
      correspondenceCode: code9(row['Correspondence Code']),
      geographicLevel: clean(row['Geographic Level']),
      oldNames: clean(row['Old names']),
      cityClass: clean(row['City Class']),
      incomeClassification: clean(
        row['Income Classification (DOF DO No. 074.2024)']
      ),
      urbanRural: clean(row['Urban / Rural (based on 2020 CPH)']),
      population2024: numberOrNull(row['2024 Population']),
      status: clean(row['Status']),
    }))
    .filter((row) => row.psgcCode && row.name && row.geographicLevel);

  const regions = parsed.filter((row) => row.geographicLevel === 'Reg');
  const provinces = parsed.filter((row) => row.geographicLevel === 'Prov');
  const citiesMunicipalities = parsed.filter((row) =>
    ['City', 'Mun'].includes(row.geographicLevel)
  );
  const barangays = parsed.filter((row) => row.geographicLevel === 'Bgy');
  const subMunicipalities = parsed.filter(
    (row) => row.geographicLevel === 'SubMun'
  );

  const unknownLevels = [
    ...new Set(
      parsed
        .map((row) => row.geographicLevel)
        .filter(
          (level) =>
            !['Reg', 'Prov', 'City', 'Mun', 'Bgy', 'SubMun'].includes(level)
        )
    ),
  ];

  if (unknownLevels.length) {
    throw new Error(
      `Unknown geographic levels found: ${unknownLevels.join(', ')}`
    );
  }

  console.log(`PSGC workbook: ${filePath}`);
  console.log(`Rows read: ${parsed.length}`);
  console.log(
    `Regions: ${regions.length}, Provinces: ${provinces.length}, ` +
      `Cities: ${citiesMunicipalities.filter((x) => x.geographicLevel === 'City').length}, ` +
      `Municipalities: ${citiesMunicipalities.filter((x) => x.geographicLevel === 'Mun').length}, ` +
      `Barangays: ${barangays.length}, SubMun skipped: ${subMunicipalities.length}`
  );

  if (dryRun) {
    console.log('Dry run only. No database changes were made.');
    return;
  }

  const {
    Region,
    Province,
    CityMunicipality,
    Barangay,
    sequelize,
  } = db;

  if (!Region || !Province || !CityMunicipality || !Barangay) {
    throw new Error(
      'Region, Province, CityMunicipality and Barangay models must be loaded by backend/models/index.js'
    );
  }

  await sequelize.transaction(async (transaction) => {
    const timestamp = now();

    await bulkUpsert(
      Region,
      regions.map((row) => ({
        psgcCode: row.psgcCode,
        name: row.name,
        correspondenceCode: row.correspondenceCode,
        oldNames: row.oldNames,
        status: row.status,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      ['name', 'correspondenceCode', 'oldNames', 'status', 'updatedAt'],
      transaction
    );

    const regionRows = await Region.findAll({
      attributes: ['id', 'psgcCode'],
      transaction,
      raw: true,
    });
    const regionIdByCode = new Map(
      regionRows.map((row) => [String(row.psgcCode), row.id])
    );

    await bulkUpsert(
      Province,
      provinces.map((row) => {
        const regionCode = row.psgcCode.slice(0, 2) + '00000000';
        const regionId = regionIdByCode.get(regionCode);

        if (!regionId) {
          throw new Error(
            `No region found for province ${row.psgcCode} (${row.name}); expected ${regionCode}`
          );
        }

        return {
          psgcCode: row.psgcCode,
          regionId,
          name: row.name,
          correspondenceCode: row.correspondenceCode,
          oldNames: row.oldNames,
          incomeClassification: row.incomeClassification,
          status: row.status,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      }),
      [
        'regionId',
        'name',
        'correspondenceCode',
        'oldNames',
        'incomeClassification',
        'status',
        'updatedAt',
      ],
      transaction
    );

    const provinceRows = await Province.findAll({
      attributes: ['id', 'psgcCode'],
      transaction,
      raw: true,
    });
    const provinceIdByCode = new Map(
      provinceRows.map((row) => [String(row.psgcCode), row.id])
    );

    await bulkUpsert(
      CityMunicipality,
      citiesMunicipalities.map((row) => {
        const regionCode = row.psgcCode.slice(0, 2) + '00000000';
        const regionId = regionIdByCode.get(regionCode);

        if (!regionId) {
          throw new Error(
            `No region found for ${row.psgcCode} (${row.name}); expected ${regionCode}`
          );
        }

        // A City/Municipality normally belongs to the province encoded
        // by the first 5 digits. NCR and independent/HUC cities may not.
        const provinceCode = row.psgcCode.slice(0, 5) + '00000';
        const provinceId = provinceIdByCode.get(provinceCode) || null;

        return {
          psgcCode: row.psgcCode,
          regionId,
          provinceId,
          name: row.name,
          geographicLevel:
            row.geographicLevel === 'City' ? 'City' : 'Municipality',
          correspondenceCode: row.correspondenceCode,
          oldNames: row.oldNames,
          cityClass: row.cityClass,
          incomeClassification: row.incomeClassification,
          urbanRural: row.urbanRural,
          population2024: row.population2024,
          status: row.status,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      }),
      [
        'regionId',
        'provinceId',
        'name',
        'geographicLevel',
        'correspondenceCode',
        'oldNames',
        'cityClass',
        'incomeClassification',
        'urbanRural',
        'population2024',
        'status',
        'updatedAt',
      ],
      transaction
    );

    const cityMunicipalityRows = await CityMunicipality.findAll({
      attributes: ['id', 'psgcCode'],
      transaction,
      raw: true,
    });
    const cityMunicipalityIdByCode = new Map(
      cityMunicipalityRows.map((row) => [String(row.psgcCode), row.id])
    );

    const subMunCodes = new Set(subMunicipalities.map((row) => row.psgcCode));

    await bulkUpsert(
      Barangay,
      barangays.map((row) => {
        const directParentCode = row.psgcCode.slice(0, 7) + '000';

        // Normally a barangay is directly coded under its City/Municipality,
        // i.e. the first 7 digits + "000".
        //
        // For cities that use SubMuns (e.g. Manila, Quezon City), the
        // 10-digit code is laid out as:
        //     RR PP C S BBBB
        // where "C" is the City/Municipality digit(s) and "S" is the
        // SubMun. In that case the direct parent resolves to the SubMun
        // code, and we must fall back to the containing City/Municipality
        // by dropping the SubMun digit: take the first 5 digits and pad.
        // Example: 1380610004 (Barangay 689, Manila) -> 1380600000.
        let cityMunicipalityCode = directParentCode;

        if (subMunCodes.has(directParentCode)) {
          cityMunicipalityCode = row.psgcCode.slice(0, 5) + '00000';
        }

        const cityMunicipalityId =
          cityMunicipalityIdByCode.get(cityMunicipalityCode);

        if (!cityMunicipalityId) {
          throw new Error(
            `No City/Municipality found for barangay ${row.psgcCode} (${row.name}); ` +
              `expected ${cityMunicipalityCode}`
          );
        }

        return {
          psgcCode: row.psgcCode,
          cityMunicipalityId,
          name: row.name,
          correspondenceCode: row.correspondenceCode,
          oldNames: row.oldNames,
          urbanRural: row.urbanRural,
          population2024: row.population2024,
          status: row.status,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      }),
      [
        'cityMunicipalityId',
        'name',
        'correspondenceCode',
        'oldNames',
        'urbanRural',
        'population2024',
        'status',
        'updatedAt',
      ],
      transaction
    );
  });

  const [regionCount, provinceCount, cityCount, barangayCount] =
    await Promise.all([
      Region.count(),
      Province.count(),
      CityMunicipality.count(),
      Barangay.count(),
    ]);

  console.log('Import complete.');
  console.log(`regions: ${regionCount}`);
  console.log(`provinces: ${provinceCount}`);
  console.log(`cities/municipalities: ${cityCount}`);
  console.log(`barangays: ${barangayCount}`);
}

main().catch((error) => {
  console.error('\nPSGC import failed:');
  console.error(error.stack || error);
  process.exitCode = 1;
});