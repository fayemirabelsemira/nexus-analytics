# Nexus Analytics

Upload a CSV or Excel file, clean it, analyze it, chart it and export it, **with or without an account**.

Stack: React + TypeScript + Vite, Tailwind CSS v4, Recharts, SheetJS (`xlsx`), Supabase (auth, Postgres, Storage).

## Two modes

| | Guest Mode (no account) | Registered Mode |
| --- | --- | --- |
| Upload CSV / XLSX / XLS, preview, filter, sort | yes | yes |
| Type detection, missing values, duplicates, cleaning (undoable, logged) | yes | yes |
| KPIs, statistics, correlations, insights, charts | yes | yes |
| Export cleaned CSV / Excel, download HTML / Excel reports | yes | yes |
| Where the data lives | browser memory only; gone on refresh or leaving | saved datasets in a private Storage bucket, metadata in Postgres |
| Saved datasets, analysis history, saved reports, account page | - | yes |

**Guest data is never stored**: not in Supabase, localStorage or IndexedDB. Only the light/dark theme choice is kept in localStorage. Closing or refreshing with unsaved work shows a browser confirmation.

**Guest to account**: Log in / Create account opens a modal (no page reload), so the open dataset survives. After signing in the app *asks* whether to save it; nothing is uploaded without a click on Save. If saving fails, the dataset stays open. If your Supabase project requires email confirmation, open the confirmation link in a **new tab** and keep the original tab open.

Saved datasets are stored as CSV (the current, cleaned state). "Save as new" is used for changes to an already saved dataset (files are never overwritten).

## Setup

```bash
npm install
cp .env.example .env     # VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (publishable key only; never the secret key)
npm run dev
```

### Database (manual, via Supabase Dashboard -> SQL Editor -> New query)

Run in this order, each as its own query: `supabase/manual-sql/`

1. `00_base_profiles.sql` (only creates `profiles` if missing)
2. `01_profiles_hardening.sql`
3. `02_dataset_tables.sql` (datasets, analysis_history, reports + RLS)
4. `03_storage_buckets.sql` (private buckets `datasets`, `reports` + policies)
5. `04_verify_readonly.sql` (read-only checks)

Then in Authentication -> URL Configuration add your site URL and redirect URLs (local dev and production) so confirmation and password-reset links work. `supabase/legacy-migrations/` is the old transactions-based schema; it is not used by this version.

## Scripts

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run lint` - oxlint
- `npm test` - unit tests for the dataset engine (parsing, type detection, cleaning, filters, aggregation, insights, exports, HTML escaping)

## Layout

```
src/
  engine/       pure, tested dataset logic (parse, build, profile, clean, filter, aggregate, insights, export)
  contexts/     Auth, Session (in-memory dataset), AuthUI (modals), Feedback (toasts/confirm), Preferences (theme)
  services/     Supabase access: auth, datasets (+Storage), history, reports
  pages/        Dashboard, Upload, Preview, Cleaning, Analytics, Visualizations, Reports, Export,
                Saved Datasets, History, Saved Reports, Account, Reset Password
  components/   layout, auth (modal, save dialog), data table/filters, charts, shared UI
  utils/        csv, spreadsheet (read CSV/Excel, download CSV/Excel)
supabase/       manual-sql/ (run by hand), legacy-migrations/, config.toml
tests/          node:test unit tests
```

## Limits

25 MB and 100,000 rows x 500 columns per dataset. Analysis runs in the browser.
# nexus-analytics
