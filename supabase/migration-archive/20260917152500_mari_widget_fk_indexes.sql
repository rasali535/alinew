-- Cover widget tenant foreign keys used by server-side cleanup and isolation queries.

create index if not exists mari_widget_sessions_organization_idx
  on public.mari_widget_sessions (organization_id);

create index if not exists mari_widget_sessions_workspace_idx
  on public.mari_widget_sessions (workspace_id);

create index if not exists mari_widget_usage_workspace_idx
  on public.mari_widget_usage (workspace_id);
