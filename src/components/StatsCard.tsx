interface StatsCardProps { label: string; value: string; detail?: string; }
export function StatsCard({ label, value, detail }: StatsCardProps) {
  return <article className="stat-card"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article>;
}
