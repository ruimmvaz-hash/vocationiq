import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { obterIntake } from "@/lib/store";
import { SITUACOES } from "@/lib/validation";
import { MarcarEntregueButton } from "./MarcarEntregueButton";

export const dynamic = "force-dynamic";

const SITUACAO_LABEL = Object.fromEntries(SITUACOES.map((s) => [s.valor, s.label]));

function formatarDataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
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
        <Link href="/admin/intakes" className="text-sm font-semibold text-navy hover:underline">
          ← Todos os pedidos
        </Link>
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não consegui carregar este pedido: {erro}</p>
      </main>
    );
  }
  if (!intake) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/admin/intakes" className="text-sm font-semibold text-navy hover:underline">
        ← Todos os pedidos
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-navy">{intake.nome}</h1>
        <MarcarEntregueButton intakeId={intake.id} jaEntregue={intake.report_status === "delivered"} />
      </div>

      <dl className="mt-8 divide-y divide-border rounded-lg border border-border">
        <Campo label="Data de nascimento" valor={intake.data_nascimento} />
        <Campo label="Hora de nascimento" valor={intake.hora_nascimento ?? "não indicada"} />
        <Campo label="Local de nascimento" valor={intake.local_nascimento} />
        <Campo label="Situação declarada" valor={SITUACAO_LABEL[intake.situacao] ?? intake.situacao} />
        <Campo label="O que trouxe aqui" valor={intake.contexto ?? "—"} multilinha />
        <Campo label="Email" valor={intake.email ?? "—"} />
        <Campo label="Estado do pagamento" valor={intake.payment_status === "paid" ? `Pago em ${formatarDataHora(intake.paid_at)}` : intake.payment_status} />
        <Campo label="Pedido feito em" valor={formatarDataHora(intake.created_at)} />
      </dl>
    </main>
  );
}

function Campo({ label, valor, multilinha }: { label: string; valor: string; multilinha?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-4 px-4 py-3">
      <dt className="text-sm font-semibold text-ink/60">{label}</dt>
      <dd className={`col-span-2 text-sm text-navy ${multilinha ? "whitespace-pre-wrap" : ""}`}>{valor}</dd>
    </div>
  );
}
