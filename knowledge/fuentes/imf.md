---
title: IMF WEO DataMapper
slug: fuente__imf
category: fuentes
source: imf
tags: [datos, api, weo, proyecciones]
---

# IMF WEO DataMapper

API pública del FMI que expone el *World Economic Outlook* (WEO).

## Acceso

- URL base: `https://www.imf.org/external/datamapper/api/v1`
- Sin API key.
- Estructura: `/{indicator}/{ISO3}`.

## Indicadores

| Código      | Descripción                          | Frecuencia |
|-------------|--------------------------------------|------------|
| `NGDPD`     | PIB nominal en USD (bn)              | Anual      |
| `NGDP_RPCH` | Crecimiento real del PIB (%)         | Anual      |
| `PCPIPCH`   | Inflación promedio (%)               | Anual      |
| `LUR`       | Tasa de desempleo (%)                | Anual      |
| `GGXCNL_NGDP` | Balance fiscal nominal (% PIB)     | Anual      |

## Ventaja

Incluye proyecciones oficiales del FMI, útiles para comparar el forecast
OLS interno con el consenso institucional.

## Uso en DeepEconometrics

`ingest_external_series` con `source: "imf"` y `params: { indicator,
countryIso3 }` sincroniza la serie, conservando tanto observado como
proyectado por el FMI.
