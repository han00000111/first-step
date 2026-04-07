type StatsCardsProps = {
  items: {
    label: string;
    value: string;
    note: string;
  }[];
};

export function StatsCards({ items }: StatsCardsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className="relative overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.16)]"
        >
          <div
            className={`absolute inset-x-0 top-0 h-1 ${
              index === 1
                ? "bg-emerald-500"
                : index === 2
                  ? "bg-amber-500"
                  : index === 3
                    ? "bg-rose-500"
                    : "bg-sky-500"
            }`}
          />
          <div className="text-sm text-zinc-500">{item.label}</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
            {item.value}
          </div>
          <div className="mt-2 text-sm leading-6 text-zinc-500">{item.note}</div>
        </div>
      ))}
    </section>
  );
}
