---
title: FRED (Federal Reserve Bank of St. Louis)
slug: fuente__fred
category: fuentes
source: fred
tags: [datos, api, estados-unidos, globales]
---

# FRED

Servicio de datos económicos del Fed St. Louis. API JSON oficial.

## Credenciales

- Requiere API key gratuita: <https://fredaccount.stlouisfed.org/apikeys>.
- Se pasa por variable `FRED_API_KEY` o parámetro `apiKey`.

## Series útiles

| Código FRED      | Descripción                              | Frecuencia |
|------------------|------------------------------------------|------------|
| `GDP`            | PIB nominal EEUU                         | Trimestral |
| `GDPC1`          | PIB real EEUU                            | Trimestral |
| `CPIAUCSL`       | IPC todos los consumidores, urbano       | Mensual    |
| `CPILFESL`       | IPC núcleo (excl. alimentos y energía)   | Mensual    |
| `UNRATE`         | Tasa de desempleo EEUU                   | Mensual    |
| `FEDFUNDS`       | Tasa efectiva de fondos federales        | Mensual    |
| `T10Y2Y`         | Spread 10y-2y (indicador de recesión)    | Diario     |
| `DEXMXUS`        | Tipo de cambio MXN/USD                   | Diario     |

## Uso en DeepEconometrics

La herramienta `ingest_external_series` con `source: "fred"` descarga la serie
y la persiste bajo un código configurable; después puede proyectarse con
`generate_forecast` o exportarse con `generate_excel`.
