import Link from "next/link";

type Props = {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function SiteHeader({ title = "Testing System", subtitle, right }: Props) {
  return (
    <header className="border-b border-drive-line bg-drive-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <Link href="/" className="text-lg font-semibold tracking-tight text-drive-accent">
            {title}
          </Link>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-drive-muted">{subtitle}</p>
          ) : null}
        </div>
        {right}
      </div>
    </header>
  );
}
