import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { obterIntake, type IntakeRow } from "@/lib/store";
import { obterRascunho, obterRelatorioMaisRecente, listarEnvios } from "@/lib/storage";
import {
  SITUACOES,
  CLAREZA_IDEIA,
  AREAS_CONSIDERADAS,
  SATISFACAO_CURSO,
  ANOS_EXPERIENCIA,
  TIPO_MUDANCA,
  AREAS_DESTINO,
  CATEGORIAS_AREAS_DESTINO,
} from "@/lib/validation";
import { AdminNav } from "@/components/admin/AdminNav";
import { MarcarEntregueButton } from "./MarcarEntregueButton";
import { RascunhoRelatorio } from "./RascunhoRelatorio";
import { RelatorioEntregue } from "./RelatorioEntregue";

export const dynamic = "force-dynamic";

const SITUACAO_LABEL = Object.fromEntries(SITUACOES.map((s) => [s.valor, s.label]));
const CLAREZA_LABEL = Object.fromEntries(CLAREZA_IDEIA.map((c) => [c.valor, c.label]));
const AREA_LABEL = Object.fromEntries(AREAS_CONSIDERADAS.map((a) => [a.valor, a.label]));
const SATISFACAO_LABEL = Object.fromEntries(SATISFACAO_CURSO.map((s) => [s.valor, s.label]));
const ANOS_LABEL = Object.fromEntries(ANOS_EXPERIENCIA.map((a) => [a.valor, a.label]));
const TIPO_MUDANCA_LABEL = Object.fromEntries(TIPO_MUDANCA.map((t) => [t.valor, t.label]));
const AREA_DESTINO_LABEL = Object.fromEntries(AREAS_DESTINO.map((a) => [a.valor, a.label]));
const AREA_DESTINO_CATEGORIA = Object.fromEntries(AREAS_DESTINO.map((a) => [a.valor, a.categoria]));

function formatarDataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function formatarValor(cents: number | null): string {
  return `€${((cents ?? 9900) / 100).toFixed(2)}`;
}

export default async function AdminIntakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const { id } = await params;

  let intake: Awaited<ReturnType<typeof obterIntake>> = null;
  let erro: string | null = null;
  try {
    intake = await obterIntake(id);
  } catch (err) {
    erro = err instanceof Error ? err.message : String(err);
  }

  if (erro) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <AdminNav active="relatorios" />
        <Link href="/admin/relatorios" className="text-sm font-semibold text-navy hover:underline">
          ← Todos os pedidos
        </Link>
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não consegui carregar este pedido: {erro}</p>
      </main>
    );
  }
  if (!intake) notFound();

  // Motor de geração (VOCATIONIQ-ADULTO-metodologia.md) só cobre o ramo
  // "trabalho-quero-mudar" — noutras situações não faz sentido mostrar o
  // bloco de rascunho.
  const mostrarRascunho = intake.situacao === "trabalho-quero-mudar" && intake.report_status !== "delivered";
  const rascunho = mostrarRascunho ? await obterRascunho(intake.id).catch(() => null) : null;

  // Depois da entrega: painel "sempre visível" (Ver HTML/PDF/Word,
  // rascunho em modo leitura, reenviar, histórico) em vez do botão só de
  // estado — ver RelatorioEntregue.tsx.
  const relatorioEntregue = intake.report_status === "delivered" ? await obterRelatorioMaisRecente(intake.id).catch(() => null) : null;
  const envios = relatorioEntregue ? await listarEnvios(relatorioEntregue.id).catch(() => []) : [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <AdminNav active="relatorios" />
      <Link href="/admin/relatorios" className="text-sm font-semibold text-navy hover:underline">
        ← Todos os pedidos
      </Link>

      {/* O QUE O CLIENTE PEDIU — em destaque, fundo diferenciado, no topo */}
      <div className="mt-4 rounded-lg border-l-4 border-amber bg-navy px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-wide text-amber">O que o cliente pediu</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">{intake.nome}</h1>
        <p className="mt-1 text-sm text-white/70">{SITUACAO_LABEL[intake.situacao] ?? intake.situacao}</p>
      </div>

      <Seccao titulo="Dados de nascimento">
        <Campo label="Nome completo" valor={intake.nome} />
        <Campo label="Data de nascimento" valor={intake.data_nascimento} />
        <Campo label="Hora de nascimento" valor={intake.hora_nascimento ?? "não fornecida"} />
        <Campo label="Local de nascimento" valor={intake.local_nascimento} />
      </Seccao>

      <RespostasSituacao intake={intake} />

      {intake.ideia_concreta?.trim() && (
        <section className="mt-6 rounded-lg border-2 border-amber/50 bg-amber/10 p-5">
          <p className="text-sm font-bold text-navy">Ideia concreta</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{intake.ideia_concreta}</p>
        </section>
      )}

      {intake.contexto_adicional?.trim() && (
        <section className="mt-6 rounded-lg border-2 border-amber/50 bg-amber/10 p-5">
          <p className="text-sm font-bold text-navy">O que te trouxe aqui</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{intake.contexto_adicional}</p>
        </section>
      )}

      {intake.pergunta_especifica?.trim() && (
        <section className="mt-6 rounded-lg border-2 border-navy bg-navy/5 p-5">
          <p className="text-sm font-bold text-navy">Pergunta específica — é o que o relatório tem de responder</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{intake.pergunta_especifica}</p>
        </section>
      )}

      <Seccao titulo="Dados do pagamento">
        <Campo label="Email" valor={intake.email ?? "—"} />
        <Campo label="Valor pago" valor={formatarValor(intake.amount_cents)} />
        <Campo label="Data e hora do pagamento" valor={formatarDataHora(intake.paid_at)} />
        <Campo label="ID da transacção Stripe" valor={intake.stripe_checkout_session_id ?? "—"} monoespaco />
      </Seccao>

      <Seccao titulo="Estado">
        <Campo label="Estado" valor={intake.report_status === "delivered" ? "Entregue" : "Pendente"} />
        {intake.report_status === "delivered" && <Campo label="Data de entrega" valor={formatarDataHora(intake.delivered_at)} />}
      </Seccao>

      {mostrarRascunho && <RascunhoRelatorio intakeId={intake.id} rascunhoInicial={rascunho?.texto ?? null} criadoEmInicial={rascunho?.criadoEm ?? null} emailAtual={intake.email} />}

      {intake.report_status === "delivered" ? (
        <RelatorioEntregue
          intakeId={intake.id}
          emailAtual={intake.email}
          temHtml={intake.situacao === "trabalho-quero-mudar" && Boolean(relatorioEntregue?.rascunhoTexto)}
          rascunhoTexto={relatorioEntregue?.rascunhoTexto ?? null}
          criadoEm={relatorioEntregue?.criadoEm ?? null}
          enviadoEm={relatorioEntregue?.enviadoEm ?? null}
          envios={envios}
        />
      ) : (
        // Quando há bloco de rascunho, "Aprovar e enviar" já vem embutido nele — só um botão de entrega no ecrã.
        !(mostrarRascunho && rascunho?.texto) && (
          <div className="mt-6 flex flex-wrap items-start gap-4">
            <MarcarEntregueButton intakeId={intake.id} jaEntregue={false} emailAtual={intake.email} />
          </div>
        )
      )}
    </main>
  );
}

/** Só mostra os campos relevantes para a situação declarada — nunca os das outras 4. */
function RespostasSituacao({ intake }: { intake: IntakeRow }) {
  if (intake.situacao === "9-ou-menos" || intake.situacao === "10-11-12") {
    return (
      <Seccao titulo="Situação declarada">
        <Campo label="Opção escolhida" valor={SITUACAO_LABEL[intake.situacao] ?? intake.situacao} />
        <Campo label="Já tem ideia do que quer seguir?" valor={(intake.clareza_ideia && CLAREZA_LABEL[intake.clareza_ideia]) ?? "—"} />
        {intake.areas_consideradas && intake.areas_consideradas.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-ink/60">Áreas consideradas</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {intake.areas_consideradas.map((a) => (
                <span key={a} className="rounded-full bg-navy px-2.5 py-1 text-xs font-semibold text-white">
                  {AREA_LABEL[a] ?? a}
                </span>
              ))}
            </div>
            {intake.areas_consideradas_outra?.trim() && <p className="mt-2 text-sm text-navy">Outra: {intake.areas_consideradas_outra}</p>}
          </div>
        )}
        {intake.preferencia_familia?.trim() && <Campo label="Preferência da família" valor={intake.preferencia_familia} multilinha />}
      </Seccao>
    );
  }

  if (intake.situacao === "universidade") {
    return (
      <Seccao titulo="Situação declarada">
        <Campo label="Opção escolhida" valor={SITUACAO_LABEL[intake.situacao] ?? intake.situacao} />
        <Campo label="Curso actual" valor={intake.curso_actual ?? "—"} />
        <Campo label="Como se sente em relação ao curso" valor={(intake.satisfacao_curso && SATISFACAO_LABEL[intake.satisfacao_curso]) ?? "—"} />
        {intake.para_onde_quer_ir?.trim() && <Campo label="Se pensa mudar, para onde" valor={intake.para_onde_quer_ir} multilinha />}
      </Seccao>
    );
  }

  if (intake.situacao === "trabalho-quero-mudar") {
    return (
      <Seccao titulo="Situação declarada">
        <Campo label="Opção escolhida" valor={SITUACAO_LABEL[intake.situacao] ?? intake.situacao} />
        <Campo label="Área de trabalho actual" valor={intake.area_trabalho_actual ?? "—"} />
        <Campo label="Há quanto tempo" valor={(intake.anos_experiencia && ANOS_LABEL[intake.anos_experiencia]) ?? "—"} />
        {intake.o_que_nao_funciona?.trim() && <Campo label="O que não está a funcionar" valor={intake.o_que_nao_funciona} multilinha />}
        {intake.para_onde_quer_ir?.trim() && <Campo label="Para onde quer ir" valor={intake.para_onde_quer_ir} multilinha />}
        {intake.tipo_mudanca && intake.tipo_mudanca.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-ink/60">Tipo de mudança</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {intake.tipo_mudanca.map((t) => (
                <span key={t} className="rounded-full bg-navy px-2.5 py-1 text-xs font-semibold text-white">
                  {TIPO_MUDANCA_LABEL[t] ?? t}
                </span>
              ))}
            </div>
          </div>
        )}
        {intake.areas_destino && intake.areas_destino.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-ink/60">Áreas de destino</p>
            <AreasDestinoChips areas={intake.areas_destino} />
            {intake.areas_destino_outra?.trim() && <p className="mt-2 text-sm text-navy">Outra: {intake.areas_destino_outra}</p>}
          </div>
        )}
      </Seccao>
    );
  }

  return (
    <Seccao titulo="Situação declarada">
      <Campo label="Opção escolhida" valor={SITUACAO_LABEL[intake.situacao] ?? intake.situacao} />
      {intake.descricao_situacao?.trim() && <Campo label="Descrição da situação" valor={intake.descricao_situacao} multilinha />}
    </Seccao>
  );
}

/** Chips de áreas de destino agrupadas pela mesma categoria usada no formulário; as duas sem categoria (outra/ainda não sei) ficam soltas no fim. */
function AreasDestinoChips({ areas }: { areas: string[] }) {
  const semCategoria = areas.filter((a) => !AREA_DESTINO_CATEGORIA[a]);
  return (
    <div className="mt-2 space-y-2">
      {CATEGORIAS_AREAS_DESTINO.map((categoria) => {
        const itens = areas.filter((a) => AREA_DESTINO_CATEGORIA[a] === categoria);
        if (itens.length === 0) return null;
        return (
          <div key={categoria}>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">{categoria}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {itens.map((a) => (
                <span key={a} className="rounded-full bg-amber px-2.5 py-1 text-xs font-semibold text-navy-dark">
                  {AREA_DESTINO_LABEL[a] ?? a}
                </span>
              ))}
            </div>
          </div>
        );
      })}
      {semCategoria.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {semCategoria.map((a) => (
            <span key={a} className="rounded-full bg-fog px-2.5 py-1 text-xs font-semibold text-ink/70">
              {AREA_DESTINO_LABEL[a] ?? a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Seccao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{titulo}</p>
      <dl className="mt-2 divide-y divide-border rounded-lg border border-border">{children}</dl>
    </section>
  );
}

function Campo({ label, valor, monoespaco, multilinha }: { label: string; valor: string; monoespaco?: boolean; multilinha?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-4 px-4 py-3">
      <dt className="text-sm font-semibold text-ink/60">{label}</dt>
      <dd className={`col-span-2 text-sm text-navy ${monoespaco ? "font-mono text-xs" : ""} ${multilinha ? "whitespace-pre-wrap" : ""}`}>{valor}</dd>
    </div>
  );
}
