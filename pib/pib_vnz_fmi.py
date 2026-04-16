"""
Consulta del PIB de Venezuela desde la API publica del FMI.

Hallazgos validados:
- El endpoint antiguo dataservices.imf.org usado con IFS no responde de forma
  confiable desde este entorno.
- La ruta publica que si responde es el DataMapper del WEO.
- `NGDPD` devuelve PIB nominal en dolares corrientes.
- `NGDP_RPCH` devuelve crecimiento real del PIB.
- La serie nominal en moneda local no aparece publicada en el DataMapper abierto,
  por lo que no se puede validar con la misma ruta publica.
"""

import requests

BASE_URL = "https://www.imf.org/external/datamapper/api/v1"
COUNTRY = "VEN"

PUBLIC_SERIES = {
    "NGDPD": {
        "title": "PIB NOMINAL DE VENEZUELA EN USD CORRIENTES",
        "unit": "miles de millones de USD",
    },
    "NGDP_RPCH": {
        "title": "CRECIMIENTO REAL DEL PIB DE VENEZUELA",
        "unit": "% anual",
    },
}


def build_datamapper_url(indicator: str, country: str = COUNTRY) -> str:
    return f"{BASE_URL}/{indicator}/{country}"


def get_gdp_series(indicator: str, country: str = COUNTRY, periods: list[int] | None = None):
    """Obtiene una serie anual publica del FMI desde DataMapper/WEO."""
    url = build_datamapper_url(indicator, country)
    params = {}
    if periods:
        params["periods"] = ",".join(str(period) for period in periods)

    print(f"Consultando: {url}")

    response = requests.get(url, params=params, timeout=60)
    response.raise_for_status()

    data = response.json()
    values = data.get("values", {}).get(indicator, {}).get(country)
    if not values:
        raise ValueError(
            f"La serie {indicator}/{country} no esta disponible en el DataMapper publico del FMI."
        )

    results = []
    for year, value in sorted(values.items(), key=lambda item: int(item[0])):
        results.append({"year": int(year), "value": float(value)})
    return results


def format_number(value_str: float) -> str:
    """Formatea un número grande de forma legible."""
    try:
        num = float(value_str)
        if num >= 1_000_000_000:
            return f"{num / 1_000_000_000:,.2f} mil millones"
        elif num >= 1_000_000:
            return f"{num / 1_000_000:,.2f} millones"
        else:
            return f"{num:,.2f}"
    except ValueError:
        return value_str


def print_series(title: str, indicator: str, unit: str, rows: list[dict]) -> None:
    print("=" * 60)
    print(title)
    print(f"Indicador: {indicator}")
    print(f"Unidad: {unit}")
    print("=" * 60)

    if not rows:
        print("No hay datos disponibles.")
        print()
        return

    print(f"{'Año':<10} {'Valor':<30}")
    print("-" * 40)
    for row in rows:
        formatted = format_number(row["value"])
        print(f"{row['year']:<10} {formatted}")
    print()


def main():
    for indicator, meta in PUBLIC_SERIES.items():
        rows = get_gdp_series(indicator)
        print_series(meta["title"], indicator, meta["unit"], rows)

    print("=" * 60)
    print("PIB NOMINAL DE VENEZUELA EN MONEDA LOCAL")
    print("Indicador intentado: NGDP")
    print("=" * 60)
    try:
        rows = get_gdp_series("NGDP")
        print_series(
            "PIB NOMINAL DE VENEZUELA EN MONEDA LOCAL",
            "NGDP",
            "miles de millones de moneda nacional",
            rows,
        )
    except Exception as exc:
        print("Resultado: la serie no esta disponible en el DataMapper publico del FMI.")
        print(f"Detalle tecnico: {type(exc).__name__}: {exc}")
        print(
            "Conclusion: este codigo si sirve para consultar USD corrientes y crecimiento real, "
            "pero no valida PIB nominal en Bs con la API publica abierta del FMI."
        )


if __name__ == "__main__":
    main()