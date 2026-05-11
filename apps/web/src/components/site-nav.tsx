'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/profile', label: 'Profile' },
];

/**
 * Top-level site navigation bar.
 * Rendered in the root layout so it appears on every page.
 */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '12px 24px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: 'var(--bs-body-bg, #fff)',
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: '1.125rem',
          color: 'var(--color-accent, #6366f1)',
          marginRight: 'auto',
        }}
      >
        xenoform.ai
      </span>
      {navItems.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? 'page' : undefined}
          style={{
            fontSize: '0.9375rem',
            fontWeight: pathname === href ? 700 : 400,
            color:
              pathname === href
                ? 'var(--color-accent, #6366f1)'
                : 'inherit',
            textDecoration: 'none',
          }}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
