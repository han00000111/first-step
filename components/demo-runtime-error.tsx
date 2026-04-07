type DemoRuntimeErrorProps = {
  title: string;
  message: string;
  details?: string[];
};

export function DemoRuntimeError({
  title,
  message,
  details = [],
}: DemoRuntimeErrorProps) {
  return (
    <section className="rounded-[28px] border border-amber-200 bg-[linear-gradient(180deg,#fffdf7_0%,#fff8e8_100%)] p-6 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.18)]">
      <div className="text-sm font-medium text-amber-800">Demo 环境提示</div>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-700">{message}</p>
      {details.length > 0 ? (
        <div className="mt-4 space-y-2 rounded-2xl border border-amber-200 bg-white/80 px-4 py-4 text-sm text-zinc-700">
          {details.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
