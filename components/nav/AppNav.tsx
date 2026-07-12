"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldHalf, LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";

const LINKS = [
  { href: "/guardian", label: "Guardian" },
  { href: "/positions", label: "Posiciones" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between gap-8 mb-10 pb-1 border-b border-hairline">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2 pb-3 -mb-px">
          <ShieldHalf size={16} className="text-accent" />
          <span className="text-sm tracking-wide text-text-primary">
            Aethelgard
          </span>
        </div>
        {LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm px-1 pb-3 -mb-px transition-colors"
              style={{
                color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                borderBottom: active
                  ? "1px solid var(--accent-functional)"
                  : "1px solid transparent",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <form action={logout} className="pb-3 -mb-px">
        <button
          type="submit"
          className="text-xs text-text-tertiary flex items-center gap-1.5"
        >
          <LogOut size={13} /> Salir
        </button>
      </form>
    </nav>
  );
}
