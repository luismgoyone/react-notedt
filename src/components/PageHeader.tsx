export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-lg font-semibold tracking-wide uppercase">{title}</h1>
      {description && <p className="mt-1 text-muted">{description}</p>}
    </div>
  );
}
