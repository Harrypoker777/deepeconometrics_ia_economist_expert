---
title: World Bank Open Data
slug: fuente__worldbank
category: fuentes
source: worldbank
tags: [datos, api, indicadores, desarrollo]
---

# World Bank Open Data

API pública del Banco Mundial con miles de indicadores WDI.

## Acceso

- URL base: `https://api.worldbank.org/v2`.
- Formato: JSON con `?format=json`.
- Sin API key.

## Indicadores populares

| Código WDI            | Descripción                             | Frecuencia |
|-----------------------|-----------------------------------------|------------|
| `NY.GDP.MKTP.CD`      | PIB en USD corrientes                   | Anual      |
| `NY.GDP.MKTP.KD.ZG`   | Crecimiento real del PIB (%)            | Anual      |
| `FP.CPI.TOTL.ZG`      | Inflación IPC (%)                       | Anual      |
| `SL.UEM.TOTL.ZS`      | Desempleo total (% de fuerza laboral)   | Anual      |
| `NE.EXP.GNFS.ZS`      | Exportaciones (% del PIB)               | Anual      |
| `PA.NUS.FCRF`         | Tipo de cambio oficial promedio anual    | Anual      |

## Códigos país

Usar ISO-3 o el multi-código `all`.
- `VEN` Venezuela, `COL` Colombia, `ARG` Argentina, `BRA` Brasil, `USA`, etc.

## Uso en DeepEconometrics

`ingest_external_series` con `source: "worldbank"` y `params: { country,
indicator }` poblará la tabla `series_tiempo` con la serie anual requerida.
