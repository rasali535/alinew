-- Ralion OS — Social publication connection provenance
-- Keep durable publication history tied to the exact social connection used.

alter table public.social_posts
  add column if not exists social_connection_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'social_posts_social_connection_id_fkey'
      and conrelid = 'public.social_posts'::regclass
  ) then
    alter table public.social_posts
      add constraint social_posts_social_connection_id_fkey
      foreign key (social_connection_id)
      references public.social_connections(id)
      on delete set null;
  end if;
end $$;

create index if not exists social_posts_connection_created_idx
  on public.social_posts (social_connection_id, created_at desc);

notify pgrst, 'reload schema';
