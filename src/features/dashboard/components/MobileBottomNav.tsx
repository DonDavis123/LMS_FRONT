"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Contact2, Handshake, Home, Menu, Users as UsersIcon } from "lucide-react";

interface MobileBottomNavProps {
  /** Opens the full navigation drawer (Companies, Activities, Admin …). */
  onOpenMenu: () => void;
  isMenuOpen: boolean;
}

const TABS = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/leads", label: "Leads", icon: UsersIcon, exact: false },
  { href: "/dashboard/contacts", label: "Contacts", icon: Contact2, exact: false },
  { href: "/dashboard/deals", label: "Deals", icon: Handshake, exact: false },
];

/**
 * Phone-only tab bar (hidden by CSS from 768px up). The four most-used
 * sections are one tap away; "Menu" opens the existing sidebar drawer for
 * everything else. It is a normal flex child of the shell — not fixed — so the
 * page content ends exactly where the bar begins.
 */
export default function MobileBottomNav({ onOpenMenu, isMenuOpen }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="lp-bottom-nav" aria-label="Quick navigation">
      {TABS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="lp-bottom-nav__item"
          >
            <span className="lp-bottom-nav__icon">
              <Icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
            </span>
            {label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-expanded={isMenuOpen}
        aria-label="Open full menu"
        className="lp-bottom-nav__item"
      >
        <span className="lp-bottom-nav__icon">
          <Menu size={20} aria-hidden="true" />
        </span>
        Menu
      </button>
    </nav>
  );
}
