# Skill: Ship Next Feature

## Overview
Guide for shipping a new product feature end-to-end in this Next.js monorepo.

## Steps

### 1. Identify the feature
- Clarify acceptance criteria with the product team
- Check if a feature flag is required (default: yes for user-facing changes)

### 2. Audit existing patterns
- Look for existing CSS custom properties / design tokens before adding new styles
- Prefer extending existing component conventions over introducing new abstractions

### 3. Implement
- Place new components under `apps/web/src/app/components/`
- Place new styles under `apps/web/src/app/styles/`
- Use `"use client"` directive for interactive components
- Persist user preferences to `localStorage` as a fallback; sync with server when an account is available

### 4. Feature flag
- Gate new UI behind an environment variable or server-side flag
- Example: `if (!process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR) return null;`

### 5. Accessibility
- WCAG AA contrast ratio minimum for all colour choices
- Use `role`, `aria-*` attributes on custom interactive elements
- Ensure focus rings use `--colour-accent` token

### 6. Review & ship
- Run `eslint` and TypeScript checks before opening a PR
- Attach screenshots / screen recordings for UI changes
