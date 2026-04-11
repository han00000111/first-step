type StatsCardsProps = {
  items: {
    label: string;
    value: string;
    note: string;
  }[];
};

export function StatsCards({ items }: StatsCardsProps) {
  const barColors = ["#a7bac5", "#9ab4a5", "#ccb08a", "#c6a1a1"];

  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className="relative overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.16)] sm:p-5"
        >
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ backgroundColor: barColors[index] ?? barColors[0] }}
          />
          <div className="text-xs text-zinc-500 sm:text-sm">{item.label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:mt-3 sm:text-3xl">
            {item.value}
          </div>
          <div className="mt-2 text-xs leading-5 text-zinc-500 sm:text-sm sm:leading-6">
            {item.note}
          </div>
        </div>
      ))}
    </section>
  );
}
