create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_name text;
  v_branch_name text;
  v_org_slug_base text;
  v_org_slug text;
  v_workspace_slug_base text;
  v_workspace_slug text;
  v_org_id uuid;
begin
  insert into public.profiles (id, full_name, avatar_url, email, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', null),
    new.email,
    now()
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    email = excluded.email,
    updated_at = now();

  v_org_name := nullif(trim(new.raw_user_meta_data->>'org_name'), '');
  v_branch_name := coalesce(nullif(trim(new.raw_user_meta_data->>'branch_name'), ''), 'Main Workspace');

  -- Only owner-style Ralion registrations include org_name. Social/invited users
  -- without organization metadata are deliberately not auto-provisioned here.
  if v_org_name is not null then
    select o.id
      into v_org_id
      from public.organizations o
     where o.owner_id = new.id
     order by o.created_at asc
     limit 1;

    if v_org_id is null then
      v_org_slug_base := trim(both '-' from regexp_replace(lower(v_org_name), '[^a-z0-9]+', '-', 'g'));
      if v_org_slug_base is null or v_org_slug_base = '' then
        v_org_slug_base := 'org-' || substr(new.id::text, 1, 8);
      end if;

      v_org_slug := v_org_slug_base;
      if exists(select 1 from public.organizations where slug = v_org_slug) then
        v_org_slug := v_org_slug_base || '-' || substr(new.id::text, 1, 8);
      end if;

      insert into public.organizations (name, slug, owner_id)
      values (v_org_name, v_org_slug, new.id)
      returning id into v_org_id;
    end if;

    if not exists (
      select 1
        from public.workspaces w
       where w.owner_id = new.id
         and w.organization_id = v_org_id
    ) then
      v_workspace_slug_base := trim(both '-' from regexp_replace(lower(v_branch_name), '[^a-z0-9]+', '-', 'g'));
      if v_workspace_slug_base is null or v_workspace_slug_base = '' then
        v_workspace_slug_base := 'main';
      end if;

      v_workspace_slug := v_workspace_slug_base;
      if exists(
        select 1 from public.workspaces
         where organization_id = v_org_id and slug = v_workspace_slug
      ) then
        v_workspace_slug := v_workspace_slug_base || '-' || substr(new.id::text, 1, 8);
      end if;

      insert into public.workspaces (organization_id, name, slug, owner_id)
      values (v_org_id, v_branch_name, v_workspace_slug, new.id);
    end if;
  end if;

  return new;
end;
$$;
