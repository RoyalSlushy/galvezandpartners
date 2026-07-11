/*
# Create contact_submissions table

Stores incoming contact form submissions from the agency website.
This is a single-tenant app with no sign-in — anyone can submit the form.

1. New Tables
   - `contact_submissions`
     - `id` (uuid, primary key) — unique submission identifier
     - `first_name` (text) — submitter's first name (optional)
     - `last_name` (text) — submitter's last name (optional)
     - `email` (text, not null) — submitter's email address
     - `message` (text, not null) — the inquiry message
     - `created_at` (timestamptz) — when the submission was received

2. Security
   - Enable RLS on `contact_submissions`.
   - Allow anon + authenticated INSERT (public form).
   - Allow anon + authenticated SELECT (so the app can confirm submission).
   - No UPDATE or DELETE from the frontend — submissions are immutable records.
*/

CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text DEFAULT '',
  last_name text DEFAULT '',
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_submissions" ON contact_submissions;
CREATE POLICY "anon_insert_submissions" ON contact_submissions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_submissions" ON contact_submissions;
CREATE POLICY "anon_select_submissions" ON contact_submissions FOR SELECT
  TO anon, authenticated USING (true);
