#!/usr/bin/env node
/**
 * IndexNow — envia as URLs do sitemap para o endpoint genérico da
 * IndexNow (api.indexnow.org), que reencaminha para todos os motores
 * participantes (Bing, Yandex, Seznam, Naver — o Google não participa
 * neste protocolo, usa sempre o Search Console próprio).
 *
 * 23 Set 2026, pedido do fundador ("avança já").
 *
 * Uso: node web/scripts/indexnow-submit.mjs
 * (corre a partir da raiz do repo ou de web/; lê SITE_URL e o próprio
 * sitemap.xml em produção, por isso só funciona depois do deploy —
 * o ficheiro da chave tem de estar acessível publicamente.)
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vocationiq.app";
const INDEXNOW_KEY = "e7a9472a7f26a979837c139a32b3e39a";
const KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

async function main() {
  const sitemapRes = await fetch(`${SITE_URL}/sitemap.xml`);
  if (!sitemapRes.ok) {
    throw new Error(`Não consegui ler o sitemap (${sitemapRes.status}). O deploy já está live?`);
  }
  const xml = await sitemapRes.text();
  const urlList = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

  if (urlList.length === 0) {
    throw new Error("Sitemap sem URLs — nada para submeter.");
  }

  const host = new URL(SITE_URL).host;
  const body = { host, key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList };

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  console.log(`IndexNow: ${res.status} ${res.statusText} — ${urlList.length} URLs submetidas.`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(text);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
