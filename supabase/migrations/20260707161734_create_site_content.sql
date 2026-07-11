/*
# Create site_content table

Stores editable site content in a single JSONB row per section, controlled from
the /admin CMS. Public (anon) users read to render the site; writes go through
an edge function that authenticates a shared temporary password and upserts with
the service role.

1. New Tables
   - `site_content`
     - `key` (text, primary key) — section name (e.g. "site", "home", "team", "work", "case_studies")
     - `value` (jsonb, not null) — arbitrary content shape for that section
     - `updated_at` (timestamptz) — last update timestamp

2. Security
   - Enable RLS on `site_content`.
   - Public read (anon + authenticated). Writes are NOT permitted from the client
     directly; the `admin-content` edge function uses the service role to upsert
     after verifying the admin password, so no INSERT/UPDATE/DELETE policies are
     added intentionally.
*/

CREATE TABLE IF NOT EXISTS site_content (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_content_public_select" ON site_content;
CREATE POLICY "site_content_public_select" ON site_content FOR SELECT
  TO anon, authenticated USING (true);
