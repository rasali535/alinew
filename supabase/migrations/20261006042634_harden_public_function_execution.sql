-- Lock down legacy RPC permissions without changing trigger or RLS behaviour.
-- No client role should be able to introduce objects into a trusted search path.
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

DO $hardening$
DECLARE
  signature text;
  target regprocedure;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.get_org_edition(uuid)',
    'public.org_has_feature(uuid,text)',
    'public.get_user_organizations()',
    'public.has_permission(text)',
    'public.has_product_access(text)',
    'public.handle_new_user()',
    'public.log_ralion_audit()',
    'public.rls_auto_enable()'
  ] LOOP
    target := to_regprocedure(signature);
    -- Fresh preview databases may not have the legacy baseline yet.
    IF target IS NULL THEN CONTINUE; END IF;
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', target);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', target);
    -- These helpers only inspect auth.uid(); RLS policies require them.
    IF signature IN ('public.get_user_organizations()', 'public.has_permission(text)', 'public.has_product_access(text)') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', target);
    END IF;
  END LOOP;

  FOREACH signature IN ARRAY ARRAY[
    'public.has_product_access(text)',
    'public.handle_updated_at()',
    'public.handle_social_tables_updated_at()',
    'public.update_updated_at_column()',
    'public.get_user_organizations()',
    'public.has_permission(text)',
    'public.log_ralion_audit()',
    'public.org_has_feature(uuid,text)',
    'public.get_org_edition(uuid)'
  ] LOOP
    target := to_regprocedure(signature);
    IF target IS NOT NULL THEN
      -- Relations are schema-qualified; built-in functions resolve in pg_catalog.
      EXECUTE format('ALTER FUNCTION %s SET search_path = ''''', target);
    END IF;
  END LOOP;

  -- pgvector's <=> operator lives in public. Pin the path, with pg_catalog first;
  -- the schema CREATE revocation above prevents clients shadowing this operator.
  FOR target IN
    SELECT p.oid::regprocedure FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'match_knowledge' AND p.prokind = 'f'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, public, pg_temp', target);
  END LOOP;
END;
$hardening$;
