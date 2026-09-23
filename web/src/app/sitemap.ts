import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vocationiq.app";

/**
 * SEO (22 Set, pedido do fundador) — páginas de conteúdo criadas para
 * pesquisa orgânica (ver task "Páginas de conteúdo SEO"). Cada slug novo
 * criado em web/src/app/aprender/<slug>/page.tsx tem de ser adicionado
 * aqui manualmente — o Next.js não descobre rotas de conteúdo sozinho.
 */
const PAGINAS_CONTEUDO: string[] = [
  "teste-vocacional-online",
  "que-curso-escolher-depois-do-12-ano",
  "orientacao-vocacional-adolescentes",
  "mudar-de-carreira-aos-30-40-anos",
  "mapa-astral-e-escolha-de-carreira",
  "saidas-profissionais-cada-curso-secundario",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();

  const paginasPrincipais: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: agora, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/exemplo`, lastModified: agora, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/intake`, lastModified: agora, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/legal/privacy`, lastModified: agora, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/legal/terms`, lastModified: agora, changeFrequency: "yearly", priority: 0.2 },
  ];

  const paginasConteudo: MetadataRoute.Sitemap = PAGINAS_CONTEUDO.map((slug) => ({
    url: `${SITE_URL}/aprender/${slug}`,
    lastModified: agora,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...paginasPrincipais, ...paginasConteudo];
}
