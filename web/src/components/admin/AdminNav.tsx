import Link from "next/link";

const ITEMS = [
  { href: "/admin", key: "dashboard", label: "Dashboard" },
  { href: "/admin/relatorios", key: "relatorios", label: "Relatórios" },
  { href: "/admin/clientes", key: "clientes", label: "Clientes" },
  { href: "/admin/testemunhos", key: "testemunhos", label: "Testemunhos" },
  { href: "/admin/analytics", key: "analytics", label: "Analytics" },
  { href: "/admin/trafego", key: "trafego", label: "Tráfego" },
  { href: "/admin/influencers", key: "influencers", label: "Influencers" },
  { href: "/admin/comerciais", key: "comerciais", label: "Comerciais" },
] as const;

export type AdminSection = (typeof ITEMS)[number]["key"];

export function AdminNav({ active }: { active: AdminSection }) {
  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
            item.key === active ? "bg-navy text-white" : "text-navy/70 hover:bg-fog"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
