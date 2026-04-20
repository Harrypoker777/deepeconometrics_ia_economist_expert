import React from 'react';
import { tool } from 'ai';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { buildForecast } from '../lib/forecast.js';
import { storeGeneratedFile } from '../lib/files.js';
import {
  listKnowledgeCategories,
  listKnowledgeDocuments,
  searchKnowledge,
} from '../lib/knowledge.js';
import {
  EXTERNAL_SOURCES,
  ingestExternalSeries,
} from '../lib/external-sources.js';

async function loadIndicators(queryClient, searchQuery, limit) {
  const words = searchQuery.split(/\s+/).filter(Boolean);
  const indicatorsResult = await queryClient(
    `
      SELECT id, codigo, nombre, unidad, frecuencia, descripcion, pais, fuente
      FROM indicadores
      WHERE $1 = ''
        OR codigo ILIKE '%' || $1 || '%'
        OR nombre ILIKE '%' || $1 || '%'
        OR descripcion ILIKE '%' || $1 || '%'
        ${words.map((_, i) => `OR codigo ILIKE '%' || $${i + 3} || '%' OR nombre ILIKE '%' || $${i + 3} || '%' OR descripcion ILIKE '%' || $${i + 3} || '%'`).join('\n        ')}
      ORDER BY nombre ASC
      LIMIT $2
    `,
    [searchQuery, limit, ...words]
  );

  if (indicatorsResult.rows.length === 0) return [];

  const ids = indicatorsResult.rows.map((row) => row.id);
  const seriesResult = await queryClient(
    `
      SELECT indicador_id, fecha, valor
      FROM series_tiempo
      WHERE indicador_id = ANY($1)
      ORDER BY fecha ASC
    `,
    [ids]
  );

  return indicatorsResult.rows.map((indicator) => ({
    ...indicator,
    latestSeries: seriesResult.rows
      .filter((row) => row.indicador_id === indicator.id)
      .slice(-24)
      .map((row) => ({
        label: row.fecha.toISOString().slice(0, 7),
        value: Number(row.valor),
      })),
  }));
}

async function loadIndicatorSeries(queryClient, indicator) {
  const indicatorResult = await queryClient(
    `
      SELECT id, codigo, nombre, unidad, frecuencia, descripcion
      FROM indicadores
      WHERE codigo ILIKE $1 OR nombre ILIKE $1
      ORDER BY codigo ASC
      LIMIT 1
    `,
    [`%${indicator}%`]
  );

  const match = indicatorResult.rows[0];
  if (!match) throw new Error(`No se encontro un indicador para "${indicator}".`);

  const seriesResult = await queryClient(
    `
      SELECT fecha, valor
      FROM series_tiempo
      WHERE indicador_id = $1
      ORDER BY fecha ASC
    `,
    [match.id]
  );

  return {
    indicator: match,
    observations: seriesResult.rows.map((row) => ({
      label: row.fecha.toISOString().slice(0, 7),
      value: Number(row.valor),
    })),
  };
}

const pdfStyles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: 'Helvetica', color: '#0f172a' },
  heading: { fontSize: 20, marginBottom: 8 },
  paragraph: { marginBottom: 10, lineHeight: 1.45 },
  section: { marginTop: 12, marginBottom: 12, padding: 12, border: '1 solid #cbd5e1', borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  small: { fontSize: 9, color: '#475569' },
});

export function createEconomicTools({ queryClient, request, sessionId }) {
  return {
    search_knowledge_base: tool({
      description:
        'Recupera pasajes relevantes de la base de conocimiento RAG (premios Nobel, conceptos economicos, historia del pensamiento economico y descripcion de fuentes). Usala cuando el usuario pregunte por teoria economica, escuelas, autores, opiniones de laureados, definiciones o guias sobre fuentes de datos.',
      inputSchema: z.object({
        query: z.string().min(3).describe('Pregunta o tema a investigar en la base de conocimiento.'),
        category: z
          .enum(['nobel', 'conceptos', 'pensamiento', 'fuentes', 'meta', 'general'])
          .optional()
          .describe('Filtro opcional por categoria de documento.'),
        limit: z.number().int().min(1).max(8).default(4),
      }),
      execute: async ({ query, category, limit }) => {
        const results = await searchKnowledge({ q: query, limit, category: category || null });
        return {
          total: results.length,
          query,
          category: category || null,
          passages: results.map((row) => ({
            slug: row.slug,
            title: row.title,
            category: row.category,
            author: row.author,
            source: row.source,
            tags: row.tags,
            similarity: row.similarity,
            content: row.content,
          })),
        };
      },
    }),

    list_knowledge_topics: tool({
      description:
        'Lista las categorias y documentos disponibles en la base de conocimiento. Util cuando el usuario pregunta "que temas puedes explicar".',
      inputSchema: z.object({
        category: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(40),
      }),
      execute: async ({ category, limit }) => {
        const [categories, documents] = await Promise.all([
          listKnowledgeCategories(),
          listKnowledgeDocuments({ category: category || null, limit }),
        ]);
        return { categories, documents };
      },
    }),

    read_indicators: tool({
      description:
        'Consulta indicadores economicos almacenados en PostgreSQL y devuelve metadatos con sus ultimos valores.',
      inputSchema: z.object({
        query: z.string().default('').describe('Codigo, nombre o termino relacionado.'),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      execute: async ({ query, limit }) => {
        const indicators = await loadIndicators(queryClient, query.trim(), limit);
        return { total: indicators.length, indicators };
      },
    }),

    ingest_external_series: tool({
      description:
        'Descarga una serie economica desde una fuente oficial (FRED, World Bank, IMF, ECB) y la guarda en la base de datos local. Usala cuando el usuario pida datos que no existen en la base local.',
      inputSchema: z.object({
        source: z.enum(['fred', 'worldbank', 'imf', 'ecb']),
        codigo: z.string().min(2).describe('Codigo con el que se guardara el indicador en la base local.'),
        nombre: z.string().min(3),
        unidad: z.string().min(1),
        frecuencia: z.enum(['diaria', 'semanal', 'mensual', 'trimestral', 'anual']),
        descripcion: z.string().min(3),
        params: z
          .object({
            seriesId: z.string().optional(),
            country: z.string().optional(),
            countryIso3: z.string().optional(),
            indicator: z.string().optional(),
            flowRef: z.string().optional(),
            seriesKey: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            startYear: z.string().optional(),
            endYear: z.string().optional(),
          })
          .describe('Parametros especificos de la fuente (ver knowledge/fuentes).'),
      }),
      execute: async (input) => {
        const result = await ingestExternalSeries(input);
        return {
          source: input.source,
          sourceInfo: EXTERNAL_SOURCES[input.source] || null,
          ...result,
        };
      },
    }),

    generate_forecast: tool({
      description:
        'Genera una proyeccion OLS en JavaScript puro a partir de un indicador almacenado o de una serie provista. Devuelve la serie historica + forecast con bandas de confianza en el formato estandar de grafico (field "chart").',
      inputSchema: z.object({
        indicator: z.string().optional(),
        horizon: z.number().int().min(1).max(24).default(6),
        confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
        observations: z
          .array(z.object({ label: z.string(), value: z.number() }))
          .optional(),
      }),
      execute: async ({ indicator, horizon, confidenceLevel, observations }) => {
        let sourceSeries = observations;
        let indicatorMeta = null;

        if ((!sourceSeries || sourceSeries.length === 0) && indicator) {
          const loaded = await loadIndicatorSeries(queryClient, indicator);
          sourceSeries = loaded.observations;
          indicatorMeta = loaded.indicator;
        }

        if (!sourceSeries || sourceSeries.length === 0) {
          throw new Error('Debes indicar un indicador existente o pasar observaciones numericas.');
        }

        const result = buildForecast(sourceSeries, { horizon, confidenceLevel });
        const title = indicatorMeta
          ? `Proyeccion de ${indicatorMeta.nombre}`
          : 'Proyeccion econometrica';
        const summary = `Forecast OLS a ${horizon} periodos con banda aproximada al ${(confidenceLevel * 100).toFixed(0)}%.`;

        return {
          indicator: indicatorMeta,
          title,
          summary,
          chart: {
            title,
            summary,
            series: result.series,
          },
          ...result,
        };
      },
    }),

    generate_chart: tool({
      description:
        'Empaqueta una serie historica u observaciones del usuario en el formato estandar de grafico (sin proyectar). Usala cuando solo quieras visualizar datos existentes.',
      inputSchema: z.object({
        title: z.string(),
        summary: z.string().default(''),
        series: z.array(
          z.object({
            label: z.string(),
            value: z.number(),
            lower: z.number().nullable().optional(),
            upper: z.number().nullable().optional(),
            type: z.enum(['historical', 'forecast']).default('historical'),
          })
        ),
      }),
      execute: async ({ title, summary, series }) => ({
        chart: { title, summary, series },
        title,
        summary,
      }),
    }),

    generate_excel: tool({
      description:
        'Genera un archivo Excel con resultados historicos y proyectados; devuelve una URL de descarga.',
      inputSchema: z.object({
        title: z.string(),
        summary: z.string(),
        rows: z.array(
          z.object({
            period: z.string(),
            value: z.number().nullable().optional(),
            forecast: z.number().nullable().optional(),
            lower: z.number().nullable().optional(),
            upper: z.number().nullable().optional(),
            pointType: z.string(),
          })
        ),
      }),
      execute: async ({ title, summary, rows }) => {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'DeepEconometrics Lab';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Forecast');
        sheet.columns = [
          { header: 'Periodo', key: 'period', width: 16 },
          { header: 'Valor historico', key: 'value', width: 18 },
          { header: 'Forecast', key: 'forecast', width: 18 },
          { header: 'Limite inferior', key: 'lower', width: 18 },
          { header: 'Limite superior', key: 'upper', width: 18 },
          { header: 'Tipo', key: 'pointType', width: 14 },
        ];

        sheet.addRow([]);
        sheet.getCell('A1').value = title;
        sheet.getCell('A2').value = summary;
        sheet.getCell('A1').font = { size: 16, bold: true };
        sheet.getCell('A2').font = { italic: true, color: { argb: 'FF475569' } };

        rows.forEach((row) => sheet.addRow(row));
        sheet.views = [{ state: 'frozen', ySplit: 3 }];

        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
        const stored = await storeGeneratedFile({
          request,
          sessionId,
          fileKind: 'excel',
          suggestedName: title,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer,
          metadata: { title, summary, rows: rows.length },
        });

        return {
          kind: 'excel',
          title,
          downloadUrl: stored.downloadUrl,
          fileName: stored.fileName,
        };
      },
    }),

    generate_pdf: tool({
      description: 'Genera un PDF ejecutivo con el resumen del forecast y su URL de descarga.',
      inputSchema: z.object({
        title: z.string(),
        summary: z.string(),
        rows: z.array(
          z.object({
            period: z.string(),
            value: z.number().nullable().optional(),
            forecast: z.number().nullable().optional(),
            lower: z.number().nullable().optional(),
            upper: z.number().nullable().optional(),
            pointType: z.string(),
          })
        ),
      }),
      execute: async ({ title, summary, rows }) => {
        const tailRows = rows.slice(-8);
        const reportDocument = React.createElement(
          Document,
          null,
          React.createElement(
            Page,
            { size: 'A4', style: pdfStyles.page },
            React.createElement(Text, { style: pdfStyles.heading }, title),
            React.createElement(Text, { style: pdfStyles.paragraph }, summary),
            React.createElement(
              View,
              { style: pdfStyles.section },
              React.createElement(Text, { style: pdfStyles.paragraph }, 'Ultimos puntos del escenario proyectado'),
              ...tailRows.map((row) =>
                React.createElement(
                  View,
                  { key: `${row.period}-${row.pointType}`, style: pdfStyles.row },
                  React.createElement(Text, null, `${row.period} (${row.pointType})`),
                  React.createElement(
                    Text,
                    null,
                    row.pointType === 'historical'
                      ? `${row.value ?? '-'}`
                      : `${row.forecast ?? '-'} [${row.lower ?? '-'} - ${row.upper ?? '-'}]`
                  )
                )
              )
            ),
            React.createElement(
              Text,
              { style: pdfStyles.small },
              'Documento generado automaticamente por DeepEconometrics Lab.'
            )
          )
        );

        const buffer = Buffer.from(await pdf(reportDocument).toBuffer());
        const stored = await storeGeneratedFile({
          request,
          sessionId,
          fileKind: 'pdf',
          suggestedName: title,
          mimeType: 'application/pdf',
          buffer,
          metadata: { title, summary, rows: rows.length },
        });

        return {
          kind: 'pdf',
          title,
          downloadUrl: stored.downloadUrl,
          fileName: stored.fileName,
        };
      },
    }),
  };
}
