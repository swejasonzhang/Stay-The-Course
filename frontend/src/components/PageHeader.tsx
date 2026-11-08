import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

// The top of every tool page: which principle it is, a title, and a short explanation.
export function PageHeader({ eyebrow, icon, title, children }: PageHeaderProps) {
  return (
    <header className="page-header">
      <span className="eyebrow">
        {icon}
        {eyebrow}
      </span>
      <h1>{title}</h1>
      <p>{children}</p>
    </header>
  );
}
