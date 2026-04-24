import { randomUUID } from 'node:crypto';
import { query } from '../db.js';
import { config } from '../config.js';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const WORLDBANK_BASE = 'https://api.worldbank.org/v2';
const IMF_BASE = 'https://www.imf.org/external/datamapper/api/v1';
const ECB_BASE = 'https://data-api.ecb.europa.eu/service/data';

export const EXTERNAL_SOURCES = {
  fred: {
    id: 'fred',
    label: 'FRED (Federal Reserve Bank of St. Louis)',
    requiresKey: 'FRED_API_KEY',
    description: 'Series macroeconomicas US y globales: GDP, CPI, UNRATE, FEDFUNDS, etc.',
  },
  worldbank: {
    id: 'worldbank',
    label: 'World Bank Open Data',
    requiresKey: null,
    description: 'Indicadores globales por pais (WDI). Ej NY.GDP.MKTP.CD, FP.CPI.TOTL.ZG.',
  },
  imf: {
    id: 'imf',
    label: 'IMF WEO DataMapper',
    requiresKey: null,
    description: 'World Economic Outlook: NGDPD, NGDP_RPCH, PCPIPCH, etc.',
  },
  ecb: {
    id: 'ecb',
    label: 'European Central Bank Statistical Data Warehouse',
    requiresKey: null,
    description: 'Datos de la zona euro: tasas, agregados monetarios, tipos de cambio.',
  },
};

async function httpJson(url, init = {}) {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new Error(`HTTP_TIMEOUT:${config.externalSourceTimeoutMs}`));
  }, config.externalSourceTimeoutMs);
  const abortFromParent = () => timeoutController.abort(init.signal?.reason || new Error('HTTP_ABORTED'));

  if (init.signal) {
    if (init.signal.aborted) {
      abortFromParent();
    } else {
      init.signal.addEventListener('abort', abortFromParent, { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...init,
      signal: timeoutController.signal,
      headers: { Accept: 'application/json', ...(init.headers || {}) },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Fetch ${url} failed ${response.status}: ${text.slice(0, 200)}`);
    }

    return response.json();
  } catch (error) {
    if (timeoutController.signal.reason?.message?.startsWith('HTTP_TIMEOUT:')) {
      throw new Error(`Fetch ${url} timed out after ${config.externalSourceTimeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (init.signal) {
      init.signal.removeEventListener('abort', abortFromParent);
    }
  }
}

export async function fetchFredSeries({ seriesId, startDate, endDate, apiKey }) {
  const key = apiKey || process.env.FRED_API_KEY || '';
  if (!key) {
    throw new Error('FRED_API_KEY is required to use the FRED connector.');
  }
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: key,
    file_type: 'json',
  });
  if (startDate) params.set('observation_start', startDate);
  if (endDate) params.set('observation_end', endDate);

  const data = await httpJson(`${FRED_BASE}?${params.toString()}`);
  return (data.observations || [])
    .filter((item) => item.value !== '.')
    .map((item) => ({ fecha: item.date, valor: Number(item.value) }))
    .filter((item) => Number.isFinite(item.valor));
}

export async function fetchWorldBankSeries({ country = 'all', indicator, startYear, endYear }) {
  const range = startYear && endYear ? `&date=${startYear}:${endYear}` : '';
  const url = `${WORLDBANK_BASE}/country/${country}/indicator/${indicator}?format=json&per_page=20000${range}`;
  const data = await httpJson(url);
  const rows = Array.isArray(data) && data.length >= 2 ? data[1] : [];
  return rows
    .filter((row) => row.value !== null && row.value !== undefined)
    .map((row) => ({ fecha: `${row.date}-01-01`, valor: Number(row.value) }))
    .filter((row) => Number.isFinite(row.valor))
    .reverse();
}

export async function fetchImfWeoSeries({ indicator, countryIso3 }) {
  const url = `${IMF_BASE}/${indicator}/${countryIso3}`;
  const data = await httpJson(url);
  const countryBlock = data.values?.[indicator]?.[countryIso3] || {};
  return Object.entries(countryBlock)
    .map(([year, value]) => ({ fecha: `${year}-01-01`, valor: Number(value) }))
    .filter((row) => Number.isFinite(row.valor))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function fetchEcbSeries({ flowRef, seriesKey }) {
  const url = `${ECB_BASE}/${flowRef}/${seriesKey}?format=jsondata&lastNObservations=240`;
  const data = await httpJson(url);
  const obs = data.dataSets?.[0]?.series?.['0:0:0:0:0']?.observations || {};
  const timeValues = data.structure?.dimensions?.observation?.[0]?.values || [];
  return Object.entries(obs)
    .map(([index, value]) => {
      const period = timeValues[Number(index)]?.id;
      return { fecha: period ? `${period}-01` : null, valor: Number(value?.[0]) };
    })
    .filter((row) => row.fecha && Number.isFinite(row.valor));
}

export async function upsertIndicatorWithSeries({
  codigo,
  nombre,
  unidad,
  frecuencia,
  descripcion,
  series,
}) {
  await query(
    `
      INSERT INTO indicadores (codigo, nombre, unidad, frecuencia, descripcion)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (codigo) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        unidad = EXCLUDED.unidad,
        frecuencia = EXCLUDED.frecuencia,
        descripcion = EXCLUDED.descripcion
    `,
    [codigo, nombre, unidad, frecuencia, descripcion]
  );

  const idResult = await query('SELECT id FROM indicadores WHERE codigo = $1', [codigo]);
  const indicadorId = idResult.rows[0]?.id;
  if (!indicadorId) throw new Error(`Could not resolve indicador ${codigo}`);

  let inserted = 0;
  for (const point of series) {
    if (!point.fecha || !Number.isFinite(point.valor)) continue;
    const result = await query(
      `
        INSERT INTO series_tiempo (indicador_id, fecha, valor)
        VALUES ($1, $2::date, $3)
        ON CONFLICT (indicador_id, fecha) DO UPDATE SET valor = EXCLUDED.valor
        RETURNING id
      `,
      [indicadorId, point.fecha, point.valor]
    );
    if (result.rowCount > 0) inserted += 1;
  }

  await query(
    `
      INSERT INTO fuentes_datos_log (id, source, codigo, params, rows_inserted, created_at)
      VALUES ($1, $2, $3, $4, $5, now())
    `,
    [randomUUID(), 'external', codigo, JSON.stringify({}), inserted]
  ).catch(() => null);

  return { codigo, indicadorId, points: inserted };
}

export async function ingestExternalSeries({ source, codigo, nombre, unidad, frecuencia, descripcion, params }) {
  let series = [];
  if (source === 'fred') {
    series = await fetchFredSeries(params);
  } else if (source === 'worldbank') {
    series = await fetchWorldBankSeries(params);
  } else if (source === 'imf') {
    series = await fetchImfWeoSeries(params);
  } else if (source === 'ecb') {
    series = await fetchEcbSeries(params);
  } else {
    throw new Error(`Unknown source: ${source}`);
  }

  if (series.length === 0) {
    throw new Error(`No data returned from ${source} for ${codigo}`);
  }

  return upsertIndicatorWithSeries({ codigo, nombre, unidad, frecuencia, descripcion, series });
}
