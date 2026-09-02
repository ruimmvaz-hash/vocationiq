// Geocodificação para o cálculo da carta a partir do "Local de nascimento"
// do formulário (formato livre "Cidade, País"). Portado do
// naveya/web/src/lib/report/reportGeo.ts — mesma lógica, sem alterações:
// o formulário do VocationIQ usa exactamente o mesmo formato de campo.
//
// Bug real encontrado nesse ficheiro (documentado lá, preservado aqui): o
// Open-Meteo devolve o NOME LOCAL no idioma pedido (language=pt ->
// "Lisboa", language=en -> "Lisbon" — registos DIFERENTES na base, não
// traduções do mesmo registo). Pedir só language=en e procurar "Lisboa"
// devolve zero resultados. Corrigido com language=pt primeiro (o
// formulário é em português), fallback language=en; contagem alta (10)
// e filtro pelo país indicado após a vírgula, quando existe.

export interface CityGeocode {
  latitude: number;
  longitude: number;
  timezone: string;
  resolvedName: string;
}

interface OpenMeteoResult {
  latitude: number;
  longitude: number;
  timezone: string;
  name: string;
  admin1?: string;
  country?: string;
}

async function searchOpenMeteo(name: string, language: "pt" | "en"): Promise<OpenMeteoResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=${language}&format=json`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: OpenMeteoResult[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

/** "Lisboa, Portugal" -> { city: "Lisboa", country: "Portugal" }. Sem vírgula, country fica undefined. */
function splitCityCountry(input: string): { city: string; country?: string } {
  const [city, ...rest] = input.split(",").map((s) => s.trim());
  const country = rest.join(", ").trim();
  return { city, country: country || undefined };
}

export async function geocodeCityCountry(input: string): Promise<CityGeocode | null> {
  const { city, country } = splitCityCountry(input);

  let results = await searchOpenMeteo(city, "pt");
  if (results.length === 0) results = await searchOpenMeteo(city, "en");
  if (results.length === 0) return null;

  const match = country ? results.find((r) => r.country?.toLowerCase().includes(country.toLowerCase()) || country.toLowerCase().includes((r.country ?? "").toLowerCase())) : undefined;
  const chosen = match ?? results[0];

  return {
    latitude: chosen.latitude,
    longitude: chosen.longitude,
    timezone: chosen.timezone,
    resolvedName: [chosen.name, chosen.admin1, chosen.country].filter(Boolean).join(", "),
  };
}
