CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS indicadores (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  unidad TEXT NOT NULL,
  frecuencia TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  pais TEXT,
  fuente TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS series_tiempo (
  id BIGSERIAL PRIMARY KEY,
  indicador_id INTEGER NOT NULL REFERENCES indicadores(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  valor NUMERIC(18,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (indicador_id, fecha)
);

CREATE TABLE IF NOT EXISTS sesiones (
  session_id TEXT PRIMARY KEY,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS archivos_generados (
  id UUID PRIMARY KEY,
  session_id TEXT REFERENCES sesiones(session_id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  ruta_archivo TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO indicadores (codigo, nombre, unidad, frecuencia, descripcion)
VALUES
  ('IPC', 'Indice de Precios al Consumidor', 'indice', 'mensual', 'Serie proxy para inflacion observada.'),
  ('PIB', 'Producto Interno Bruto', 'millones_bs_constantes', 'anual', 'PIB real de Venezuela en millones de bolivares a precios constantes de 1997. Serie BCV observada 1997-2018 y proyeccion basada en indice externo 2019-2025.'),
  ('PIB_NOMINAL_USD', 'PIB Nominal USD', 'miles_millones_usd', 'anual', 'PIB nominal de Venezuela en miles de millones de dolares. Fuente FMI WEO DataMapper.'),
  ('PIB_CRECIMIENTO', 'Crecimiento Real PIB', 'porcentaje', 'anual', 'Tasa de crecimiento real anual del PIB de Venezuela. Fuente FMI WEO DataMapper.'),
  ('TASA_REF', 'Tasa de Referencia', 'porcentaje', 'mensual', 'Tasa de politica monetaria.'),
  ('DESEMPLEO', 'Tasa de Desempleo', 'porcentaje', 'mensual', 'Participacion de poblacion desempleada.'),
  ('TIPO_CAMBIO', 'Tipo de Cambio', 'pesos por dolar', 'mensual', 'Serie proxy del tipo de cambio nominal.')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- PIB Real Venezuela (BCV observado 1997-2018, proyectado 2019-2025)
-- Fuente: BCV precios constantes 1997 + proyeccion base 2012
-- ============================================================
INSERT INTO series_tiempo (indicador_id, fecha, valor)
SELECT i.id, v.fecha, v.valor
FROM indicadores i,
(VALUES
  ('1997-01-01'::date, 419431.5140),
  ('1998-01-01', 420664.8700),
  ('1999-01-01', 395549.2500),
  ('2000-01-01', 410132.9300),
  ('2001-01-01', 424053.8100),
  ('2002-01-01', 386501.1000),
  ('2003-01-01', 356526.7800),
  ('2004-01-01', 421723.4300),
  ('2005-01-01', 465236.3600),
  ('2006-01-01', 511165.7700),
  ('2007-01-01', 555910.5900),
  ('2008-01-01', 585250.7400),
  ('2009-01-01', 566509.2400),
  ('2010-01-01', 558075.1000),
  ('2011-01-01', 581382.6900),
  ('2012-01-01', 614091.0300),
  ('2013-01-01', 622338.8500),
  ('2014-01-01', 598102.5700),
  ('2015-01-01', 560892.3900),
  ('2016-01-01', 465314.4500),
  ('2017-01-01', 392393.1200),
  ('2018-01-01', 315399.8900),
  ('2019-01-01', 229055.9500),
  ('2020-01-01', 152908.6700),
  ('2021-01-01', 154750.9400),
  ('2022-01-01', 177472.3100),
  ('2023-01-01', 185455.4900),
  ('2024-01-01', 202035.9500),
  ('2025-01-01', 219230.5000)
) AS v(fecha, valor)
WHERE i.codigo = 'PIB'
ON CONFLICT (indicador_id, fecha) DO NOTHING;

-- ============================================================
-- PIB Nominal USD Venezuela (FMI WEO DataMapper 1980-2029)
-- ============================================================
INSERT INTO series_tiempo (indicador_id, fecha, valor)
SELECT i.id, v.fecha, v.valor
FROM indicadores i,
(VALUES
  ('1980-01-01'::date, 69.8410),
  ('1981-01-01', 78.3670),
  ('1982-01-01', 79.9980),
  ('1983-01-01', 79.6720),
  ('1984-01-01', 57.8260),
  ('1985-01-01', 59.8650),
  ('1986-01-01', 60.8770),
  ('1987-01-01', 46.8540),
  ('1988-01-01', 60.3780),
  ('1989-01-01', 44.6720),
  ('1990-01-01', 48.3910),
  ('1991-01-01', 53.3820),
  ('1992-01-01', 60.4000),
  ('1993-01-01', 59.8650),
  ('1994-01-01', 58.2740),
  ('1995-01-01', 77.3860),
  ('1996-01-01', 70.5400),
  ('1997-01-01', 85.5870),
  ('1998-01-01', 91.3390),
  ('1999-01-01', 97.9740),
  ('2000-01-01', 117.1480),
  ('2001-01-01', 122.9100),
  ('2002-01-01', 92.8890),
  ('2003-01-01', 83.5290),
  ('2004-01-01', 112.4520),
  ('2005-01-01', 145.5130),
  ('2006-01-01', 183.4780),
  ('2007-01-01', 230.3640),
  ('2008-01-01', 315.6010),
  ('2009-01-01', 259.9020),
  ('2010-01-01', 239.6220),
  ('2011-01-01', 316.4820),
  ('2012-01-01', 381.2860),
  ('2013-01-01', 371.0090),
  ('2014-01-01', 482.3590),
  ('2015-01-01', 343.4770),
  ('2016-01-01', 279.3040),
  ('2017-01-01', 143.7340),
  ('2018-01-01', 98.4680),
  ('2019-01-01', 64.0570),
  ('2020-01-01', 47.2620),
  ('2021-01-01', 41.5970),
  ('2022-01-01', 97.6530),
  ('2023-01-01', 108.0000),
  ('2024-01-01', 112.0000),
  ('2025-01-01', 117.0000)
) AS v(fecha, valor)
WHERE i.codigo = 'PIB_NOMINAL_USD'
ON CONFLICT (indicador_id, fecha) DO NOTHING;

-- ============================================================
-- Crecimiento Real PIB Venezuela (FMI WEO DataMapper)
-- ============================================================
INSERT INTO series_tiempo (indicador_id, fecha, valor)
SELECT i.id, v.fecha, v.valor
FROM indicadores i,
(VALUES
  ('1980-01-01'::date, -4.9000),
  ('1981-01-01', -1.3000),
  ('1982-01-01', 2.6000),
  ('1983-01-01', -9.9000),
  ('1984-01-01', 5.2000),
  ('1985-01-01', 0.9000),
  ('1986-01-01', 6.1000),
  ('1987-01-01', 4.8000),
  ('1988-01-01', 6.5000),
  ('1989-01-01', -13.9000),
  ('1990-01-01', 6.5000),
  ('1991-01-01', 9.7000),
  ('1992-01-01', 6.1000),
  ('1993-01-01', 0.3000),
  ('1994-01-01', -2.3000),
  ('1995-01-01', 4.0000),
  ('1996-01-01', -0.2000),
  ('1997-01-01', 6.4000),
  ('1998-01-01', 0.3000),
  ('1999-01-01', -6.0000),
  ('2000-01-01', 3.7000),
  ('2001-01-01', 3.4000),
  ('2002-01-01', -8.9000),
  ('2003-01-01', -7.8000),
  ('2004-01-01', 18.3000),
  ('2005-01-01', 10.3000),
  ('2006-01-01', 9.9000),
  ('2007-01-01', 8.8000),
  ('2008-01-01', 5.3000),
  ('2009-01-01', -3.2000),
  ('2010-01-01', -1.5000),
  ('2011-01-01', 4.2000),
  ('2012-01-01', 5.6000),
  ('2013-01-01', 1.3000),
  ('2014-01-01', -3.9000),
  ('2015-01-01', -6.2000),
  ('2016-01-01', -17.0000),
  ('2017-01-01', -15.7000),
  ('2018-01-01', -19.6000),
  ('2019-01-01', -27.4000),
  ('2020-01-01', -30.0000),
  ('2021-01-01', 0.5000),
  ('2022-01-01', 12.0000),
  ('2023-01-01', 4.0000),
  ('2024-01-01', 4.2000),
  ('2025-01-01', 4.5000)
) AS v(fecha, valor)
WHERE i.codigo = 'PIB_CRECIMIENTO'
ON CONFLICT (indicador_id, fecha) DO NOTHING;

-- ============================================================
-- Synthetic series for remaining indicators (IPC, TASA_REF, DESEMPLEO, TIPO_CAMBIO)
-- ============================================================
WITH months AS (
  SELECT generate_series('2022-01-01'::date, '2025-12-01'::date, interval '1 month')::date AS fecha
), series_seed AS (
  SELECT
    i.id AS indicador_id,
    i.codigo,
    m.fecha,
    ((EXTRACT(YEAR FROM m.fecha) - 2022) * 12 + EXTRACT(MONTH FROM m.fecha) - 1) AS idx
  FROM indicadores i
  CROSS JOIN months m
  WHERE i.codigo IN ('IPC', 'TASA_REF', 'DESEMPLEO', 'TIPO_CAMBIO')
)
INSERT INTO series_tiempo (indicador_id, fecha, valor)
SELECT
  indicador_id,
  fecha,
  CASE codigo
    WHEN 'IPC' THEN ROUND((101.8 + idx * 0.35 + CASE WHEN EXTRACT(MONTH FROM fecha) IN (6,7,8) THEN 0.4 ELSE 0 END)::numeric, 4)
    WHEN 'TASA_REF' THEN ROUND((8.5 - idx * 0.045 + CASE WHEN idx > 28 THEN 0.25 ELSE 0 END)::numeric, 4)
    WHEN 'DESEMPLEO' THEN ROUND((8.4 - idx * 0.05 + CASE WHEN EXTRACT(MONTH FROM fecha) IN (1,2) THEN 0.28 ELSE 0 END)::numeric, 4)
    WHEN 'TIPO_CAMBIO' THEN ROUND((17.2 + sin((idx + 1) / 2.8) * 0.7 + idx * 0.015)::numeric, 4)
  END AS valor
FROM series_seed
ON CONFLICT (indicador_id, fecha) DO NOTHING;