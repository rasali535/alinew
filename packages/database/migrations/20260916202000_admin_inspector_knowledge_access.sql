-- Ralion OS — Admin inspector knowledge access
-- The platform admin inspector reads tenant Mari knowledge through the
-- privileged server client. Keep direct anon/authenticated access unchanged.

grant select on table public.mari_knowledge to service_role;

notify pgrst, 'reload schema';
