import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';

console.log('--------------------------------------------------------------------------------');
console.log('Ralion Retail OS — Multi-Branch Stock Distribution System (Issue #165 Acceptance Suite)');
console.log('--------------------------------------------------------------------------------\n');

const database = new PGlite({ extensions: { vector, uuid_ossp } });
const migrationDirectory = new URL('../supabase/migrations/', import.meta.url);

async function runAcceptanceTests() {
  console.log('Step 1: Setting up isolated PostgreSQL instance & replaying all migrations...');
  await database.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
    GRANT USAGE ON SCHEMA auth TO PUBLIC;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_user::text $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
  `);

  const files = fs.readdirSync(migrationDirectory).filter(name => /^\d{14}_.+\.sql$/.test(name)).sort();
  for (const file of files) {
    try {
      await database.exec(fs.readFileSync(new URL(file, migrationDirectory), 'utf8'));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${error.message}`, { cause: error });
    }
  }
  console.log(`  ✓ Replayed ${files.length} migrations cleanly.\n`);

  console.log('Step 2: Seeding multi-tenant test fixtures (Central Warehouse, Branch A, Branch B)...');
  const orgId = '11111111-1111-1111-1111-111111111111';
  const workspaceId = '22222222-2222-2222-2222-222222222222';
  const otherWorkspaceId = '99999999-9999-9999-9999-999999999999';
  const adminUserId = '33333333-3333-3333-3333-333333333333';
  const cashierAId = '44444444-4444-4444-4444-444444444444';
  const cashierBId = '55555555-5555-5555-5555-555555555555';

  const warehouseLocId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const branchALocId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const branchBLocId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const otherWsLocId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  const productId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

  await database.exec(`
    INSERT INTO auth.users (id, email) VALUES
      ('${adminUserId}', 'manager@proinsight.co.bw'),
      ('${cashierAId}', 'cashier.a@proinsight.co.bw'),
      ('${cashierBId}', 'cashier.b@proinsight.co.bw');

    INSERT INTO profiles (id, email, full_name) VALUES
      ('${adminUserId}', 'manager@proinsight.co.bw', 'Regional Inventory Manager'),
      ('${cashierAId}', 'cashier.a@proinsight.co.bw', 'Branch A Cashier'),
      ('${cashierBId}', 'cashier.b@proinsight.co.bw', 'Branch B Cashier')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

    INSERT INTO organizations (id, name, slug) VALUES ('${orgId}', 'Proinsight Holdings', 'proinsight');
    INSERT INTO workspaces (id, organization_id, name, slug, owner_id) VALUES ('${workspaceId}', '${orgId}', 'Frosthub Hardware', 'frosthub', '${adminUserId}');
    INSERT INTO workspaces (id, organization_id, name, slug, owner_id) VALUES ('${otherWorkspaceId}', '${orgId}', 'Competitor Hardware', 'competitor', '${adminUserId}');

    -- Active Retail Module Entitlement for test workspace
    INSERT INTO tenant_module_entitlements (organization_id, workspace_id, module_key, status, tier)
    VALUES ('${orgId}', '${workspaceId}', 'retail', 'ACTIVE', 'ENTERPRISE');

    -- Central Warehouse
    INSERT INTO retail_locations (id, organization_id, workspace_id, name, code, location_type, is_default, is_active)
    VALUES ('${warehouseLocId}', '${orgId}', '${workspaceId}', 'Central Distribution Warehouse', 'WH-MAIN', 'WAREHOUSE', false, true);

    -- Retail Branch A
    INSERT INTO retail_locations (id, organization_id, workspace_id, name, code, location_type, is_default, is_active)
    VALUES ('${branchALocId}', '${orgId}', '${workspaceId}', 'Gaborone Mall Retail Branch', 'BR-GAB', 'RETAIL_BRANCH', true, true);

    -- Retail Branch B
    INSERT INTO retail_locations (id, organization_id, workspace_id, name, code, location_type, is_default, is_active)
    VALUES ('${branchBLocId}', '${orgId}', '${workspaceId}', 'Francistown Retail Branch', 'BR-FT', 'RETAIL_BRANCH', false, true);

    -- Other Workspace Location (for boundary testing)
    INSERT INTO retail_locations (id, organization_id, workspace_id, name, code, location_type, is_default, is_active)
    VALUES ('${otherWsLocId}', '${orgId}', '${otherWorkspaceId}', 'External Site', 'EXT-01', 'RETAIL_BRANCH', true, true);

    -- Product: Drywall Screws (500 boxes in Central Warehouse)
    INSERT INTO retail_products (id, organization_id, workspace_id, name, sku, barcode, category, selling_price, purchase_cost, vat_rate)
    VALUES ('${productId}', '${orgId}', '${workspaceId}', 'Drywall Screws 25mm 1000pc', 'SCRW-25-1K', '6001234567890', 'Fasteners', 25.00, 15.00, 14.00);

    -- Stock Level: 500 at Warehouse
    INSERT INTO retail_stock_levels (organization_id, workspace_id, product_id, location_id, quantity_on_hand, quantity_in_transit, quantity_damaged)
    VALUES ('${orgId}', '${workspaceId}', '${productId}', '${warehouseLocId}', 500, 0, 0);

    -- Stock Level: 0 at Branch A
    INSERT INTO retail_stock_levels (organization_id, workspace_id, product_id, location_id, quantity_on_hand, quantity_in_transit, quantity_damaged)
    VALUES ('${orgId}', '${workspaceId}', '${productId}', '${branchALocId}', 0, 0, 0);

    -- Stock Level: 0 at Branch B
    INSERT INTO retail_stock_levels (organization_id, workspace_id, product_id, location_id, quantity_on_hand, quantity_in_transit, quantity_damaged)
    VALUES ('${orgId}', '${workspaceId}', '${productId}', '${branchBLocId}', 0, 0, 0);
  `);
  console.log('  ✓ Fixtures seeded: 500 boxes of Drywall Screws at Central Warehouse, 0 at Branch A & B.\n');

  // ============================================================================
  // Test Scenario 1: Replenishment Request Invariant
  // Stock requests must NOT increase or alter inventory anywhere!
  // ============================================================================
  console.log('Test Scenario 1: Branch Replenishment Request Inventory Invariant...');
  const requestId = '10000000-0000-0000-0000-000000000001';
  await database.exec(`
    INSERT INTO retail_stock_requests (
      id, organization_id, workspace_id, request_number, source_location_id, destination_location_id,
      requested_by, status, priority, notes
    ) VALUES (
      '${requestId}', '${orgId}', '${workspaceId}', 'REQ-2026-0001', '${warehouseLocId}', '${branchALocId}',
      '${cashierAId}', 'REQUESTED', 'HIGH', 'Urgent weekend restocking'
    );

    INSERT INTO retail_stock_request_items (
      request_id, product_id, quantity_requested, base_quantity_requested, quantity_approved, base_quantity_approved
    ) VALUES (
      '${requestId}', '${productId}', 60, 60, 0, 0
    );
  `);

  const whStockAfterReq = (await database.query(`
    SELECT quantity_on_hand, quantity_in_transit FROM retail_stock_levels
    WHERE workspace_id='${workspaceId}' AND product_id='${productId}' AND location_id='${warehouseLocId}'
  `)).rows[0];

  const brAStockAfterReq = (await database.query(`
    SELECT quantity_on_hand, quantity_in_transit FROM retail_stock_levels
    WHERE workspace_id='${workspaceId}' AND product_id='${productId}' AND location_id='${branchALocId}'
  `)).rows[0];

  assert.equal(Number(whStockAfterReq.quantity_on_hand), 500, 'Warehouse stock must remain unchanged after request creation.');
  assert.equal(Number(whStockAfterReq.quantity_in_transit), 0, 'Warehouse in-transit must be 0.');
  assert.equal(Number(brAStockAfterReq.quantity_on_hand), 0, 'Branch A stock must remain 0 after request creation.');
  assert.equal(Number(brAStockAfterReq.quantity_in_transit), 0, 'Branch A in-transit must be 0.');
  console.log('  ✓ Invariant Verified: Stock request created for 60 units. Warehouse on hand = 500, Branch A on hand = 0.\n');

  // ============================================================================
  // Test Scenario 2: Warehouse Approval, Picking, Packing & Atomic Dispatch
  // Dispatch must deduct warehouse on_hand exactly once and set branch in-transit!
  // ============================================================================
  console.log('Test Scenario 2: Atomic Warehouse Dispatch & In-Transit Tracking...');
  const transferId = '20000000-0000-0000-0000-000000000001';
  const transferItemId = '22000000-0000-0000-0000-000000000001';
  const dispatchNonce = 'DISPATCH_NONCE_001';

  // Warehouse manager approves 50 units (partial fulfillment of 60 requested)
  await database.exec(`
    UPDATE retail_stock_requests SET status = 'APPROVED' WHERE id = '${requestId}';
    UPDATE retail_stock_request_items SET quantity_approved = 50, base_quantity_approved = 50 WHERE request_id = '${requestId}';

    INSERT INTO retail_stock_transfers (
      id, organization_id, workspace_id, request_id, transfer_number, transfer_type,
      source_location_id, destination_location_id, status
    ) VALUES (
      '${transferId}', '${orgId}', '${workspaceId}', '${requestId}', 'TRF-2026-0001', 'WAREHOUSE_TO_BRANCH',
      '${warehouseLocId}', '${branchALocId}', 'DRAFT'
    );

    INSERT INTO retail_stock_transfer_items (
      id, transfer_id, product_id, quantity_dispatched, base_quantity_dispatched, quantity_received, base_quantity_received
    ) VALUES (
      '${transferItemId}', '${transferId}', '${productId}', 50, 50, 0, 0
    );
  `);

  // Call atomic dispatch procedure
  const dispatchRes = await database.query(`
    SELECT execute_atomic_dispatch_stock_transfer(
      '${orgId}'::uuid,
      '${workspaceId}'::uuid,
      '${transferId}'::uuid,
      '${adminUserId}'::uuid,
      'Regional Inventory Manager',
      'TRUCK-04',
      'B742-ABC',
      'DISP-NOTE-9921',
      'Handle with care - fragile packaging',
      '${dispatchNonce}'
    ) AS result;
  `);

  const rawDispatch = dispatchRes.rows[0].result;
  const dispatchOutput = typeof rawDispatch === 'string' ? JSON.parse(rawDispatch) : rawDispatch;
  assert.equal(dispatchOutput.success, true, 'Dispatch must succeed.');
  assert.equal(dispatchOutput.status, 'IN_TRANSIT', 'Transfer status must transition to IN_TRANSIT.');

  const whStockAfterDispatch = (await database.query(`
    SELECT quantity_on_hand, quantity_in_transit FROM retail_stock_levels
    WHERE workspace_id='${workspaceId}' AND product_id='${productId}' AND location_id='${warehouseLocId}'
  `)).rows[0];

  const brAStockAfterDispatch = (await database.query(`
    SELECT quantity_on_hand, quantity_in_transit FROM retail_stock_levels
    WHERE workspace_id='${workspaceId}' AND product_id='${productId}' AND location_id='${branchALocId}'
  `)).rows[0];

  assert.equal(Number(whStockAfterDispatch.quantity_on_hand), 450, 'Warehouse on-hand must decrement by dispatched amount (500 - 50 = 450).');
  assert.equal(Number(brAStockAfterDispatch.quantity_on_hand), 0, 'Branch A sellable stock must remain 0 while goods are in transit.');
  assert.equal(Number(brAStockAfterDispatch.quantity_in_transit), 50, 'Branch A in-transit stock must now be 50.');

  // Verify stock movement ledger
  const dispatchLedger = (await database.query(`
    SELECT movement_type, reference_type, quantity_change FROM retail_stock_movements
    WHERE workspace_id='${workspaceId}' AND product_id='${productId}' AND reference_type='TRANSFER_DISPATCH'
  `)).rows[0];
  assert.equal(dispatchLedger.movement_type, 'TRANSFER', 'Audit ledger must record TRANSFER.');
  assert.equal(Math.abs(Number(dispatchLedger.quantity_change)), 50, 'Ledger quantity must be 50.');
  console.log('  ✓ Dispatch Verified: Central Warehouse = 450, Branch A on hand = 0, Branch A in transit = 50.\n');

  // ============================================================================
  // Test Scenario 3: Destination Receiving, Shortages & Damaged Quarantine
  // Physical count: 48 good units received, 2 damaged in transit!
  // Good units -> Branch A sellable on_hand (48).
  // Damaged units -> Branch A quarantine quantity_damaged (2).
  // In-transit -> 0.
  // Conservation of total inventory: 450 + 48 + 2 = 500!
  // ============================================================================
  console.log('Test Scenario 3: Destination Receiving with Physical Verification & Damage Quarantine...');
  const receiveNonce = 'RECEIVE_NONCE_001';
  const receivedItemsJson = JSON.stringify([
    {
      item_id: transferItemId,
      quantity_received: 48,
      quantity_damaged: 2,
      damage_notes: 'Corner carton crushed during transport',
    },
  ]);

  const receiveRes = await database.query(`
    SELECT execute_atomic_receive_stock_transfer(
      '${orgId}'::uuid,
      '${workspaceId}'::uuid,
      '${transferId}'::uuid,
      '${cashierAId}'::uuid,
      'Branch A Cashier',
      '${receivedItemsJson}'::jsonb,
      'Store Goods In Bay 1',
      '${receiveNonce}'
    ) AS result;
  `);

  const rawReceive = receiveRes.rows[0].result;
  const receiveOutput = typeof rawReceive === 'string' ? JSON.parse(rawReceive) : rawReceive;
  assert.equal(receiveOutput.success, true, 'Receiving must succeed.');
  assert.equal(receiveOutput.status, 'RECEIVED', 'Transfer status must transition to RECEIVED.');
  assert.equal(Number(receiveOutput.total_units_received), 48, '48 good units received.');
  assert.equal(Number(receiveOutput.total_units_damaged), 2, '2 damaged units reported.');

  const brAStockAfterReceive = (await database.query(`
    SELECT quantity_on_hand, quantity_in_transit, quantity_damaged FROM retail_stock_levels
    WHERE workspace_id='${workspaceId}' AND product_id='${productId}' AND location_id='${branchALocId}'
  `)).rows[0];

  assert.equal(Number(brAStockAfterReceive.quantity_on_hand), 48, 'Branch A sellable stock must be exactly 48 (only good units!).');
  assert.equal(Number(brAStockAfterReceive.quantity_damaged), 2, 'Branch A damaged quarantine must be exactly 2.');
  assert.equal(Number(brAStockAfterReceive.quantity_in_transit), 0, 'Branch A in-transit stock must drop to 0.');

  // Discrepancy table verification
  const discrepancyRow = (await database.query(`
    SELECT discrepancy_type, quantity, resolution_notes FROM retail_transfer_discrepancies
    WHERE transfer_id='${transferId}'
  `)).rows[0];
  assert.equal(discrepancyRow.discrepancy_type, 'DAMAGED', 'Discrepancy must be logged as DAMAGED.');
  assert.equal(Number(discrepancyRow.quantity), 2, 'Discrepancy quantity must be 2.');

  // Conservation of inventory check
  const totalNetworkStock = (await database.query(`
    SELECT SUM(quantity_on_hand + quantity_in_transit + quantity_damaged)::int AS total
    FROM retail_stock_levels WHERE workspace_id='${workspaceId}' AND product_id='${productId}'
  `)).rows[0].total;
  assert.equal(Number(totalNetworkStock), 500, 'Total network stock must remain exactly 500 (450 warehouse + 48 sellable + 2 quarantine).');
  console.log('  ✓ Receiving & Damage Verified: Branch A sellable = 48, quarantined damaged = 2, in-transit = 0.');
  console.log('  ✓ Conservation of Mass: Total network inventory = 500 exactly (zero ghost inventory).\n');

  // ============================================================================
  // Test Scenario 4: Idempotency & Replay Defense
  // Repeated dispatch or receive calls with identical nonce must be safe no-ops!
  // ============================================================================
  console.log('Test Scenario 4: Idempotency & Replay Defense...');
  const replayReceive = await database.query(`
    SELECT execute_atomic_receive_stock_transfer(
      '${orgId}'::uuid,
      '${workspaceId}'::uuid,
      '${transferId}'::uuid,
      '${cashierAId}'::uuid,
      'Branch A Cashier',
      '${receivedItemsJson}'::jsonb,
      'Store Goods In Bay 1',
      '${receiveNonce}'
    ) AS result;
  `);
  const rawReplay = replayReceive.rows[0].result;
  const replayOutput = typeof rawReplay === 'string' ? JSON.parse(rawReplay) : rawReplay;
  assert.equal(replayOutput.idempotent_replay, true, 'Replay call must be detected as idempotent replay.');

  const brAStockAfterReplay = (await database.query(`
    SELECT quantity_on_hand, quantity_damaged FROM retail_stock_levels
    WHERE workspace_id='${workspaceId}' AND product_id='${productId}' AND location_id='${branchALocId}'
  `)).rows[0];
  assert.equal(Number(brAStockAfterReplay.quantity_on_hand), 48, 'Stock must NOT be incremented twice on replay.');
  assert.equal(Number(brAStockAfterReplay.quantity_damaged), 2, 'Damaged stock must NOT be incremented twice on replay.');
  console.log('  ✓ Idempotency Verified: Duplicate receive call returned existing state without duplicating stock.\n');

  // ============================================================================
  // Test Scenario 5: POS Cashier Location Isolation
  // Cashier at Branch A can sell Branch A stock.
  // Cashier at Branch B CANNOT sell stock (0 on hand at Branch B), even though
  // Central Warehouse has 450 and Branch A has 48!
  // ============================================================================
  console.log('Test Scenario 5: POS Cashier Branch Location Isolation...');

  // 5A: Cashier A opens shift at Branch A and sells 3 units
  const shiftAId = '30000000-0000-0000-0000-000000000001';
  await database.exec(`
    INSERT INTO retail_cashier_shifts (
      id, organization_id, workspace_id, cashier_user_id, cashier_name, location_id,
      started_at, opening_cash, status
    ) VALUES (
      '${shiftAId}', '${orgId}', '${workspaceId}', '${cashierAId}', 'Branch A Cashier', '${branchALocId}',
      NOW(), 100.00, 'OPEN'
    );
  `);

  const saleAItems = JSON.stringify([
    {
      product_id: productId,
      product_name: 'Drywall Screws 25mm 1000pc',
      sku: 'SCRW-25-1K',
      quantity: 3,
      unit_price: 25.00,
      unit_cost: 15.00,
      discount_rate: 0,
      tax_rate: 14.00,
      line_total: 75.00,
      line_cost: 45.00,
    },
  ]);
  const saleAPayments = JSON.stringify([
    {
      payment_method: 'CASH',
      amount: 75.00,
    },
  ]);

  const saleARes = await database.query(`
    SELECT execute_atomic_retail_sale(
      '${orgId}'::uuid,
      '${workspaceId}'::uuid,
      'POS-BR-A-001',
      'INV-A-001',
      'POS',
      NULL,
      'Walk-in Customer A',
      '${cashierAId}'::uuid,
      'Branch A Cashier',
      '${shiftAId}'::uuid,
      'USD',
      75.00,
      0.00,
      0.00,
      75.00,
      45.00,
      'CASH',
      'PAID',
      'NONCE_SALE_A_001',
      'POS sale at Branch A',
      '${saleAItems}'::jsonb,
      '${saleAPayments}'::jsonb,
      false,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      '${branchALocId}'::uuid
    ) AS result;
  `);

  const rawSaleA = saleARes.rows[0].result;
  const saleAOutput = typeof rawSaleA === 'string' ? JSON.parse(rawSaleA) : rawSaleA;
  assert.equal(saleAOutput.success, true, 'Branch A sale must succeed.');

  const brAStockAfterSale = (await database.query(`
    SELECT quantity_on_hand FROM retail_stock_levels
    WHERE workspace_id='${workspaceId}' AND product_id='${productId}' AND location_id='${branchALocId}'
  `)).rows[0].quantity_on_hand;
  assert.equal(Number(brAStockAfterSale), 45, 'Branch A sellable stock must drop by 3 (48 - 3 = 45).');

  // 5B: Cashier B opens shift at Branch B and attempts to sell 1 unit
  // Branch B has 0 stock on hand. Sale MUST BE BLOCKED!
  const shiftBId = '30000000-0000-0000-0000-000000000002';
  await database.exec(`
    INSERT INTO retail_cashier_shifts (
      id, organization_id, workspace_id, cashier_user_id, cashier_name, location_id,
      started_at, opening_cash, status
    ) VALUES (
      '${shiftBId}', '${orgId}', '${workspaceId}', '${cashierBId}', 'Branch B Cashier', '${branchBLocId}',
      NOW(), 100.00, 'OPEN'
    );
  `);

  let branchBSaleFailed = false;
  try {
    await database.query(`
      SELECT execute_atomic_retail_sale(
        '${orgId}'::uuid,
        '${workspaceId}'::uuid,
        'POS-BR-B-001',
        'INV-B-001',
        'POS',
        NULL,
        'Walk-in Customer B',
        '${cashierBId}'::uuid,
        'Branch B Cashier',
        '${shiftBId}'::uuid,
        'USD',
        25.00,
        0.00,
        0.00,
        25.00,
        15.00,
        'CASH',
        'PAID',
        'NONCE_SALE_B_001',
        'POS sale at Branch B',
        '${JSON.stringify([{ product_id: productId, product_name: 'Drywall Screws 25mm 1000pc', sku: 'SCRW-25-1K', quantity: 1, unit_price: 25.00, unit_cost: 15.00, discount_rate: 0, tax_rate: 14.00, line_total: 25.00, line_cost: 15.00 }])}'::jsonb,
        '${JSON.stringify([{ payment_method: 'CASH', amount: 25.00 }])}'::jsonb,
        false,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        '${branchBLocId}'::uuid
      ) AS result;
    `);
  } catch (err) {
    branchBSaleFailed = true;
    assert.match(err.message, /INSUFFICIENT/i, 'Error must indicate insufficient stock at Branch B.');
  }

  assert.equal(branchBSaleFailed, true, 'Sale at Branch B must be rejected due to location stock isolation!');
  console.log('  ✓ Branch Isolation Verified: Cashier A at Branch A sold 3 units (stock: 48 -> 45).');
  console.log('  ✓ Branch Isolation Verified: Cashier B at Branch B blocked from selling (insufficient stock at Branch B).\n');

  // ============================================================================
  // Test Scenario 6: Multi-Tenant Workspace Boundary Defense
  // Attempting to dispatch to or from a location belonging to another workspace!
  // ============================================================================
  console.log('Test Scenario 6: Multi-Tenant Workspace Boundary Defense...');
  let crossTenantFailed = false;
  const crossTransferId = '40000000-0000-0000-0000-000000000001';

  try {
    await database.exec(`
      INSERT INTO retail_stock_transfers (
        id, organization_id, workspace_id, transfer_number, transfer_type,
        source_location_id, destination_location_id, status
      ) VALUES (
        '${crossTransferId}', '${orgId}', '${workspaceId}', 'TRF-CROSS-01', 'WAREHOUSE_TO_BRANCH',
        '${warehouseLocId}', '${otherWsLocId}', 'DRAFT'
      );
    `);
    // Attempt dispatch with cross-tenant location
    await database.query(`
      SELECT execute_atomic_dispatch_stock_transfer(
        '${orgId}'::uuid,
        '${workspaceId}'::uuid,
        '${crossTransferId}'::uuid,
        '${adminUserId}'::uuid,
        'Regional Inventory Manager',
        'TRUCK-01',
        'PLATE',
        'DISP-NOTE',
        'Cross tenant',
        'CROSS_NONCE_01'
      );
    `);
  } catch (err) {
    crossTenantFailed = true;
  }

  assert.equal(crossTenantFailed, true, 'Cross-workspace stock transfers must be rejected.');
  console.log('  ✓ Multi-tenant Boundary Verified: Cross-workspace transfer rejected.\n');

  // ============================================================================
  // Test Scenario 7: Concurrency & Over-allocation Defense
  // Attempting to dispatch more units than available on hand!
  // ============================================================================
  console.log('Test Scenario 7: Over-allocation Defense...');
  const overTransferId = '50000000-0000-0000-0000-000000000001';
  let overAllocationFailed = false;

  await database.exec(`
    INSERT INTO retail_stock_transfers (
      id, organization_id, workspace_id, transfer_number, transfer_type,
      source_location_id, destination_location_id, status
    ) VALUES (
      '${overTransferId}', '${orgId}', '${workspaceId}', 'TRF-OVER-01', 'WAREHOUSE_TO_BRANCH',
      '${warehouseLocId}', '${branchALocId}', 'DRAFT'
    );

    -- Warehouse currently has 450 units. Attempt to dispatch 500 units!
    INSERT INTO retail_stock_transfer_items (
      transfer_id, product_id, quantity_dispatched, base_quantity_dispatched, quantity_received, base_quantity_received
    ) VALUES (
      '${overTransferId}', '${productId}', 500, 500, 0, 0
    );
  `);

  try {
    await database.query(`
      SELECT execute_atomic_dispatch_stock_transfer(
        '${orgId}'::uuid,
        '${workspaceId}'::uuid,
        '${overTransferId}'::uuid,
        '${adminUserId}'::uuid,
        'Regional Inventory Manager',
        'TRUCK-01',
        'PLATE',
        'DISP-NOTE',
        'Over-allocation',
        'OVER_NONCE_01'
      );
    `);
  } catch (err) {
    overAllocationFailed = true;
    assert.match(err.message, /INSUFFICIENT/i, 'Over-allocation must fail with insufficient stock message.');
  }

  assert.equal(overAllocationFailed, true, 'Over-allocation dispatch must be blocked.');
  console.log('  ✓ Over-allocation Defense Verified: Dispatching 500 units when 450 on hand was blocked.\n');

  console.log('================================================================================');
  console.log('ALL 7 ACCEPTANCE CRITERIA FROM ISSUE #165 PASSED WITH ZERO DEFECTS!');
  console.log('================================================================================');
}

runAcceptanceTests().catch((err) => {
  console.error('\n❌ ACCEPTANCE TEST SUITE FAILED:', err);
  process.exit(1);
});
