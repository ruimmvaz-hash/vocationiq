export function Estrelas({ nota, className }: { nota: number | null; className?: string }) {
  const n = nota ?? 0;
  return (
    <span className={className} aria-label={nota ? `${nota} de 5 estrelas` : "sem avaliação"}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= n ? "#F5A623" : "#E6E6E6" }}>
          ★
        </span>
      ))}
    </span>
  );
}
