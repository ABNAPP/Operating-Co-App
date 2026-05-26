"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface BackLinkProps {
  href: string;
  /** Display label after the arrow, e.g. "Back to Companies". */
  label: string;
  /** When true, also offer browser back with fallback to href. */
  allowBrowserBack?: boolean;
}

export function BackLink({ href, label, allowBrowserBack = false }: BackLinkProps) {
  const router = useRouter();
  const displayLabel = label.startsWith("Back") ? label : `Back to ${label}`;

  function handleBrowserBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(href);
  }

  return (
    <nav className="pageBackNav" aria-label="Page navigation">
      <Link href={href} className="backLink">
        ← {displayLabel}
      </Link>
      {allowBrowserBack ? (
        <>
          <span className="backLinkSeparator" aria-hidden="true">
            ·
          </span>
          <button type="button" className="backLinkButton" onClick={handleBrowserBack}>
            Previous page
          </button>
        </>
      ) : null}
    </nav>
  );
}
