import Link from "next/link";

const ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/intakes", label: "Pedidos" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/comerciais", label: "Comerciais" },
] as const;

export function AdminNav({ active }: { active: "dashboard" | "intakes" | "analytics" | "comerciais" }) {
  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
      {ITEMS.map((item) => {
        const isActive = (active === "dashboard" && item.href === "/admin") || item.href.endsWith(active);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              isActive ? "bg-navy text-white" : "text-navy/70 hover:bg-fog"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
