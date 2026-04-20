---
title: Cointegración y regresiones espurias
slug: concepto__cointegracion
category: conceptos
tags: [cointegracion, series-de-tiempo, granger]
---

# Cointegración

Relación de equilibrio de largo plazo entre variables no estacionarias cuyo
residuo sí es estacionario (Engle & Granger, 1987).

## Por qué importa

- **Regresiones espurias.** Granger & Newbold (1974) mostraron que dos series
  I(1) independientes pueden producir R² alto y t-statistics grandes, lo que
  invalida la inferencia.
- **Equilibrio económico.** Cointegración formaliza la idea de relaciones
  estables (paridad de poder de compra, ecuación de Fisher, demanda de
  dinero).

## Tests principales

- **Engle–Granger en dos etapas.** Estimar la relación de largo plazo y
  testear si el residuo es estacionario (ADF).
- **Johansen.** Test de rango para sistemas VAR; identifica cuántas relaciones
  de cointegración existen.
- **Pesaran Bounds Test.** Para modelos ARDL con mezcla I(0)/I(1).

## Uso práctico

1. Graficar las series y su diferencia; sospechar de I(1) si vagan.
2. Aplicar ADF/KPSS para confirmar orden de integración.
3. Si cointegran, estimar VECM con corrección de errores.
4. Interpretar los coeficientes como elasticidades de largo plazo.

## Mensaje al usuario

Antes de proyectar una relación entre, por ejemplo, tipo de cambio e inflación,
DeepEconometrics sugiere revisar si hay cointegración. Es la forma moderna de
hacer aquello que Samuelson señalaba: mantener coherencia entre la estática
comparada (equilibrio) y la dinámica (ajuste).
