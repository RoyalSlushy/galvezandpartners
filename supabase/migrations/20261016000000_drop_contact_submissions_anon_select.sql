/*
# Drop public SELECT on contact_submissions

The original migration let anon + authenticated SELECT every row, and the anon
key ships to every browser, so anyone could list all submissions (names,
emails, messages).

Nothing in the app reads this table. The contact form does a plain `.insert()`
with no `.select()`, so it never needs SELECT (no RETURNING).

1. Security
   - Drop `anon_select_submissions`.
   - Keep `anon_insert_submissions` so the public form still works.
   - Team members still read submissions in the Supabase dashboard, where the
     service role bypasses RLS.
*/

DROP POLICY IF EXISTS "anon_select_submissions" ON contact_submissions;
