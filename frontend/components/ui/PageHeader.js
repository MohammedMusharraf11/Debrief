export default function PageHeader({ eyebrow, title, children, action }) {
  return (
    <header className="px-3 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5 lg:px-8">
      <div className="grid gap-3 min-[430px]:flex min-[430px]:items-start min-[430px]:justify-between min-[430px]:gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">{eyebrow}</p> : null}
          <h1 className="mt-1 text-[clamp(1.35rem,7vw,1.875rem)] font-black leading-tight text-slate-950 sm:text-3xl">{title}</h1>
          {children ? <div className="mt-2 text-sm leading-6 text-slate-600">{children}</div> : null}
        </div>
        {action ? <div className="min-w-0 shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
