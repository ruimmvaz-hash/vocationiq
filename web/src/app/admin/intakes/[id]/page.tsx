import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { obterIntake } from "@/lib/store";
import { obterUltimoRelatorio } from "@/lib/storage";
import { SITUACOES } from "@/lib/validation";
import { AdminNav } from "@/components/admin/AdminNav";
import { MarcarEntregueButton } from "./MarcarEntregueButton";
import { RelatorioActions } from "./RelatorioActions";

export const dynamic = "force-dynamic";

const SITUACAO_LABEL = Object.fromEntries(SITUACOES.map((s) => [s.valor, s.label]));

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
        <AdminNav active="intakes" />
        <Link href="/admin/intakes" className="text-sm font-semibold text-navy hover:underline">
          ← Todos os pedidos
        </Link>
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não consegui carregar este pedido: {erro}</p>
      </main>
    );
  }
  if (!intake) notFound();

  const relatorio = await obterUltimoRelatorio(id).catch(() => null);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <AdminNav active="intakes" />
      <Link href="/admin/intakes" className="text-sm font-semibold text-navy hover:underline">
        ← Todos os pedidos
      </Link>

      {/* O QUE O CLIENTE PEDIU — em destaque, fundo diferenciado */}
      <div className="mt-4 rounded-lg border-l-4 border-amber bg-navy px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-wide text-amber">O que o cliente pediu</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">{intake.nome}</h1>
      </div>

      <Seccao titulo="Dados de nascimento">
        <Campo label="Nome completo" valor={intake.nome} />
        <Campo label="Data de nascimento" valor={intake.data_nascimento} />
        <Campo label="Hora de nascimento" valor={intake.hora_nascimento ?? "não fornecida"} />
        <Campo label="Local de nascimento" valor={intake.local_nascimento} />
      </Seccao>

      <Seccao titulo="Situação declarada">
        <Campo label="Opção escolhida" valor={SITUACAO_LABEL[intake.situacao] ?? intake.situacao} />
      </Seccao>

      <section className="mt-6 rounded-lg border-2 border-amber/50 bg-amber/10 p-5">
        <p className="text-sm font-bold text-navy">O que te trouxe aqui</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
          {intake.contexto?.trim() ? intake.contexto : "Cliente não partilhou contexto adicional"}
        </p>
      </section>

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

      <div className="mt-6 flex flex-wrap items-start gap-4">
        <MarcarEntregueButton intakeId={intake.id} jaEntregue={intake.report_status === "delivered"} />
      </div>

      <div className="mt-6">
        <RelatorioActions intakeId={intake.id} temRelatorio={!!relatorio} jaEnviado={!!relatorio?.enviado_em} />
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

function Campo({ label, valor, monoespaco }: { label: string; valor: string; monoespaco?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-4 px-4 py-3">
      <dt className="text-sm font-semibold text-ink/60">{label}</dt>
      <dd className={`col-span-2 text-sm text-navy ${monoespaco ? "font-mono text-xs" : ""}`}>{valor}</dd>
    </div>
  );
}
