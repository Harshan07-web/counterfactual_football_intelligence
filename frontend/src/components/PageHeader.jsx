export default function PageHeader({ title, subtitle, action }) {
  return <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
    <div className="min-w-0"><h1 className="text-[24px] sm:text-[27px] font-bold tracking-tight text-ink-1">{title}</h1>{subtitle && <div className="text-[12.5px] sm:text-[13.5px] text-ink-3 mt-1.5 leading-relaxed">{subtitle}</div>}</div>
    {action && <div className="w-full sm:w-auto shrink-0">{action}</div>}
  </div>;
}
