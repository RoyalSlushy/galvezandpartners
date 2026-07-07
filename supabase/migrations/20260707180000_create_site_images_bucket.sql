-- Public bucket for CMS-uploaded images. Objects are world-readable via
-- /storage/v1/object/public/site-images/<path>; writes and listing go through
-- the service role inside the admin-content edge function only, so no storage
-- policies are needed here.
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;
