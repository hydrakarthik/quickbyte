import { ArrowLeftIcon } from './icons';

interface PageHeaderProps {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
}

export function PageHeader({ backHref, backLabel, title, subtitle }: PageHeaderProps) {
  return (
    <div>
      <a
        href={backHref}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {backLabel}
      </a>
      <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
      {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}