-- Allow the site-images bucket to also hold short videos. The admin-content
-- edge function still enforces the real caps (5 MB for images, 40 MB for
-- videos); this raises the bucket's own size ceiling above the 40 MB app cap
-- (with a little headroom) so those uploads aren't rejected by storage.
-- allowed_mime_types stays null (unrestricted) — the edge function is the
-- gatekeeper for content types.
update storage.buckets
set file_size_limit = 47185920 -- 45 MiB, comfortably above the 40 MB app cap
where id = 'site-images';
