"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ChainTabs({ chainId }: { chainId: string }) {
  const pathname = usePathname();
  const base = `/chains/${chainId}`;
  const tabs = [
    { href: base, label: "Steps" },
    { href: `${base}/generate`, label: "Generate" },
    { href: `${base}/media`, label: "Media" },
  ];
  return (
    <nav className="flex gap-1 border-b-2 border-ink">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`px-4 py-2 font-display text-sm uppercase tracking-widest ${active ? "bg-ink text-background" : "hover:bg-rule"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
