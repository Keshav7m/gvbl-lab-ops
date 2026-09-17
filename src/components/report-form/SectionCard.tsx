import { cn } from "@/lib/utils";

interface SectionCardProps {
  id: string;
  number?: number;
  title: string;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** A numbered form section styled after the purple section labels on the paper form. */
export function SectionCard({ id, number, title, description, aside, children, className }: SectionCardProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("panel scroll-mt-24 overflow-hidden", className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pr-4 pt-3 pb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 id={`${id}-title`} className="section-pill">
            {number !== undefined && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-violet-800">
                {number}
              </span>
            )}
            {title}
          </h2>
          {description && <p className="text-xs text-ink-muted">{description}</p>}
        </div>
        {aside}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
