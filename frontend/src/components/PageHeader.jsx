export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-[21px] font-semibold text-ink-1 tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13.5px] text-ink-3 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
