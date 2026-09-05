import type { DadosTecnicosArmazenados } from "@/lib/storage";
import { computeRodaDaVida, corRodaDaVida, PLANETA_PT } from "@/lib/relatorioTemplate";

const ESTADO_PT: Record<string, string> = {
  Exalted: "exaltado",
  Own: "próprio",
  Moolatrikona: "próprio (Moolatrikona)",
  Friend: "amigo",
  Neutral: "neutro",
  Enemy: "inimigo",
  Debilitated: "debilitado",
};

const MODO_GANHO_ROTULO: Record<number, string> = {
  2: "ganha pela voz — consultoria, ensino, comunicação directa do que sabe",
  6: "ganha por resolver o problema de outra pessoa — cura, crise, serviço, análise",
  10: "ganha por assumir a cara pública de uma coisa — liderança, execução, empreendedorismo visível",
};

function classificarForca(peso: number): { label: string; classe: string } {
  if (peso >= 1.3) return { label: "forte", classe: "bg-emerald-100 text-emerald-800" };
  if (peso >= 0.9) return { label: "média", classe: "bg-amber/20 text-amber-dark" };
  return { label: "fraca", classe: "bg-red-100 text-red-700" };
}

function formatarDataPT(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", { year: "numeric", month: "long" }).format(new Date(iso));
}

interface Tensao {
  tensao: string;
  dados: string;
  impacto: string;
}

/**
 * Regras de detecção automática pedidas — 3 são literais (Mercúrio fraco
 * + modo de ganho casa 2; Ketu Mahadasha; Karakamsha casa 4 + Modo de
 * Ganho casa 10 como proxy de "ambição corporativa", já que o formulário
 * não tem esse campo). A regra 2 ("área actual de estética/beleza/arte")
 * não veio com uma lista de palavras-chave — uso uma lista conservadora
 * óbvia, assinalada aqui. A regra 5 ("planeta cujo tema seja central na
 * tese") também não veio com uma fórmula — interpretada como o
 * Atmakaraka (a "vontade mais forte", Eixo da Missão) e o regente do
 * Modo de Ganho dominante, os dois únicos pontos que o próprio motor já
 * trata como "centrais" nesta carta.
 */
function detectarTensoes(dt: DadosTecnicosArmazenados, areaActual: string): Tensao[] {
  const tensoes: Tensao[] = [];
  const pesoDe = (planeta: string) => dt.pesos.find((p) => p.planeta === planeta)?.peso;
  const dominante = dt.axes.earningMode;

  const mercurio = pesoDe("Mercury");
  if (mercurio !== undefined && mercurio < 0.9 && dominante.house === 2) {
    tensoes.push({
      tensao: "Comunicação — tese pela voz, canal fraco",
      dados: `Mercúrio peso ${mercurio.toFixed(2)} · Modo de Ganho dominante = casa 2`,
      impacto: "O texto tem de nomear que o canal de comunicação em si é o elo mais fraco, mesmo sustentando a tese pela voz.",
    });
  }

  const venus = pesoDe("Venus");
  // DESVIO — lista de palavras-chave não veio especificada; conservadora, case-insensitive.
  const areaEstetica = /est[ée]tic|beleza|art[ei]|design|moda|cosm[ée]tic/i.test(areaActual);
  if (venus !== undefined && venus < 0.9 && areaEstetica) {
    tensoes.push({
      tensao: "Área actual com suporte fraco",
      dados: `Vénus peso ${venus.toFixed(2)} · Área actual: "${areaActual}"`,
      impacto: "A área actual pode ter pouco suporte estrutural — o relatório deve tratá-la com cautela, não como activo forte.",
    });
  }

  if (dt.datas.mahadashaAtual.senhor === "Ketu") {
    tensoes.push({
      tensao: "Período de dissolução",
      dados: `Mahadasha actual: Ketu (${formatarDataPT(dt.datas.mahadashaAtual.inicio)} a ${formatarDataPT(dt.datas.mahadashaAtual.fim)})`,
      impacto: "O período actual pede fecho/dissolução antes de expansão — o plano deve reflectir isso, não uma acção agressiva imediata.",
    });
  }

  if (dt.axes.missionAxis.karakamshaHouse === 4 && dominante.house === 10) {
    tensoes.push({
      tensao: "Missão aponta para base, não estrutura",
      dados: `Karakamsha na casa 4 · Modo de Ganho dominante = casa 10 (${MODO_GANHO_ROTULO[10]})`,
      impacto: "Pode haver tensão entre a missão (estabilidade de base) e a ambição de cargo/execução pública — nomear, não escolher só um lado.",
    });
  }

  const atmakaraka = dt.axes.missionAxis.atmakaraka;
  const pesoAtmakaraka = pesoDe(atmakaraka);
  if (pesoAtmakaraka !== undefined && pesoAtmakaraka < 0.9) {
    tensoes.push({
      tensao: "Atmakaraka (dado central da tese) com suporte fraco",
      dados: `${PLANETA_PT[atmakaraka] ?? atmakaraka} (Atmakaraka) peso ${pesoAtmakaraka.toFixed(2)}`,
      impacto: "A tese central deve ser apresentada com essa fragilidade nomeada explicitamente, não com a mesma confiança de um dado forte.",
    });
  }
  const pesoRegenteDominante = pesoDe(dominante.lord);
  if (pesoRegenteDominante !== undefined && pesoRegenteDominante < 0.9 && dominante.lord !== atmakaraka) {
    tensoes.push({
      tensao: "Regente do Modo de Ganho dominante com suporte fraco",
      dados: `${PLANETA_PT[dominante.lord] ?? dominante.lord} (regente da casa ${dominante.house}) peso ${pesoRegenteDominante.toFixed(2)}`,
      impacto: "O modo de ganho dominante assenta num regente fraco — a tese deve ser apresentada com essa fragilidade nomeada.",
    });
  }

  return tensoes;
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 first:mt-0">
      <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{titulo}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function MapaTecnico({ dadosTecnicos, areaActual }: { dadosTecnicos: DadosTecnicosArmazenados | null; areaActual: string }) {
  if (!dadosTecnicos) {
    return <p className="text-sm text-ink/60">Ainda sem dados técnicos guardados para este relatório — gera (ou regenera) o rascunho para os calcular.</p>;
  }

  const { axes, pesos, datas, savPorCasa } = dadosTecnicos;
  const pesosOrdenados = [...pesos].sort((a, b) => b.peso - a.peso);
  const tensoes = detectarTensoes(dadosTecnicos, areaActual);
  const rodaDaVida = computeRodaDaVida(savPorCasa);
  const m = axes.missionAxis;
  const casa11 = axes.marketShowcase.house11FromAL;

  return (
    <div>
      <Bloco titulo="2A · Carta completa">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-fog text-left text-xs font-semibold uppercase tracking-wide text-ink/60">
                <th className="px-3 py-2">Planeta</th>
                <th className="px-3 py-2">Casa</th>
                <th className="px-3 py-2">Signo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">SAV</th>
                <th className="px-3 py-2">Peso</th>
                <th className="px-3 py-2">Força</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pesosOrdenados.map((p) => {
                const forca = classificarForca(p.peso);
                return (
                  <tr key={p.planeta}>
                    <td className="px-3 py-2 font-semibold text-navy">{PLANETA_PT[p.planeta] ?? p.planeta}</td>
                    <td className="px-3 py-2 tabular-nums">{p.casa}</td>
                    <td className="px-3 py-2">{p.signo}</td>
                    <td className="px-3 py-2">{ESTADO_PT[p.estado] ?? p.estado}</td>
                    <td className="px-3 py-2 tabular-nums">{p.savCasa}</td>
                    <td className="px-3 py-2 tabular-nums">{p.peso.toFixed(3)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${forca.classe}`}>{forca.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Bloco>

      <Bloco titulo="2B · Eixo da Missão">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-semibold text-navy">Atmakaraka (vontade/missão mais forte)</dt>
            <dd className="text-ink/80">
              {PLANETA_PT[m.atmakaraka] ?? m.atmakaraka}, na casa {m.akHouse}, em {m.akSign}, estado {ESTADO_PT[m.akDignity ?? "Neutral"] ?? m.akDignity}.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-navy">Karakamsha (onde a missão aterra na prática)</dt>
            <dd className="text-ink/80">
              Signo {m.karakamshaSign}, casa {m.karakamshaHouse} a partir do Ascendente.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-navy">Amatyakaraka (ferramenta de trabalho do dia a dia)</dt>
            <dd className="text-ink/80">{PLANETA_PT[axes.amatyakaraka] ?? axes.amatyakaraka}</dd>
          </div>
        </dl>
      </Bloco>

      <Bloco titulo="2C · Modo de Ganho">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-semibold text-navy">Casa dominante</dt>
            <dd className="text-ink/80">
              Casa {axes.earningMode.house} — {MODO_GANHO_ROTULO[axes.earningMode.house]} — pontuação {axes.earningMode.score}.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-navy">O que contribuiu para a pontuação</dt>
            <dd className="text-ink/80">{axes.earningMode.signals.length ? axes.earningMode.signals.join("; ") : "nenhum sinal directo — só a dignidade base do regente."}</dd>
          </div>
          <div>
            <dt className="font-semibold text-navy">Comparação das 3 casas (2 / 6 / 10)</dt>
            <dd className="text-ink/80">{axes.earningModeAll.map((e) => `casa ${e.house} (pontuação ${e.score})`).join(" · ")}</dd>
          </div>
        </dl>
      </Bloco>

      <Bloco titulo="2D · Montra de Mercado">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-semibold text-navy">Como é vista de fora (Arudha Lagna)</dt>
            <dd className="text-ink/80">
              Signo {axes.marketShowcase.arudhaLagnaSign}, casa {axes.marketShowcase.arudhaLagnaHouseFromAscendant} a partir do Ascendente.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-navy">O que o mercado reconhece e paga (casa 11 a partir da Arudha Lagna)</dt>
            <dd className="text-ink/80">
              Signo {casa11.sign}, regente {PLANETA_PT[casa11.lord] ?? casa11.lord}
              {casa11.planets.length ? `, com ${casa11.planets.map((p) => PLANETA_PT[p] ?? p).join(" e ")} presente(s)` : ""}.
            </dd>
          </div>
        </dl>
      </Bloco>

      <Bloco titulo="2E · Período actual">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-semibold text-navy">Mahadasha actual</dt>
            <dd className="text-ink/80">
              {PLANETA_PT[datas.mahadashaAtual.senhor] ?? datas.mahadashaAtual.senhor}, de {formatarDataPT(datas.mahadashaAtual.inicio)} a {formatarDataPT(datas.mahadashaAtual.fim)}.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-navy">Antardasha actual (o que está activo agora)</dt>
            <dd className="text-ink/80">
              {PLANETA_PT[datas.antardashaAtual.senhor] ?? datas.antardashaAtual.senhor}, de {formatarDataPT(datas.antardashaAtual.inicio)} a {formatarDataPT(datas.antardashaAtual.fim)}.
            </dd>
          </div>
          {datas.proximasAntardashas.length > 0 && (
            <div>
              <dt className="font-semibold text-navy">Próximas antardashas</dt>
              <dd className="text-ink/80">
                {datas.proximasAntardashas.map((a) => `${PLANETA_PT[a.senhor] ?? a.senhor} (${formatarDataPT(a.inicio)} a ${formatarDataPT(a.fim)})`).join("; ")}
              </dd>
            </div>
          )}
        </dl>
      </Bloco>

      <Bloco titulo="2F · Tensões identificadas">
        {tensoes.length === 0 ? (
          <p className="text-sm text-ink/60">Nenhuma das regras automáticas disparou para esta carta.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-fog text-left text-xs font-semibold uppercase tracking-wide text-ink/60">
                  <th className="px-3 py-2">Tensão</th>
                  <th className="px-3 py-2">Dados que a sustentam</th>
                  <th className="px-3 py-2">Impacto no relatório</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tensoes.map((t, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-semibold text-navy">{t.tensao}</td>
                    <td className="px-3 py-2 text-ink/80">{t.dados}</td>
                    <td className="px-3 py-2 text-ink/80">{t.impacto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Bloco>

      <Bloco titulo="2G · Roda da Vida — valores">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-fog text-left text-xs font-semibold uppercase tracking-wide text-ink/60">
                <th className="px-3 py-2">Dimensão</th>
                <th className="px-3 py-2">Valor</th>
                <th className="px-3 py-2">Interpretação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rodaDaVida.map((d) => (
                <tr key={d.nome}>
                  <td className="px-3 py-2 font-semibold text-navy">{d.nome}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: corRodaDaVida(d.valor) }}>
                    {d.valor.toFixed(1)}/10
                  </td>
                  <td className="px-3 py-2 text-ink/80">{d.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloco>
    </div>
  );
}
