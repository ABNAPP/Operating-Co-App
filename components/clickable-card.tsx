import Link from "next/link";
import type { ReactNode } from "react";

type ClickableCardLinkProps = {
  href: string;
  title: string;
  children: ReactNode;
  className?: string;
};

/** Whole-card navigation link; no nested interactive children. */
export function ClickableCardLink({ href, title, children, className }: ClickableCardLinkProps) {
  return (
    <Link
      href={href}
      className={`clickableCard ${className ?? ""}`.trim()}
      aria-label={title}
    >
      {children}
    </Link>
  );
}
