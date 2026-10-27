/**
 * RALION RETAIL — CATALOGUE, SUPPLIER, TAX & PACKAGING INTEGRATION TESTS
 *
 * Runs against a REAL disposable PostgreSQL daemon (embedded-postgres):
 *   core migration -> POS security hardening -> [legacy seed] -> catalogue/packaging migration
 *
 *  1. Safe, idempotent backfill from legacy category/subcategory/brand/supplier/vat columns
 *  2. RLS + privileges: new tables and privileged RPCs are service_role only
 *  3. Tenant isolation (cross-workspace references rejected, search never leaks)
 *  4. Unified search: name/SKU/barcode/brand/supplier/department/subdepartment/pack label/pack barcode,
 *     multi-token, wildcard escaping, filters, stock filter, NO cost columns
 *  5. Barcode uniqueness across products + packs, incl. concurrent inserts
 *  6. Packaging: PO in cartons, partial receipts, base-unit conversion, no double count,
 *     over-receipt guard, receipt retry safety, sale (carton + singles), refund, decimals
 *  7. Aggregate-stock oversell guard, server-authoritative pack size, invalid/inactive packs
 *  8. Conversion-factor lock for historical lines (deactivate + create new instead)
 *  9. Quotation conversion with packs
 * 10. Concurrency: simultaneous sales / receipts through independent connections
 * 11. Preferred supplier switching and uniqueness
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const { Client } = require('pg');
const EmbeddedPostgres = require('embedded-postgres');

const green = (m) => `\x1b[32m${m}\x1b[0m`;
const red = (m) => `\x1b[31m${m}\x1b[0m`;
const cyan = (m) => `\x1b[36m${m}\x1b[0m`;

const DB_USER = 'postgres';
const DB_PASSWORD = 'isolated_catalogue_validation_pw';
const DB_NAME = 'postgres';
const DB_DIR = path.resolve(__dirname, `../.isolated-pgdata-catalogue-${Date.now()}`);

const ORG_A = 'd3b07384-d113-4c91-9c1e-9a1f2b3c4d5e';
const WS_A = 'e4c18495-e224-5d02-ad2f-0b2a3c4d5e6f';
const ORG_B = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const WS_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CASHIER = '11111111-1111-1111-1111-111111111111';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function main() {
  console.log(cyan('=== RALION RETAIL: CATALOGUE / SUPPLIER / TAX / PACKAGING INTEGRATION ==='));
  try { fs.rmSync(DB_DIR, { recursive: true, force: true }); } catch (_) {}

  const port = await getFreePort();
  const conn = `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${port}/${DB_NAME}`;
  const Pg = EmbeddedPostgres.default || EmbeddedPostgres;
  const pg = new Pg({ databaseDir: DB_DIR, port, user: DB_USER, password: DB_PASSWORD, initialDatabase: DB_NAME, persistent: false });
  await pg.initialise();
  await pg.start();

  const db = new Client({ connectionString: conn });
  await db.connect();

  let pass = 0;
  let total = 0;
  const assert = (cond, desc) => {
    total++;
    if (!cond) { console.error(red(`  ✗ FAIL: ${desc}`)); throw new Error(`Assertion failed: ${desc}`); }
    pass++;
    console.log(`  ${green('✓')} ${desc}`);
  };
  const rejects = async (fn, pattern, desc) => {
    let msg = null;
    try { await fn(); } catch (e) { msg = e.message; }
    assert(msg !== null && pattern.test(msg), `${desc} (got: ${msg ? msg.slice(0, 90) : 'NO ERROR'})`);
  };
  const q = (sql, args) => db.query(sql, args);
  const one = async (sql, args) => (await q(sql, args)).rows[0];
  const scalar = async (sql, args) => Object.values((await one(sql, args)) || {})[0];

  try {
    // ---------------------------------------------------------------- setup
    await q(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
      END $$;
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS public.organizations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, slug TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS public.workspaces (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, name TEXT NOT NULL, slug TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS public.workspace_members (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE, user_id UUID NOT NULL, role TEXT NOT NULL DEFAULT 'member', created_at TIMESTAMPTZ DEFAULT NOW());
    `);
    await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'cashier@example.test')`, [CASHIER]);
    for (const [o, w, n] of [[ORG_A, WS_A, 'a'], [ORG_B, WS_B, 'b']]) {
      await q(`INSERT INTO public.organizations (id, name, slug) VALUES ($1, $2, $3)`, [o, `Org ${n}`, `org-${n}`]);
      await q(`INSERT INTO public.workspaces (id, organization_id, name, slug) VALUES ($1, $2, $3, $4)`, [w, o, `WS ${n}`, `ws-${n}`]);
    }

    const mig = (f) => fs.readFileSync(path.resolve(__dirname, `../packages/database/migrations/${f}`), 'utf8');
    await q(mig('20261020000000_ralion_retail_core.sql'));
    await q(mig('20261025000000_retail_pos_security_hardening.sql'));
    for (const [o, w] of [[ORG_A, WS_A], [ORG_B, WS_B]]) {
      await q(`INSERT INTO public.tenant_module_entitlements (organization_id, workspace_id, module_key, status) VALUES ($1,$2,'retail','ACTIVE')`, [o, w]);
    }

    // --------------------------------------------------- legacy seed (pre-migration)
    console.log('\n[1] Backfill from legacy columns');
    const SUP1 = '51111111-0000-0000-0000-000000000001';
    const SUP2 = '51111111-0000-0000-0000-000000000002';
    const SUP_B = '51111111-0000-0000-0000-0000000000bb';
    await q(`INSERT INTO public.retail_suppliers (id, organization_id, workspace_id, name) VALUES
      ($1,$3,$4,'Bosch Distribution'), ($2,$3,$4,'Local Hardware Wholesale'), ($5,$6,$7,'Rival Supplies')`,
      [SUP1, SUP2, ORG_A, WS_A, SUP_B, ORG_B, WS_B]);

    const P_DRILL = '61111111-0000-0000-0000-000000000001';
    const P_NAIL = '61111111-0000-0000-0000-000000000002';
    const P_COLA = '61111111-0000-0000-0000-000000000003';
    const P_B = '61111111-0000-0000-0000-0000000000bb';
    await q(`INSERT INTO public.retail_products (id, organization_id, workspace_id, name, sku, barcode, category, subcategory, brand, supplier_id, unit_of_measure, purchase_cost, selling_price, vat_rate) VALUES
      ($1,$5,$6,'Cordless Drill 18V','DRL-18V','6001001001001','Power Tools','Drills','Bosch',$7,'EACH',80.00,129.99,15.00),
      ($2,$5,$6,'Galvanised Nails 50mm','NAIL-50','6001001001002','Fasteners & Fixings','Nails','  Acme ',$8,'KILOGRAM',1.50,3.20,0.00),
      ($3,$5,$6,'Cola 330ml Can','COLA-330','6001001001003','power tools','','bosch',NULL,'EACH',0.50,1.20,15.00),
      ($4,$9,$10,'Rival Drill','DRL-B','6001001001001','Power Tools',NULL,'Bosch',$11,'EACH',1.00,2.00,15.00)`,
      [P_DRILL, P_NAIL, P_COLA, P_B, ORG_A, WS_A, SUP1, SUP2, ORG_B, WS_B, SUP_B]);
    // NB: P_B reuses P_DRILL's barcode in ANOTHER workspace (legal), and Cola mixes category case.

    const snapshot = await q(`SELECT id, category, subcategory, brand, supplier_id, vat_rate::text FROM public.retail_products ORDER BY id`);
    const catalogueSql = mig('20261027000000_retail_catalogue_packaging.sql');
    await q(catalogueSql);
    await q(catalogueSql); // idempotent re-run
    assert(true, 'Catalogue migration applied twice without error (idempotent)');

    const after = await q(`SELECT id, category, subcategory, brand, supplier_id, vat_rate::text FROM public.retail_products ORDER BY id`);
    assert(JSON.stringify(snapshot.rows) === JSON.stringify(after.rows), 'Legacy category/subcategory/brand/supplier/vat columns untouched by backfill');
    assert(await scalar(`SELECT count(*)::int FROM public.retail_departments WHERE workspace_id=$1`, [WS_A]) === 2,
      'Departments backfilled and case-variant categories merged (Power Tools / power tools)');
    assert(await scalar(`SELECT count(*)::int FROM public.retail_subdepartments WHERE workspace_id=$1`, [WS_A]) === 2,
      'Subdepartments backfilled; blank subcategory ignored');
    assert(await scalar(`SELECT count(*)::int FROM public.retail_brands WHERE workspace_id=$1`, [WS_A]) === 2,
      'Brands backfilled, trimmed and case-merged (Bosch/bosch, Acme)');
    assert(await scalar(`SELECT count(*)::int FROM public.retail_tax_codes WHERE workspace_id=$1`, [WS_A]) === 2,
      'Tax codes backfilled per distinct VAT rate');
    assert(await scalar(`SELECT count(*)::int FROM public.retail_products WHERE workspace_id=$1 AND (department_id IS NULL OR brand_id IS NULL OR tax_code_id IS NULL)`, [WS_A]) === 0,
      'All workspace products linked to department, brand and tax code');
    const drill = await one(`SELECT department_id, subdepartment_id FROM public.retail_products WHERE id=$1`, [P_DRILL]);
    const sdDept = await scalar(`SELECT department_id FROM public.retail_subdepartments WHERE id=$1`, [drill.subdepartment_id]);
    assert(sdDept === drill.department_id, 'Subdepartment belongs to the product department');
    assert(await scalar(`SELECT count(*)::int FROM public.retail_product_suppliers WHERE workspace_id=$1 AND is_preferred`, [WS_A]) === 2,
      'Existing supplier_id became the preferred supplier relationship');
    const counts1 = await scalar(`SELECT (SELECT count(*) FROM retail_departments)+(SELECT count(*) FROM retail_subdepartments)+(SELECT count(*) FROM retail_brands)+(SELECT count(*) FROM retail_tax_codes)+(SELECT count(*) FROM retail_product_suppliers)`);
    await q(catalogueSql);
    assert(await scalar(`SELECT (SELECT count(*) FROM retail_departments)+(SELECT count(*) FROM retail_subdepartments)+(SELECT count(*) FROM retail_brands)+(SELECT count(*) FROM retail_tax_codes)+(SELECT count(*) FROM retail_product_suppliers)`) === counts1,
      'Third run creates no duplicate catalogue rows');

    // -------------------------------------------------------------- security
    console.log('\n[2] RLS and privileges');
    const newTables = ['retail_tax_codes', 'retail_departments', 'retail_subdepartments', 'retail_brands', 'retail_product_suppliers', 'retail_product_packages', 'retail_goods_receipt_items'];
    for (const t of newTables) {
      assert(await scalar(`SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=$1`, [t]) === true, `RLS enabled on ${t}`);
      for (const role of ['anon', 'authenticated']) {
        assert(await scalar(`SELECT has_table_privilege($1, 'public.${t}', 'SELECT')`, [role]) === false, `${role} has no SELECT on ${t}`);
      }
      assert(await scalar(`SELECT has_table_privilege('service_role', 'public.${t}', 'SELECT')`) === true, `service_role can access ${t}`);
    }
    const rpcs = [
      'public.retail_search_catalogue(uuid,text,uuid,uuid,uuid,uuid,boolean,integer,text)',
      'public.retail_set_preferred_supplier(uuid,uuid,uuid)',
      'public.execute_atomic_goods_receipt(uuid,uuid,uuid,text,uuid,text,jsonb)',
      'public.execute_atomic_quotation_conversion(uuid,uuid,uuid,uuid,text,text,uuid,text)',
      'public.execute_atomic_sale_refund(uuid,uuid,uuid,text,boolean,uuid)',
    ];
    for (const fn of rpcs) {
      for (const role of ['anon', 'authenticated']) {
        assert(await scalar(`SELECT has_function_privilege($1, $2, 'EXECUTE')`, [role, fn]) === false, `${role} cannot EXECUTE ${fn.split('(')[0]}`);
      }
      assert(await scalar(`SELECT has_function_privilege('service_role', $1, 'EXECUTE')`, [fn]) === true, `service_role can EXECUTE ${fn.split('(')[0]}`);
    }
    const saleSigPriv = await q(`
      SELECT bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE')) AS a,
             bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')) AS n,
             bool_and(has_function_privilege('service_role', p.oid, 'EXECUTE')) AS s,
             count(*)::int AS c
      FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
      WHERE ns.nspname='public' AND p.proname='execute_atomic_retail_sale'`);
    assert(saleSigPriv.rows[0].c === 1 && !saleSigPriv.rows[0].a && !saleSigPriv.rows[0].n && saleSigPriv.rows[0].s,
      'execute_atomic_retail_sale: single overload, service_role only');
    await q('SET ROLE authenticated');
    await rejects(() => q(`SELECT * FROM public.retail_search_catalogue($1, 'drill')`, [WS_A]), /permission denied/i, 'authenticated role real call to search RPC is denied');
    await q('RESET ROLE');
    await q('SET ROLE anon');
    await rejects(() => q(`SELECT * FROM public.retail_product_packages`), /permission denied/i, 'anon role real SELECT on packages is denied');
    await q('RESET ROLE');

    // -------------------------------------------------------- tenant isolation
    console.log('\n[3] Tenant isolation');
    const deptB = await scalar(`INSERT INTO public.retail_departments (organization_id, workspace_id, name) VALUES ($1,$2,'B Dept') RETURNING id`, [ORG_B, WS_B]);
    await rejects(() => q(`UPDATE public.retail_products SET department_id=$1 WHERE id=$2`, [deptB, P_DRILL]), /CROSS_TENANT_REFERENCE/, 'Product cannot reference another workspace department');
    await rejects(() => q(`INSERT INTO public.retail_product_suppliers (organization_id, workspace_id, product_id, supplier_id) VALUES ($1,$2,$3,$4)`, [ORG_A, WS_A, P_NAIL, SUP_B]), /CROSS_TENANT_REFERENCE/, 'Product cannot link another workspace supplier');
    await rejects(() => q(`INSERT INTO public.retail_product_packages (organization_id, workspace_id, product_id, label, base_units_per_pack) VALUES ($1,$2,$3,'Box 6',6)`, [ORG_B, WS_B, P_DRILL]), /CROSS_TENANT_REFERENCE/, 'Package cannot attach to another workspace product');
    await rejects(() => q(`INSERT INTO public.retail_tax_codes (organization_id, workspace_id, code, name, rate) VALUES ($1,$2,'X','X',150)`, [ORG_A, WS_A]), /check|violates/i, 'Tax rate above 100% rejected');

    // Packs for search
    const PK_DRILL_BOX = '71111111-0000-0000-0000-000000000001';
    const PK_COLA_CARTON = '71111111-0000-0000-0000-000000000002';
    const PK_COLA_SIX = '71111111-0000-0000-0000-000000000003';
    await q(`INSERT INTO public.retail_product_packages (id, organization_id, workspace_id, product_id, label, kind, base_units_per_pack, barcode, selling_price, purchase_cost) VALUES
      ($1,$3,$4,$5,'Carton of 12','BOTH',12,'6009990000012',13.20,5.00),
      ($2,$3,$4,$5,'Six-pack','SALES',6,'6009990000006',NULL,NULL)`, [PK_COLA_CARTON, PK_COLA_SIX, ORG_A, WS_A, P_COLA]);
    await q(`INSERT INTO public.retail_product_packages (id, organization_id, workspace_id, product_id, label, kind, base_units_per_pack) VALUES ($1,$2,$3,$4,'Purchase case 24','PURCHASE',24)`, [PK_DRILL_BOX, ORG_A, WS_A, P_NAIL]);
    await q(`INSERT INTO public.retail_stock_levels (organization_id, workspace_id, product_id, quantity_on_hand) VALUES ($1,$2,$3,5), ($1,$2,$4,0), ($1,$2,$5,120)`, [ORG_A, WS_A, P_DRILL, P_NAIL, P_COLA]);

    // ------------------------------------------------------------------ search
    console.log('\n[4] Unified catalogue search');
    const search = async (query, opts = {}) => (await q(
      `SELECT * FROM public.retail_search_catalogue($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [opts.ws || WS_A, query, opts.dept || null, opts.sub || null, opts.brand || null, opts.sup || null, opts.inStock || false, opts.limit || 40, opts.channel || 'SALES'])).rows;
    const ids = (rows) => rows.map((r) => r.product_id);

    assert(ids(await search('drill')).includes(P_DRILL), 'Search by product name');
    assert(ids(await search('drl-18v')).includes(P_DRILL), 'Search by SKU (case-insensitive)');
    const bc = await search('6001001001001');
    assert(bc.length === 1 && bc[0].product_id === P_DRILL && bc[0].match_rank === 0, 'Barcode search is exact-ranked and workspace-isolated (other tenant shares barcode)');
    assert(ids(await search('acme')).includes(P_NAIL), 'Search by brand (trimmed legacy value)');
    assert(ids(await search('bosch')).includes(P_DRILL) && ids(await search('bosch')).includes(P_COLA), 'Search by brand/supplier matches normalised brand and supplier name');
    assert(ids(await search('wholesale')).join() === P_NAIL, 'Search by supplier name');
    assert(ids(await search('fasteners')).includes(P_NAIL), 'Search by department');
    assert(ids(await search('drills')).includes(P_DRILL), 'Search by subdepartment');
    const pk = await search('Carton of 12');
    assert(pk.length === 1 && pk[0].product_id === P_COLA, 'Search by pack label');
    const pkb = await search('6009990000012');
    assert(pkb.length === 1 && pkb[0].matched_pack_id === PK_COLA_CARTON && pkb[0].match_rank === 0, 'Pack barcode resolves to the pack');
    assert(ids(await search('cordless bosch')).join() === P_DRILL, 'Multi-token search (name + brand) requires every token');
    assert((await search('%')).length === 0, 'LIKE wildcard % is escaped, not a match-all');
    assert((await search('_')).length === 0, 'LIKE wildcard _ is escaped');
    assert((await search("x' OR 1=1 --")).length === 0, 'SQL metacharacters are inert');
    assert((await search('', {})).length === 3, 'Empty query lists catalogue (3 workspace products, no cross-tenant leak)');
    assert(!ids(await search('drill', { ws: WS_A })).includes(P_B) && ids(await search('drill', { ws: WS_B })).join() === P_B, 'Search is workspace scoped both ways');
    const deptA = await scalar(`SELECT department_id FROM public.retail_products WHERE id=$1`, [P_NAIL]);
    assert(ids(await search('', { dept: deptA })).join() === P_NAIL, 'Department filter');
    assert(ids(await search('', { sup: SUP2 })).join() === P_NAIL, 'Supplier filter');
    assert(ids(await search('', { inStock: true })).sort().join() === [P_DRILL, P_COLA].sort().join(), 'In-stock-only filter');
    const cols = Object.keys((await search('drill'))[0]);
    assert(!cols.some((c) => /cost|margin|purchase/i.test(c)), 'Search result projection exposes NO cost columns');
    const colaRow = (await search('cola'))[0];
    const colaPacks = colaRow.packs;
    assert(colaPacks.length === 2 && colaPacks.every((p) => p.selling_price !== null), 'Sales packs returned with resolved prices');
    assert(Number(colaPacks.find((p) => p.label === 'Six-pack').selling_price) === 7.2, 'Pack price defaults to base price x factor (1.20 x 6 = 7.20)');
    assert(!JSON.stringify(colaRow).includes('"purchase_cost"'), 'Pack JSON contains no purchase_cost');
    assert((await search('purchase case')).length === 0, 'PURCHASE-only pack is not offered on the sales side');
    const purch = await search('purchase case', { channel: 'PURCHASE' });
    assert(purch.length === 1 && purch[0].product_id === P_NAIL && purch[0].packs.length === 1, 'PURCHASE channel finds purchase-only packs (purchasing picker)');
    assert((await search('', { limit: 1 })).length === 1, 'Limit honoured');

    // ------------------------------------------------------------------ barcodes
    console.log('\n[5] Barcode uniqueness');
    await rejects(() => q(`INSERT INTO public.retail_products (organization_id, workspace_id, name, sku, barcode, category) VALUES ($1,$2,'Dup','DUP-1','6001001001001','X')`, [ORG_A, WS_A]), /DUPLICATE_BARCODE/, 'Duplicate product barcode rejected');
    await rejects(() => q(`INSERT INTO public.retail_products (organization_id, workspace_id, name, sku, barcode, category) VALUES ($1,$2,'Dup2','DUP-2','6009990000012','X')`, [ORG_A, WS_A]), /DUPLICATE_BARCODE/, 'Product barcode colliding with a pack barcode rejected');
    await rejects(() => q(`INSERT INTO public.retail_product_packages (organization_id, workspace_id, product_id, label, base_units_per_pack, barcode) VALUES ($1,$2,$3,'Dup pack',2,'6001001001002')`, [ORG_A, WS_A, P_COLA]), /DUPLICATE_BARCODE/, 'Pack barcode colliding with a product barcode rejected');
    await q(`INSERT INTO public.retail_products (organization_id, workspace_id, name, sku, barcode, category) VALUES ($1,$2,'Other tenant same code','OT-1','6009990000012','X')`, [ORG_B, WS_B]);
    assert(true, 'Same barcode in a different workspace is allowed');
    await q(`INSERT INTO public.retail_products (organization_id, workspace_id, name, sku, barcode, category) VALUES ($1,$2,'Blank','BLK-1','   ','X')`, [ORG_A, WS_A]);
    await q(`INSERT INTO public.retail_products (organization_id, workspace_id, name, sku, barcode, category) VALUES ($1,$2,'Blank2','BLK-2','','X')`, [ORG_A, WS_A]);
    assert(await scalar(`SELECT count(*)::int FROM public.retail_products WHERE sku IN ('BLK-1','BLK-2') AND barcode IS NULL`) === 2, 'Blank barcodes normalise to NULL (many allowed)');
    const c1 = new Client({ connectionString: conn });
    const c2 = new Client({ connectionString: conn });
    await c1.connect(); await c2.connect();
    const ins = (c, sku) => c.query(`INSERT INTO public.retail_products (organization_id, workspace_id, name, sku, barcode, category) VALUES ($1,$2,$3,$3,'RACE-BARCODE-1','X')`, [ORG_A, WS_A, sku]);
    const race = await Promise.allSettled([ins(c1, 'RACE-A'), ins(c2, 'RACE-B')]);
    assert(race.filter((r) => r.status === 'fulfilled').length === 1 && race.filter((r) => r.status === 'rejected').length === 1, 'Concurrent inserts of one barcode: exactly one wins');

    // ---------------------------------------------------------------- packaging
    console.log('\n[6] Packaging: PO in cartons, partial receipts, sales, refunds');
    const P_WATER = '62222222-0000-0000-0000-000000000001';
    await q(`INSERT INTO public.retail_products (id, organization_id, workspace_id, name, sku, barcode, category, unit_of_measure, purchase_cost, selling_price)
             VALUES ($1,$2,$3,'Spring Water 500ml','WATER-500','6007770000001','Beverages','EACH',0.40,1.00)`, [P_WATER, ORG_A, WS_A]);
    assert(await scalar(`SELECT count(*)::int FROM public.retail_stock_levels WHERE product_id=$1`, [P_WATER]) === 0, 'Creating a product adds NO inventory');
    const PK_WATER_CARTON = '72222222-0000-0000-0000-000000000001';
    await q(`INSERT INTO public.retail_product_packages (id, organization_id, workspace_id, product_id, label, kind, base_units_per_pack, barcode, selling_price, purchase_cost)
             VALUES ($1,$2,$3,$4,'Carton x12','BOTH',12,'6007770000012',10.00,4.80)`, [PK_WATER_CARTON, ORG_A, WS_A, P_WATER]);

    const PO = '82222222-0000-0000-0000-000000000001';
    const POI = '83333333-0000-0000-0000-000000000001';
    await q(`INSERT INTO public.retail_purchase_orders (id, organization_id, workspace_id, po_number, supplier_id, status, total_amount) VALUES ($1,$2,$3,'PO-PK-1',$4,'SUBMITTED',48)`, [PO, ORG_A, WS_A, SUP1]);
    await q(`INSERT INTO public.retail_po_items (id, purchase_order_id, product_id, quantity_ordered, unit_cost, line_total, package_id, pack_label, pack_size)
             VALUES ($1,$2,$3,10,4.80,48.00,$4,'Carton x12',12)`, [POI, PO, P_WATER, PK_WATER_CARTON]);
    assert(await scalar(`SELECT count(*)::int FROM public.retail_stock_levels WHERE product_id=$1`, [P_WATER]) === 0, 'Raising a PO adds NO inventory');

    const receive = (client, num, qty, extra = {}) => client.query(
      `SELECT public.execute_atomic_goods_receipt($1,$2,$3,$4,$5,NULL,$6::jsonb) AS r`,
      [ORG_A, WS_A, PO, num, CASHIER, JSON.stringify([{ product_id: P_WATER, po_item_id: POI, quantity_received: qty, ...extra }])]);
    const stockOf = async (pid) => Number(await scalar(`SELECT COALESCE(sum(quantity_on_hand),0)::float8 FROM public.retail_stock_levels WHERE product_id=$1`, [pid]));

    await receive(db, 'GRN-1', 4);
    assert(await stockOf(P_WATER) === 48, 'Partial receipt: 4 cartons x12 = +48 base units');
    assert(await scalar(`SELECT status FROM public.retail_purchase_orders WHERE id=$1`, [PO]) === 'PARTIAL_RECEIVED', 'PO is PARTIAL_RECEIVED');
    await rejects(() => receive(db, 'GRN-1', 1), /duplicate key|unique/i, 'Re-submitting the same receipt number cannot double count');
    assert(await stockOf(P_WATER) === 48, 'Stock unchanged after rejected duplicate receipt (transaction rolled back)');
    await rejects(() => receive(db, 'GRN-X', 7), /OVER_RECEIPT/, 'Over-receipt beyond ordered quantity rejected');
    await rejects(() => receive(db, 'GRN-X2', 1, { quantity_received: 0 }), /EMPTY_RECEIPT/, 'Receipt with no positive quantity rejected');
    await receive(db, 'GRN-2', 6, { unit_cost: 5.04 });
    assert(await stockOf(P_WATER) === 120, '10 cartons x12 = +120 base units in total');
    assert(await scalar(`SELECT status FROM public.retail_purchase_orders WHERE id=$1`, [PO]) === 'RECEIVED', 'PO is RECEIVED once complete');
    assert(await scalar(`SELECT count(*)::int FROM public.retail_goods_receipt_items WHERE po_item_id=$1`, [POI]) === 2, 'Each receipt line is ledgered');
    assert(Number(await scalar(`SELECT sum(base_quantity)::float8 FROM public.retail_goods_receipt_items WHERE po_item_id=$1`, [POI])) === 120, 'Receipt ledger totals 120 base units');
    const mv = await one(`SELECT quantity_change::float8 q, unit_cost::float8 c FROM public.retail_stock_movements WHERE product_id=$1 AND reference_id='PO-PK-1' ORDER BY created_at DESC, id LIMIT 1`, [P_WATER]);
    assert(mv.q === 72 && mv.c === 0.42, 'Movement ledger stores base-unit quantity and per-base-unit cost (5.04/12 = 0.42)');
    await rejects(() => receive(db, 'GRN-3', 1), /INVALID_PO_STATUS/, 'Cannot receive against a fully RECEIVED PO');

    const sale = (client, num, items, key = null) => client.query(
      `SELECT public.execute_atomic_retail_sale($1,$2,$3,NULL,'POS',NULL,'Walk-in',$4,'Cashier',NULL,'USD',0,0,0,0,0,'CASH','PAID',$5,NULL,$6::jsonb,'[]'::jsonb,false) AS r`,
      [ORG_A, WS_A, num, CASHIER, key, JSON.stringify(items)]);
    const line = (extra) => ({ product_id: P_WATER, product_name: 'Spring Water 500ml', sku: 'WATER-500', unit_price: 1, unit_cost: 0.4, tax_rate: 0, discount_rate: 0, line_total: 0, line_cost: 0, ...extra });

    const s1 = (await sale(db, 'SALE-PK-1', [line({ quantity: 1, package_id: PK_WATER_CARTON, unit_price: 10, line_total: 10 }), line({ quantity: 3, line_total: 3 })])).rows[0].r;
    assert(await stockOf(P_WATER) === 105, 'Sell 1 carton + 3 singles = -15, 105 remain');
    const sold = (await q(`SELECT quantity::float8 q, base_quantity::float8 b, pack_label, pack_size::float8 ps FROM public.retail_sale_items WHERE sale_id=$1 ORDER BY base_quantity DESC`, [s1.sale_id])).rows;
    assert(sold[0].q === 1 && sold[0].b === 12 && sold[0].pack_label === 'Carton x12' && sold[0].ps === 12 && sold[1].q === 3 && sold[1].b === 3, 'Sale lines keep pack quantity AND base quantity for history');
    const moves = (await q(`SELECT quantity_change::float8 q FROM public.retail_stock_movements WHERE reference_id='SALE-PK-1' ORDER BY quantity_change`)).rows.map((r) => r.q);
    assert(moves.join() === '-12,-3', 'Stock movements ledger: -12 and -3');

    await sale(db, 'SALE-PK-IDEM', [line({ quantity: 1, package_id: PK_WATER_CARTON })], 'idem-1');
    await sale(db, 'SALE-PK-IDEM-2', [line({ quantity: 1, package_id: PK_WATER_CARTON })], 'idem-1');
    assert(await stockOf(P_WATER) === 93, 'Idempotent replay does not double deduct (105 - 12 once)');

    const s2 = (await sale(db, 'SALE-PK-SPOOF', [line({ quantity: 1, package_id: PK_WATER_CARTON, base_quantity: 1, pack_size: 1 })])).rows[0].r;
    assert(await stockOf(P_WATER) === 81 && Number(await scalar(`SELECT base_quantity::float8 FROM public.retail_sale_items WHERE sale_id=$1`, [s2.sale_id])) === 12,
      'Client-supplied base_quantity/pack_size are ignored; server resolves 12');

    await q(`DELETE FROM public.retail_stock_levels WHERE product_id=$1`, [P_WATER]);
    await q(`INSERT INTO public.retail_stock_levels (organization_id, workspace_id, product_id, quantity_on_hand) VALUES ($1,$2,$3,20)`, [ORG_A, WS_A, P_WATER]);
    await rejects(() => sale(db, 'SALE-PK-AGG', [line({ quantity: 1, package_id: PK_WATER_CARTON }), line({ quantity: 12 })]), /INSUFFICIENT_STOCK/, 'Aggregate demand (carton + singles = 24 > 20) is rejected even though each line alone fits');
    assert(await stockOf(P_WATER) === 20 && await scalar(`SELECT count(*)::int FROM public.retail_sales WHERE sale_number='SALE-PK-AGG'`) === 0, 'Rejected sale leaves no stock change and no sale row');

    const s3 = (await sale(db, 'SALE-PK-REF', [line({ quantity: 1, package_id: PK_WATER_CARTON }), line({ quantity: 2 })])).rows[0].r;
    assert(await stockOf(P_WATER) === 6, 'Setup for refund: 20 - 12 - 2 = 6');
    await q(`SELECT public.execute_atomic_sale_refund($1,$2,$3,'test',true,$4)`, [ORG_A, WS_A, s3.sale_id, CASHIER]);
    assert(await stockOf(P_WATER) === 20, 'Refund restocks BASE units (+14), not pack counts');
    await rejects(() => q(`SELECT public.execute_atomic_sale_refund($1,$2,$3,'again',true,$4)`, [ORG_A, WS_A, s3.sale_id, CASHIER]), /SALE_ALREADY_REFUNDED/, 'Second refund cannot restock twice');
    assert(await stockOf(P_WATER) === 20, 'No double restock');

    // ------------------------------------------------------------ pack validation
    console.log('\n[7] Pack validation and decimals');
    await rejects(() => sale(db, 'SALE-BAD-PK', [line({ quantity: 1, package_id: PK_COLA_CARTON })]), /INVALID_PACKAGE/, "Another product's pack is rejected");
    await q(`UPDATE public.retail_product_packages SET is_active=false WHERE id=$1`, [PK_COLA_SIX]);
    await rejects(() => sale(db, 'SALE-INACT', [{ ...line({ product_id: P_COLA, quantity: 1, package_id: PK_COLA_SIX }) }]), /INVALID_PACKAGE/, 'Inactive pack cannot be sold');
    const PK_PURCH = '71111111-0000-0000-0000-0000000000aa';
    await q(`INSERT INTO public.retail_product_packages (id, organization_id, workspace_id, product_id, label, kind, base_units_per_pack) VALUES ($1,$2,$3,$4,'Purchase only 24','PURCHASE',24)`, [PK_PURCH, ORG_A, WS_A, P_WATER]);
    await rejects(() => sale(db, 'SALE-PURCH', [line({ quantity: 1, package_id: PK_PURCH })]), /INVALID_PACKAGE/, 'PURCHASE-only pack cannot be sold');
    await rejects(() => sale(db, 'SALE-ZERO', [line({ quantity: 0 })]), /INVALID_QUANTITY/, 'Zero quantity rejected');
    const PK_HALF = '71111111-0000-0000-0000-0000000000bb';
    const PK_EIGHTH = '71111111-0000-0000-0000-0000000000cc';
    await q(`INSERT INTO public.retail_product_packages (id, organization_id, workspace_id, product_id, label, kind, base_units_per_pack) VALUES ($1,$3,$4,$5,'Half pack','SALES',0.5), ($2,$3,$4,$5,'Eighth pack','SALES',0.125)`, [PK_HALF, PK_EIGHTH, ORG_A, WS_A, P_WATER]);
    await sale(db, 'SALE-HALF', [line({ quantity: 3, package_id: PK_HALF })]);
    assert(await stockOf(P_WATER) === 18.5, 'Decimal pack 3 x 0.5 = 1.5 base units exact (20 -> 18.5)');
    await rejects(() => sale(db, 'SALE-EIGHTH', [line({ quantity: 1, package_id: PK_EIGHTH })]), /BASE_QUANTITY_PRECISION/, 'Conversion that cannot be stored exactly (0.125) is rejected, never silently rounded');
    assert(await stockOf(P_WATER) === 18.5, 'Precision rejection leaves stock unchanged');
    await rejects(() => q(`INSERT INTO public.retail_product_packages (organization_id, workspace_id, product_id, label, base_units_per_pack) VALUES ($1,$2,$3,'Zero',0)`, [ORG_A, WS_A, P_WATER]), /check|violates/i, 'Zero conversion factor rejected');

    // ------------------------------------------------------- conversion lock
    console.log('\n[8] Conversion-factor safeguards');
    await rejects(() => q(`UPDATE public.retail_product_packages SET base_units_per_pack=24 WHERE id=$1`, [PK_WATER_CARTON]), /PACK_CONVERSION_LOCKED/, 'Changing the factor of a pack used by historical sales/POs is blocked');
    await q(`UPDATE public.retail_product_packages SET selling_price=10.50 WHERE id=$1`, [PK_WATER_CARTON]);
    assert(true, 'Non-conversion edits (price) remain allowed on a used pack');
    await q(`UPDATE public.retail_product_packages SET base_units_per_pack=3 WHERE id=$1`, [PK_PURCH]);
    assert(await scalar(`SELECT base_units_per_pack::float8 FROM public.retail_product_packages WHERE id=$1`, [PK_PURCH]) === 3, 'Factor of a never-used pack can still be corrected');
    await rejects(() => q(`UPDATE public.retail_product_packages SET product_id=$1 WHERE id=$2`, [P_COLA, PK_PURCH]), /PACK_PRODUCT_IMMUTABLE/, 'Pack cannot be moved to another product');
    await q(`UPDATE public.retail_product_packages SET is_active=false WHERE id=$1`, [PK_WATER_CARTON]);
    const PK_WATER_24 = '72222222-0000-0000-0000-000000000024';
    await q(`INSERT INTO public.retail_product_packages (id, organization_id, workspace_id, product_id, label, base_units_per_pack) VALUES ($1,$2,$3,$4,'Carton x24',24)`, [PK_WATER_24, ORG_A, WS_A, P_WATER]);
    assert(await scalar(`SELECT count(*)::int FROM public.retail_sale_items WHERE package_id=$1 AND pack_size=12`, [PK_WATER_CARTON]) >= 2, 'Historical lines keep their original pack size snapshot');
    await rejects(() => q(`DELETE FROM public.retail_product_packages WHERE id=$1`, [PK_WATER_CARTON]), /foreign key|violates/i, 'A used pack cannot be deleted');
    await q(`UPDATE public.retail_product_packages SET is_active=true WHERE id=$1`, [PK_WATER_CARTON]);

    // --------------------------------------------------------------- quotation
    console.log('\n[9] Quotation conversion with packs');
    await q(`DELETE FROM public.retail_stock_levels WHERE product_id=$1`, [P_WATER]);
    await q(`INSERT INTO public.retail_stock_levels (organization_id, workspace_id, product_id, quantity_on_hand) VALUES ($1,$2,$3,60)`, [ORG_A, WS_A, P_WATER]);
    const QT = '91111111-0000-0000-0000-000000000001';
    await q(`INSERT INTO public.retail_quotations (id, organization_id, workspace_id, quote_number, customer_name, subtotal, total_amount) VALUES ($1,$2,$3,'Q-PK-1','Contractor',21,21)`, [QT, ORG_A, WS_A]);
    await q(`INSERT INTO public.retail_quote_items (quotation_id, product_id, description, quantity, unit_price, unit_cost, line_total, package_id, pack_label, pack_size)
             VALUES ($1,$2,'Water cartons',2,10.50,4.80,21.00,$3,'Carton x12',12)`, [QT, P_WATER, PK_WATER_CARTON]);
    const conv = (await q(`SELECT public.execute_atomic_quotation_conversion($1,$2,$3,$4,'Cashier','CASH',NULL,'conv-1') AS r`, [ORG_A, WS_A, QT, CASHIER])).rows[0].r;
    assert(await stockOf(P_WATER) === 36, 'Quote of 2 cartons converts to a sale deducting 24 base units');
    assert(Number(await scalar(`SELECT base_quantity::float8 FROM public.retail_sale_items WHERE sale_id=$1`, [conv.sale_id])) === 24, 'Converted sale line records base quantity 24');
    await rejects(() => q(`SELECT public.execute_atomic_quotation_conversion($1,$2,$3,$4,'Cashier','CASH',NULL,'conv-2')`, [ORG_A, WS_A, QT, CASHIER]), /QUOTATION_ALREADY_CONVERTED/, 'A quote cannot convert twice');
    await rejects(() => q(`UPDATE public.retail_product_packages SET base_units_per_pack=6 WHERE id=$1`, [PK_WATER_CARTON]), /PACK_CONVERSION_LOCKED/, 'Quoted pack factor is frozen too');

    // ------------------------------------------------------------- concurrency
    console.log('\n[10] Concurrency (independent connections)');
    await q(`DELETE FROM public.retail_stock_levels WHERE product_id=$1`, [P_WATER]);
    await q(`INSERT INTO public.retail_stock_levels (organization_id, workspace_id, product_id, quantity_on_hand) VALUES ($1,$2,$3,12)`, [ORG_A, WS_A, P_WATER]);
    const sellCarton = (client, n) => sale(client, `SALE-RACE-${n}`, [line({ quantity: 1, package_id: PK_WATER_CARTON })], `race-${n}`);
    const r1 = await Promise.allSettled([sellCarton(c1, 1), sellCarton(c2, 2)]);
    assert(r1.filter((r) => r.status === 'fulfilled').length === 1, 'Two simultaneous carton sales on stock of 12: exactly one succeeds');
    assert(r1.find((r) => r.status === 'rejected').reason.message.includes('INSUFFICIENT_STOCK'), 'Loser fails with INSUFFICIENT_STOCK');
    assert(await stockOf(P_WATER) === 0, 'No oversell: stock exactly 0, not negative');

    const PO2 = '82222222-0000-0000-0000-000000000002';
    const POI2 = '83333333-0000-0000-0000-000000000002';
    await q(`INSERT INTO public.retail_purchase_orders (id, organization_id, workspace_id, po_number, supplier_id, status, total_amount) VALUES ($1,$2,$3,'PO-PK-2',$4,'SUBMITTED',24)`, [PO2, ORG_A, WS_A, SUP1]);
    await q(`INSERT INTO public.retail_po_items (id, purchase_order_id, product_id, quantity_ordered, unit_cost, line_total, package_id, pack_label, pack_size) VALUES ($1,$2,$3,5,4.80,24,$4,'Carton x12',12)`, [POI2, PO2, P_WATER, PK_WATER_CARTON]);
    const recv2 = (client, num) => client.query(`SELECT public.execute_atomic_goods_receipt($1,$2,$3,$4,$5,NULL,$6::jsonb)`,
      [ORG_A, WS_A, PO2, num, CASHIER, JSON.stringify([{ product_id: P_WATER, po_item_id: POI2, quantity_received: 5 }])]);
    const r2 = await Promise.allSettled([recv2(c1, 'GRN-R1'), recv2(c2, 'GRN-R2')]);
    assert(r2.filter((r) => r.status === 'fulfilled').length === 1, 'Two simultaneous full receipts of the same PO line: exactly one posts');
    assert(await stockOf(P_WATER) === 60, 'Stock increased once (5 x 12 = +60), no double count');
    assert(await scalar(`SELECT count(*)::int FROM public.retail_goods_receipts WHERE purchase_order_id=$1`, [PO2]) === 1, 'Only one goods receipt header persisted');
    await c1.end(); await c2.end();

    // ------------------------------------------------------- preferred supplier
    console.log('\n[11] Preferred supplier');
    await q(`INSERT INTO public.retail_product_suppliers (organization_id, workspace_id, product_id, supplier_id, supplier_sku, last_cost) VALUES ($1,$2,$3,$4,'BSH-DRL-18',79.00)`, [ORG_A, WS_A, P_DRILL, SUP2]);
    assert(await scalar(`SELECT count(*)::int FROM public.retail_product_suppliers WHERE product_id=$1`, [P_DRILL]) === 2, 'A product can have multiple suppliers with supplier SKU');
    await rejects(() => q(`UPDATE public.retail_product_suppliers SET is_preferred=true WHERE product_id=$1 AND supplier_id=$2`, [P_DRILL, SUP2]), /duplicate key|unique/i, 'Two preferred suppliers on one product are rejected');
    await q(`SELECT public.retail_set_preferred_supplier($1,$2,$3)`, [WS_A, P_DRILL, SUP2]);
    assert(await scalar(`SELECT supplier_id FROM public.retail_product_suppliers WHERE product_id=$1 AND is_preferred`, [P_DRILL]) === SUP2, 'Preferred supplier switched atomically');
    assert(await scalar(`SELECT supplier_id FROM public.retail_products WHERE id=$1`, [P_DRILL]) === SUP2, 'Legacy products.supplier_id kept in sync');
    assert(ids(await search('BSH-DRL-18')).join() === P_DRILL, 'Supplier SKU is searchable');
    await rejects(() => q(`SELECT public.retail_set_preferred_supplier($1,$2,$3)`, [WS_A, P_DRILL, SUP_B]), /PRODUCT_SUPPLIER_NOT_FOUND/, 'Cannot prefer an unlinked / foreign supplier');
    assert(ids(await search('', { ws: WS_A, sup: SUP_B })).length === 0, 'Foreign supplier filter returns nothing for this tenant');

    console.log(green(`\n✅ ALL ${pass}/${total} CATALOGUE & PACKAGING ASSERTIONS PASSED`));
  } catch (err) {
    console.error(red(`\n❌ FAILED after ${pass}/${total} assertions: ${err.message}`));
    process.exitCode = 1;
  } finally {
    try { await db.end(); } catch (_) {}
    try { await pg.stop(); } catch (_) {}
    try { fs.rmSync(DB_DIR, { recursive: true, force: true }); } catch (_) {}
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
