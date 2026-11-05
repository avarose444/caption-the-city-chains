# Prompt Chain Tool

A superadmin tool for building and testing the prompt chains behind [Caption the City](https://github.com/avarose444/helloworld). It shares Caption the City's Supabase database with the [admin area](https://github.com/avarose444/caption-the-city-admin). Built with Next.js 16 and Supabase, deployed on Vercel.

## What it does

- Create, update, and delete prompt chains
- Create, update, and delete chain steps, and reorder them with the ↑ ↓ buttons
- Run a chain on an uploaded or existing photo and see every step's output
- View all the media a specific chain has produced (test runs and posts from the app)
- Light, dark, and system-default color modes

Each step's output reaches the next step through `{{previous}}`. The last step always returns the captions as a JSON array; the tool keeps that flag on whichever step is last after any reorder.

## Access

`proxy.ts` sends every route except `/login` and the auth callback to the login page unless the user is signed in with Google and has `profiles.is_superadmin = true`. `requireAdmin()` checks again in every page and server action, and Row Level Security in the database enforces the same rule.

## Setup

1. Run `supabase/chain-tool.sql` in the Supabase SQL editor (after the admin area's `admin.sql` and `observability.sql`).
2. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.
3. Add this app's URL to Supabase → Authentication → URL Configuration → Redirect URLs.
4. `npm install && npm run dev`.
