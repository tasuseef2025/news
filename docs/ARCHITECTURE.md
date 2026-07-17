# Architecture

## Principles

- App Router first: routes live under `src/app`.
- Server Components by default: data-heavy pages fetch MongoDB data on the server.
- Client Components only for interactivity: forms, menus, theme toggle, newsletter signup, back-to-top, web vitals reporting.
- MongoDB is the source of truth. Empty collections return empty states, not dummy data.
- Reusable UI lives in `src/components` and feature-specific UI lives in `src/features`.
- Domain models live in `src/models`.
- Shared business logic lives in `src/lib`.

## Folder Structure

```txt
src/app              App Router pages and REST API routes
src/components       Shared layout, UI, analytics, and provider components
src/features         Feature-specific components for articles, auth, dashboard, homepage
src/lib              Data access, permissions, SEO automation, categories, utilities
src/models           Mongoose models
src/store            Redux Toolkit store for client UI state
src/types            Shared TypeScript types and NextAuth augmentation
server               Optional Express API and operational scripts
docs                 Architecture, API, and deployment docs
```

## Data Flow

Public pages use server-side MongoDB queries for SEO, performance, and consistent rendering. Admin forms call REST API routes. API routes validate permissions through `src/lib/permissions.ts` and persist through Mongoose models.

## SEO System

Article create/update routes call `src/lib/content-automation.ts` to generate slugs, metadata, canonical URLs, reading time, OG images, and JSON-LD defaults. Runtime routes generate sitemap, Google News sitemap, RSS, robots, and OG images.

## RBAC

Roles and permissions are centralized in `src/lib/permissions.ts`. Route handlers and middleware check permissions rather than hardcoded role names.
