---
title: Técnicas de forecasting económico
slug: concepto__forecasting
category: conceptos
tags: [forecasting, series-de-tiempo, econometria]
---

# Forecasting económico

Producir proyecciones cuantificadas de variables macro y financieras, con una
medida de incertidumbre asociada.

## Familias de modelos

- **Estadísticos clásicos.** Suavizamiento exponencial, ARIMA/SARIMA,
  regresión OLS sobre tendencia y calendario.
- **Series multivariadas.** VAR, VECM, modelos de factores.
- **Bayesianos.** BVAR, modelos jerárquicos con *shrinkage* para datos cortos.
- **Aprendizaje automático.** Gradient boosting, redes neuronales (LSTM,
  Transformers), modelos con features macro y alternativas.
- **DSGE y estructurales.** Útiles para simular políticas, no siempre ganan
  en precisión pura.

## Buenas prácticas

1. **Diagnóstico de estacionariedad.** ADF, KPSS; diferenciar si hace falta.
2. **Evitar regresiones espurias** (Granger & Newbold, 1974): considerar
   cointegración.
3. **Validación.** *Backtesting* con ventanas expansibles y métricas
   MAE/MAPE/RMSE; test de Diebold–Mariano al comparar modelos.
4. **Intervalos de confianza.** Reportar no solo el punto central sino la
   dispersión.
5. **Diagnóstico de residuos.** Prueba Ljung–Box, ARCH-LM para heterocedasticidad.
6. **Rompimientos estructurales.** Chow, Bai–Perron; revisar antes de asumir
   coeficientes estables.

## Forecasting y DeepEconometrics

El backend usa una regresión OLS simple como baseline rápido (`generate_forecast`).
Para tendencias cortas y estables es suficiente; cuando la serie muestra
heterocedasticidad, estacionalidad marcada o quiebres, señálalo al usuario y
sugiere ampliar a ARIMA/VAR y validar fuera de muestra.
