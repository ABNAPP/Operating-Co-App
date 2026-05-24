import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Companies", href: "/companies" },
  { label: "Company Workspace", href: "/company-workspace" },
  { label: "Data Hub", href: "/data-hub" },
  { label: "Engine Docs", href: "/engine-docs" },
  { label: "Settings", href: "/settings" },
];

export function MainNav() {
  return (
    <header className="topbar">
      <div className="topbarInner">
        <div className="brandBlock">
          <p className="brandEyebrow">Operating Co App</p>
          <h1 className="brandTitle">Operating Company Valuation Workspace</h1>
        </div>
        <nav className="topNav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="navLink">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
