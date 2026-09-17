create index if not exists mari_api_keys_workspace_idx
  on public.mari_api_keys (workspace_id);

create index if not exists mari_api_keys_created_by_idx
  on public.mari_api_keys (created_by)
  where created_by is not null;

create index if not exists mari_api_usage_workspace_idx
  on public.mari_api_usage (workspace_id);
