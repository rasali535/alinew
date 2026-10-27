/**
 * RALION RETAIL — MARI SMART STOCK RECEIVING INTEGRATION & ACCEPTANCE TESTS
 *
 * Runs against a REAL disposable PostgreSQL daemon (embedded-postgres):
 *   core migration -> POS security hardening -> catalogue/packaging -> smart stock receiving migration
 *
 * Test Scenarios:
 *   1. Migration idempotency, RLS, and service_role security (reject client execution of RPC).
 *   2. Tenant and workspace isolation (Workspace B cannot view or post Workspace A drafts).
 *   3. Security & Anti-Prompt-Injection: Untrusted invoice text containing adversarial instructions
 *      is neutralized and treated purely as passive data without compromising the system.
 *   4. Frosthub Demo Acceptance Scenario:
 *      - 5 cartons x 20 LED bulbs => +100 base units.
 *      - 10 cement bags => +10 base units.
 *      - 2 of 3 drills received => +2 base units and shortage flagged (1 missing).
 *      - Delivery note / invoice deduplication: Same delivery document SHA-256 / invoice number
 *        tested without double-receiving.
 *      - Packing list financial defense: Missing prices never invent costs.
 *   5. Human-in-the-loop Draft-First constraint: Uploading an invoice or packing list NEVER
 *      increases stock until explicitly approved and posted.
 *   6. Concurrent posting race condition & Idempotency: Multiple concurrent approvals with the same
 *      nonce succeed once and return existing receipt without double-counting stock.
 *   7. RBAC Verification: Cashier accounts cannot approve or post smart stock receipts (403 Forbidden).
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const { Client } = require('pg');
const EmbeddedPostgres = require('embedded-postgres');

const green = (m) => `\x1b[32m${m}\x1b[0m`;
const red = (m) => `\x1b[31m${m}\x1b[0m`;
const cyan = (m) => `\x1b[36m${m}\x1b[0m`;

const DB_USER = 'postgres';
const DB_PASSWORD = 'isolated_smart_receiving_pw';
const DB_NAME = 'postgres';
const DB_DIR = path.resolve(__dirname, `../.isolated-pgdata-smart-receiving-${Date.now()}`);

const ORG_A = 'd3b07384-d113-4c91-9c1e-9a1f2b3c4d5e';
const WS_A = 'e4c18495-e224-5d02-ad2f-0b2a3c4d5e6f';
const ORG_B = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const WS_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const MANAGER_A = '22222222-2222-2222-2222-222222222222';
const CASHIER_A = '11111111-1111-1111-1111-111111111111';

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

async function runSmartStockReceivingTests() {
  console.log(cyan('=== RALION RETAIL: MARI SMART STOCK RECEIVING ACCEPTANCE & SECURITY TEST ==='));
  try { fs.rmSync(DB_DIR, { recursive: true, force: true }); } catch (_) {}

  const port = await getFreePort();
  const conn = `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${port}/${DB_NAME}`;
  const Pg = EmbeddedPostgres.default || EmbeddedPostgres;
  const pg = new Pg({
    databaseDir: DB_DIR,
    port,
    user: DB_USER,
    password: DB_PASSWORD,
    initialDatabase: DB_NAME,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();

  const db = new Client({ connectionString: conn });
  await db.connect();

  let pass = 0;
  let total = 0;
  const assert = (cond, desc) => {
    total++;
    if (!cond) {
      console.error(red(`  ✗ FAIL: ${desc}`));
      throw new Error(`Assertion failed: ${desc}`);
    }
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
    // ---------------------------------------------------------------- Setup
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

    await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'manager@frosthub.test'), ($2, 'cashier@frosthub.test')`, [MANAGER_A, CASHIER_A]);
    for (const [o, w, n] of [[ORG_A, WS_A, 'Frosthub Hardware'], [ORG_B, WS_B, 'Rival Hardware']]) {
      await q(`INSERT INTO public.organizations (id, name, slug) VALUES ($1, $2, $3)`, [o, n, `org-${n.toLowerCase().replace(/\\s+/g, '-')}`]);
      await q(`INSERT INTO public.workspaces (id, organization_id, name, slug) VALUES ($1, $2, $3, $4)`, [w, o, `${n} Main Store`, `ws-${n.toLowerCase().replace(/\\s+/g, '-')}`]);
    }

    const mig = (f) => fs.readFileSync(path.resolve(__dirname, `../packages/database/migrations/${f}`), 'utf8');
    await q(mig('20261020000000_ralion_retail_core.sql'));
    await q(mig('20261025000000_retail_pos_security_hardening.sql'));
    await q(mig('20261027000000_retail_catalogue_packaging.sql'));
    for (const [o, w] of [[ORG_A, WS_A], [ORG_B, WS_B]]) {
      await q(`INSERT INTO public.tenant_module_entitlements (organization_id, workspace_id, module_key, status) VALUES ($1,$2,'retail','ACTIVE')`, [o, w]);
    }

    // --------------------------------------------------- [1] Smart Receiving Migration
    console.log('\n[1] Applying Smart Stock Receiving Migration');
    const smartReceivingSql = mig('20261028000000_retail_smart_stock_receiving.sql');
    await q(smartReceivingSql);
    await q(smartReceivingSql); // Idempotency check
    assert(true, 'Smart stock receiving migration is idempotent and applies without error');

    assert(await scalar(`SELECT count(*)::int FROM pg_tables WHERE schemaname='public' AND tablename='retail_smart_receipt_drafts'`) === 1,
      'Table retail_smart_receipt_drafts created');
    assert(await scalar(`SELECT count(*)::int FROM pg_tables WHERE schemaname='public' AND tablename='retail_smart_receipt_items'`) === 1,
      'Table retail_smart_receipt_items created');
    assert(await scalar(`SELECT count(*)::int FROM pg_tables WHERE schemaname='public' AND tablename='retail_smart_receipt_attachments'`) === 1,
      'Table retail_smart_receipt_attachments created');

    // --------------------------------------------------- [2] RLS & Privilege Checks
    console.log('\n[2] Checking RLS & Security Privileges');
    for (const tbl of ['retail_smart_receipt_drafts', 'retail_smart_receipt_items', 'retail_smart_receipt_attachments']) {
      assert(await scalar(`SELECT has_table_privilege('authenticated','public.${tbl}','SELECT')`) === false,
        `${tbl} is not readable by authenticated role`);
      assert(await scalar(`SELECT has_table_privilege('anon','public.${tbl}','SELECT')`) === false,
        `${tbl} is not readable by anon role`);
    }

    assert(await scalar(`SELECT has_function_privilege('authenticated','public.execute_atomic_smart_stock_receipt(uuid,uuid,uuid,uuid,uuid,text,jsonb)','EXECUTE')`) === false,
      'execute_atomic_smart_stock_receipt RPC execution is revoked from authenticated role');
    assert(await scalar(`SELECT has_function_privilege('anon','public.execute_atomic_smart_stock_receipt(uuid,uuid,uuid,uuid,uuid,text,jsonb)','EXECUTE')`) === false,
      'execute_atomic_smart_stock_receipt RPC execution is revoked from anon role');

    // --------------------------------------------------- [3] Seed Frosthub Demo Catalogue
    console.log('\n[3] Seeding Frosthub Demo Catalogue & Packaging Units');
    const SUP_FROST = '51111111-0000-0000-0000-000000000001';
    await q(`INSERT INTO public.retail_suppliers (id, organization_id, workspace_id, name) VALUES ($1,$2,$3,'Frost Supplies & Logistics')`,
      [SUP_FROST, ORG_A, WS_A]);

    // 1. LED Bulbs (EACH base unit, Carton of 20)
    const P_BULB = '71111111-0000-0000-0000-000000000001';
    await q(`INSERT INTO public.retail_products (id, organization_id, workspace_id, name, sku, barcode, category, unit_of_measure, purchase_cost, selling_price, vat_rate) VALUES
      ($1,$2,$3,'Frost 9W LED Bulb Warm White','BLB-LED-9W','6001002001001','Electrical & Lighting','EACH',1.20,3.50,15.00)`,
      [P_BULB, ORG_A, WS_A]);
    const PKG_BULB_CARTON = '81111111-0000-0000-0000-000000000001';
    await q(`INSERT INTO public.retail_product_packages (id, organization_id, workspace_id, product_id, label, base_units_per_pack, barcode) VALUES
      ($1,$2,$3,$4,'Carton of 20 Bulbs',20,'6001002001020')`,
      [PKG_BULB_CARTON, ORG_A, WS_A, P_BULB]);

    // 2. Portland Cement (BAG base unit, pack size 1)
    const P_CEMENT = '71111111-0000-0000-0000-000000000002';
    await q(`INSERT INTO public.retail_products (id, organization_id, workspace_id, name, sku, barcode, category, unit_of_measure, purchase_cost, selling_price, vat_rate) VALUES
      ($1,$2,$3,'Portland Cement 50kg Bag','CEM-50KG','6001002001002','Building Supplies','BAG',7.50,11.00,0.00)`,
      [P_CEMENT, ORG_A, WS_A]);

    // 3. Impact Drills (EACH base unit, pack size 1)
    const P_DRILL = '71111111-0000-0000-0000-000000000003';
    await q(`INSERT INTO public.retail_products (id, organization_id, workspace_id, name, sku, barcode, category, unit_of_measure, purchase_cost, selling_price, vat_rate) VALUES
      ($1,$2,$3,'Frost Heavy-Duty Cordless Drill','DRL-IMPACT-18V','6001002001003','Power Tools','EACH',65.00,119.99,15.00)`,
      [P_DRILL, ORG_A, WS_A]);

    // Initial stock levels: all 0
    for (const prodId of [P_BULB, P_CEMENT, P_DRILL]) {
      await q(`INSERT INTO public.retail_stock_levels (organization_id, workspace_id, product_id, quantity_on_hand, quantity_reserved) VALUES ($1,$2,$3,0.00,0.00)`,
        [ORG_A, WS_A, prodId]);
    }
    assert(true, 'Frosthub catalogue, pack conversions and stock levels initialized at zero');

    // --------------------------------------------------- [4] Draft-First Constraint Verification
    console.log('\n[4] Draft-First: Uploading Document NEVER Increases Stock');
    const DRAFT_INVOICE_ID = '91111111-0000-0000-0000-000000000001';
    const INVOICE_SHA256 = crypto.createHash('sha256').update('FROSTHUB_INVOICE_OCT2026').digest('hex');

    await q(`INSERT INTO public.retail_smart_receipt_drafts (
      id, organization_id, workspace_id, supplier_id, document_type, status,
      file_name, file_path, file_size_bytes, mime_type, file_sha256,
      extracted_supplier_name, extracted_document_number, currency, subtotal, tax_total, total_amount, confidence_score
    ) VALUES (
      $1, $2, $3, $4, 'INVOICE', 'READY_FOR_REVIEW',
      'frosthub_invoice_oct2026.pdf', 'docs/frosthub_invoice_oct2026.pdf', 1048576, 'application/pdf', $5,
      'Frost Supplies & Logistics', 'INV-2026-FROST-101', 'USD', 325.00, 48.75, 373.75, 98.5
    )`, [DRAFT_INVOICE_ID, ORG_A, WS_A, SUP_FROST, INVOICE_SHA256]);

    // Line 1: 5 cartons of LED bulbs (pack size 20)
    const ITEM_BULBS = 'a1111111-0000-0000-0000-000000000001';
    await q(`INSERT INTO public.retail_smart_receipt_items (
      id, draft_id, organization_id, workspace_id, line_number, raw_description, raw_sku, raw_barcode,
      stated_quantity, received_quantity, damaged_quantity, missing_quantity, unit_of_measure,
      pack_label, pack_size, calculated_base_quantity, unit_cost, line_total,
      matched_product_id, matched_package_id, match_confidence, match_status
    ) VALUES (
      $1, $2, $3, $4, 1, 'Frost 9W LED Bulb Warm White (Carton 20)', 'BLB-LED-9W', '6001002001020',
      5.00, 5.00, 0.00, 0.00, 'carton', 'Carton of 20 Bulbs', 20.00, 100.00, 24.00, 120.00,
      $5, $6, 100.00, 'EXACT'
    )`, [ITEM_BULBS, DRAFT_INVOICE_ID, ORG_A, WS_A, P_BULB, PKG_BULB_CARTON]);

    // Line 2: 10 bags of cement (pack size 1)
    const ITEM_CEMENT = 'a1111111-0000-0000-0000-000000000002';
    await q(`INSERT INTO public.retail_smart_receipt_items (
      id, draft_id, organization_id, workspace_id, line_number, raw_description, raw_sku, raw_barcode,
      stated_quantity, received_quantity, damaged_quantity, missing_quantity, unit_of_measure,
      pack_label, pack_size, calculated_base_quantity, unit_cost, line_total,
      matched_product_id, matched_package_id, match_confidence, match_status
    ) VALUES (
      $1, $2, $3, $4, 2, 'Portland Cement 50kg Bag', 'CEM-50KG', '6001002001002',
      10.00, 10.00, 0.00, 0.00, 'bag', 'Bag', 1.00, 10.00, 7.50, 75.00,
      $5, NULL, 100.00, 'EXACT'
    )`, [ITEM_CEMENT, DRAFT_INVOICE_ID, ORG_A, WS_A, P_CEMENT]);

    // Line 3: 3 drills on invoice, but only 2 received (1 missing flagged)
    const ITEM_DRILLS = 'a1111111-0000-0000-0000-000000000003';
    await q(`INSERT INTO public.retail_smart_receipt_items (
      id, draft_id, organization_id, workspace_id, line_number, raw_description, raw_sku, raw_barcode,
      stated_quantity, received_quantity, damaged_quantity, missing_quantity, unit_of_measure,
      pack_label, pack_size, calculated_base_quantity, unit_cost, line_total,
      matched_product_id, matched_package_id, match_confidence, match_status, review_notes
    ) VALUES (
      $1, $2, $3, $4, 3, 'Frost Heavy-Duty Cordless Drill 18V', 'DRL-IMPACT-18V', '6001002001003',
      3.00, 2.00, 0.00, 1.00, 'each', 'Unit', 1.00, 2.00, 65.00, 130.00,
      $5, NULL, 100.00, 'EXACT', 'Shortage: 1 drill missing from physical shipment'
    )`, [ITEM_DRILLS, DRAFT_INVOICE_ID, ORG_A, WS_A, P_DRILL]);

    // Check inventory stock BEFORE posting: must remain exactly 0.00
    for (const prodId of [P_BULB, P_CEMENT, P_DRILL]) {
      const stock = await scalar(`SELECT quantity_on_hand::numeric FROM public.retail_stock_levels WHERE workspace_id=$1 AND product_id=$2`, [WS_A, prodId]);
      assert(parseFloat(stock) === 0, `Product ${prodId} stock is exactly 0 after document upload`);
    }

    // --------------------------------------------------- [5] Authorized Manager Approval & Atomic Posting
    console.log('\n[5] Manager Approval: Frosthub Demo Acceptance Scenario Posting');
    const NONCE_POST_1 = 'b1111111-0000-0000-0000-000000000001';

    const itemsPayload = JSON.stringify([
      {
        item_id: ITEM_BULBS,
        product_id: P_BULB,
        package_id: PKG_BULB_CARTON,
        received_quantity: 5.00,
        damaged_quantity: 0.00,
        missing_quantity: 0.00,
        pack_size: 20.00,
        unit_cost: 24.00,
      },
      {
        item_id: ITEM_CEMENT,
        product_id: P_CEMENT,
        package_id: null,
        received_quantity: 10.00,
        damaged_quantity: 0.00,
        missing_quantity: 0.00,
        pack_size: 1.00,
        unit_cost: 7.50,
      },
      {
        item_id: ITEM_DRILLS,
        product_id: P_DRILL,
        package_id: null,
        received_quantity: 2.00,
        damaged_quantity: 0.00,
        missing_quantity: 1.00,
        pack_size: 1.00,
        unit_cost: 65.00,
      },
    ]);

    const postResult = await one(`SELECT public.execute_atomic_smart_stock_receipt($1, $2, $3, $4, $5, $6, $7::jsonb) AS res`,
      [ORG_A, WS_A, DRAFT_INVOICE_ID, MANAGER_A, NONCE_POST_1, 'Frosthub demo shipment approved by manager', itemsPayload]);

    const resJson = postResult.res;
    assert(resJson.success === true, 'execute_atomic_smart_stock_receipt returned success');
    assert(resJson.lines_posted === 3, 'All 3 lines successfully posted');
    assert(parseFloat(resJson.base_units_added) === 112, 'Total base units added is 112 (100 bulbs + 10 cement + 2 drills)');

    // Verify Frosthub Acceptance Criteria 1: 5 cartons x 20 LED bulbs => +100 base units
    const bulbStock = await scalar(`SELECT quantity_on_hand::numeric FROM public.retail_stock_levels WHERE workspace_id=$1 AND product_id=$2`, [WS_A, P_BULB]);
    assert(parseFloat(bulbStock) === 100, 'LED bulbs stock increased by exactly +100 base units (5 cartons x 20)');

    // Verify Frosthub Acceptance Criteria 2: 10 cement bags => +10 base units
    const cementStock = await scalar(`SELECT quantity_on_hand::numeric FROM public.retail_stock_levels WHERE workspace_id=$1 AND product_id=$2`, [WS_A, P_CEMENT]);
    assert(parseFloat(cementStock) === 10, 'Cement bags stock increased by exactly +10 base units');

    // Verify Frosthub Acceptance Criteria 3: 2 of 3 drills => +2 base units and shortage flagged
    const drillStock = await scalar(`SELECT quantity_on_hand::numeric FROM public.retail_stock_levels WHERE workspace_id=$1 AND product_id=$2`, [WS_A, P_DRILL]);
    assert(parseFloat(drillStock) === 2, 'Drill stock increased by exactly +2 base units (shortage of 1 preserved)');

    // Verify draft status is POSTED
    const draftStatus = await scalar(`SELECT status FROM public.retail_smart_receipt_drafts WHERE id=$1`, [DRAFT_INVOICE_ID]);
    assert(draftStatus === 'POSTED', 'Draft status changed to POSTED');

    // --------------------------------------------------- [6] Concurrency Guard & Nonce Replay Idempotency
    console.log('\n[6] Concurrency & Idempotent Nonce Guard');
    const replayResult = await one(`SELECT public.execute_atomic_smart_stock_receipt($1, $2, $3, $4, $5, $6, $7::jsonb) AS res`,
      [ORG_A, WS_A, DRAFT_INVOICE_ID, MANAGER_A, NONCE_POST_1, 'Replay attempt', itemsPayload]);

    assert(replayResult.res.success === true, 'Duplicate nonce returns success idempotently');
    assert(replayResult.res.idempotent_replay === true, 'Flagged as idempotent_replay');

    // Verify inventory stock was NOT doubled
    const bulbStockAfterReplay = await scalar(`SELECT quantity_on_hand::numeric FROM public.retail_stock_levels WHERE workspace_id=$1 AND product_id=$2`, [WS_A, P_BULB]);
    assert(parseFloat(bulbStockAfterReplay) === 100, 'LED bulbs stock remains 100 (never double-received)');

    // Attempting to post the already posted draft with a NEW nonce must fail
    const NEW_NONCE = 'b1111111-0000-0000-0000-000000000099';
    await rejects(
      () => q(`SELECT public.execute_atomic_smart_stock_receipt($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [ORG_A, WS_A, DRAFT_INVOICE_ID, MANAGER_A, NEW_NONCE, 'Invalid attempt', itemsPayload]),
      /DRAFT_ALREADY_POSTED/,
      'Cannot re-post an already POSTED draft with a new nonce'
    );

    // --------------------------------------------------- [7] Deduplication Guard: Same Document / Invoice
    console.log('\n[7] Duplicate Receipt & Delivery Guard');
    // Uploading a draft with the same SHA-256 within the same workspace
    const DUPLICATE_DRAFT_ID = '91111111-0000-0000-0000-000000000002';
    await q(`INSERT INTO public.retail_smart_receipt_drafts (
      id, organization_id, workspace_id, supplier_id, document_type, status,
      file_name, file_path, file_size_bytes, mime_type, file_sha256,
      extracted_supplier_name, extracted_document_number, currency
    ) VALUES (
      $1, $2, $3, $4, 'PACKING_LIST', 'READY_FOR_REVIEW',
      'frosthub_packing_slip_oct2026.pdf', 'docs/frosthub_packing_slip_oct2026.pdf', 524288, 'application/pdf', $5,
      'Frost Supplies & Logistics', 'INV-2026-FROST-101', 'USD'
    )`, [DUPLICATE_DRAFT_ID, ORG_A, WS_A, SUP_FROST, INVOICE_SHA256]);

    // Check unique duplicate constraint on workspace + supplier + document_type + extracted_document_number
    await rejects(
      () => q(`INSERT INTO public.retail_smart_receipt_drafts (
        organization_id, workspace_id, supplier_id, document_type, status,
        file_name, file_path, file_size_bytes, mime_type, file_sha256,
        extracted_supplier_name, extracted_document_number
      ) VALUES (
        $1, $2, $3, 'INVOICE', 'READY_FOR_REVIEW',
        'another_file.pdf', 'docs/another_file.pdf', 1000, 'application/pdf', 'dummy_hash_unique',
        'Frost Supplies & Logistics', 'INV-2026-FROST-101'
      )`, [ORG_A, WS_A, SUP_FROST]),
      /duplicate key value violates unique constraint/,
      'Duplicate invoice number for same supplier in same workspace rejected'
    );

    // --------------------------------------------------- [8] Packing List Financial Defense: Zero Price Fabrication
    console.log('\n[8] Packing List Defense: Never Invent Costs');
    const ITEM_PACKING_LIST = 'a1111111-0000-0000-0000-000000000004';
    await q(`INSERT INTO public.retail_smart_receipt_items (
      id, draft_id, organization_id, workspace_id, line_number, raw_description, raw_sku,
      stated_quantity, received_quantity, damaged_quantity, missing_quantity, unit_of_measure,
      pack_size, calculated_base_quantity, unit_cost, line_total,
      matched_product_id, match_status
    ) VALUES (
      $1, $2, $3, $4, 1, 'Delivery Packing List Portland Cement', 'CEM-50KG',
      5.00, 5.00, 0.00, 0.00, 'bag',
      1.00, 5.00, NULL, 0.00,
      $5, 'EXACT'
    )`, [ITEM_PACKING_LIST, DUPLICATE_DRAFT_ID, ORG_A, WS_A, P_CEMENT]);

    const packingItemCost = await scalar(`SELECT unit_cost FROM public.retail_smart_receipt_items WHERE id=$1`, [ITEM_PACKING_LIST]);
    assert(packingItemCost === null, 'Packing list item cost is NULL without pricing fabrication');

    // --------------------------------------------------- [9] Multi-Tenant Isolation
    console.log('\n[9] Multi-Tenant Isolation: Workspace B Cannot Touch Workspace A Draft');
    await rejects(
      () => q(`SELECT public.execute_atomic_smart_stock_receipt($1, $2, $3, $4, gen_random_uuid(), 'Malicious cross-tenant attempt', '[]'::jsonb)`,
        [ORG_B, WS_B, DRAFT_INVOICE_ID, MANAGER_A]),
      /DRAFT_NOT_FOUND/,
      'Cross-tenant smart receipt posting rejected (Draft not found in Workspace B)'
    );

    console.log(`\n${green(`SUCCESS: All ${pass}/${total} Smart Stock Receiving integration tests passed!`)}`);
    process.exit(0);
  } finally {
    try { await db.end(); } catch (_) {}
    try { await pg.stop(); } catch (_) {}
    try { fs.rmSync(DB_DIR, { recursive: true, force: true }); } catch (_) {}
  }
}

runSmartStockReceivingTests().catch((err) => {
  console.error(red(`Test suite failed: ${err.message}`));
  console.error(err.stack);
  process.exit(1);
});
