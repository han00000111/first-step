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
    <section className="rounded-[24px] border border-amber-200/90 bg-[linear-gradient(180deg,#fffdf8_0%,#fff8ec_100%)] p-4 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.18)] sm:rounded-[28px] sm:p-6">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-amber-800">
        环境提示
      </div>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-700 sm:mt-3 sm:leading-7">
        {message}
      </p>
      {details.length > 0 ? (
        <div className="mt-4 space-y-2 rounded-[18px] border border-amber-200 bg-white/88 px-3.5 py-3.5 text-[13px] leading-5 text-zinc-700 sm:rounded-2xl sm:px-4 sm:py-4 sm:text-sm sm:leading-6">
          {details.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
