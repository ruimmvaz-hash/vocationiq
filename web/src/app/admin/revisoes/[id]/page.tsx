import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { obterRevisao } from "@/lib/revisaoStore";
import { SEGUIU_DIRECAO, SITUACAO_MUDOU, SENTIMENTO_LABELS } from "@/lib/revisaoValidation";
import { AdminNav } from "@/components/admin/AdminNav";
import { MarcarEntregueButton } from "./MarcarEntregueButton";

export const dynamic = "force-dynamic";

const SEGUIU_LABEL = Object.fromEntries(SEGUIU_DIRECAO.map((s) => [s.valor, s.label]));
const SITUACAO_LABEL = Object.fromEntries(SITUACAO_MUDOU.map((s) => [s.valor, s.label]));

function formatarDataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function formatarValor(cents: number | null): string {
  return `€${((cents ?? 4900) / 100).toFixed(2)}`;
}

export default async function AdminRevisaoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const { id } = await params;

  let revisao: Awaited<ReturnType<typeof obterRevisao>> = null;
  let erro: string | null = null;
  try {
    revisao = await obterRevisao(id);
  } catch (err) {
    erro = err instanceof Error ? err.message : String(err);
  }

  if (erro) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <AdminNav active="revisoes" />
        <Link href="/admin/revisoes" className="text-sm font-semibold text-navy hover:underline">
          ← Todas as revisões
        </Link>
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não consegui carregar esta revisão: {erro}</p>
      </main>
    );
  }
  if (!revisao) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <AdminNav active="revisoes" />
      <Link href="/admin/revisoes" className="text-sm font-semibold text-navy hover:underline">
        ← Todas as revisões
      </Link>

      {/* O QUE O CLIENTE TROUXE AGORA — em destaque, no topo */}
      <div className="mt-4 rounded-lg border-l-4 border-amber bg-navy px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-wide text-amber">O que o cliente trouxe agora</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">{revisao.nome}</h1>
      </div>

      <Seccao titulo="O que mudou">
        <Campo label="Seguiu alguma das direcções do relatório?" valor={(revisao.seguiu_direcao && SEGUIU_LABEL[revisao.seguiu_direcao]) ?? "—"} />
        {revisao.o_que_correu_bem?.trim() && <Campo label="O que está a correr bem" valor={revisao.o_que_correu_bem} multilinha />}
        {revisao.o_que_nao_correu?.trim() && <Campo label="O que não está a correr como esperava" valor={revisao.o_que_nao_correu} multilinha />}
      </Seccao>

      <section className="mt-6 rounded-lg border-2 border-navy bg-navy/5 p-5">
        <p className="text-sm font-bold text-navy">Dúvida actual</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{revisao.duvida_actual}</p>
      </section>

      <Seccao titulo="A dúvida actual">
        <Campo
          label="Como se sente em relação ao caminho"
          valor={revisao.sentimento_caminho ? `${revisao.sentimento_caminho}/5${revisao.sentimento_caminho === 1 || revisao.sentimento_caminho === 5 ? ` — ${SENTIMENTO_LABELS[revisao.sentimento_caminho]}` : ""}` : "—"}
        />
        {revisao.questao_relatorio?.trim() && <Campo label="Questiona algo do relatório" valor={revisao.questao_relatorio} multilinha />}
      </Seccao>

      <Seccao titulo="O momento actual">
        <Campo label="A situação mudou?" valor={(revisao.situacao_mudou && SITUACAO_LABEL[revisao.situacao_mudou]) ?? "—"} />
        {revisao.decisao_concreta?.trim() && <Campo label="Decisão concreta a tomar" valor={revisao.decisao_concreta} multilinha />}
      </Seccao>

      <Seccao titulo="Pagamento">
        <Campo label="Email" valor={revisao.email ?? "—"} />
        <Campo label="Valor pago" valor={formatarValor(revisao.amount_cents)} />
        <Campo label="Data e hora do pagamento" valor={formatarDataHora(revisao.paid_at)} />
        <Campo label="ID da transacção Stripe" valor={revisao.stripe_checkout_session_id ?? "—"} monoespaco />
      </Seccao>

      <Seccao titulo="Relatório original">
        <div className="px-4 py-3">
          <Link href={`/admin/relatorios/${revisao.intake_id_original}`} className="font-semibold text-navy underline hover:text-navy-dark">
            Ver o relatório original →
          </Link>
        </div>
      </Seccao>

      <Seccao titulo="Estado">
        <Campo label="Estado" valor={revisao.estado === "entregue" ? "Entregue" : "Pendente"} />
        {revisao.estado === "entregue" && <Campo label="Data de entrega" valor={formatarDataHora(revisao.entregue_em)} />}
      </Seccao>

      <div className="mt-6 flex flex-wrap items-start gap-4">
        <MarcarEntregueButton revisaoId={revisao.id} jaEntregue={revisao.estado === "entregue"} />
      </div>
    </main>
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
