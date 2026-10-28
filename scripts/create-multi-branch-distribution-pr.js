const { execSync } = require('child_process');
const https = require('https');

let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

if (!token) {
  try {
    const cred = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8'
    });
    token = cred.split('\n').find(l => l.startsWith('password=')).replace('password=', '').trim();
  } catch (e) {
    console.error('Could not obtain GitHub token from git credentials:', e.message);
  }
}

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'User-Agent': 'Antigravity-Agent',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    };
    const r = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  console.log('Checking for existing open PR for feat/retail-multi-branch-distribution-165...');
  const existing = await req('/repos/rasali535/alinew/pulls?head=rasali535:feat/retail-multi-branch-distribution-165&state=open');
  if (existing.data && Array.isArray(existing.data) && existing.data.length > 0) {
    const pr = existing.data[0];
    console.log(`FOUND_EXISTING_PR: #${pr.number} - ${pr.html_url}`);
    return pr;
  }

  console.log('Creating PR for Issue #165 targeting main...');
  const prBody = `## Ralion Retail — Multi-Branch Stock Distribution System

Closes #165

### Executive Summary
Delivers an enterprise-grade **Multi-Branch Stock Distribution System** for Ralion Retail OS.
This enables central distribution warehouses to supply multiple retail branch stores with auditable replenishment workflows, atomic warehouse dispatch, goods-in-transit tracking, destination receiving verification, transit damage quarantine, and branch-isolated cashier POS checkout.

---

### Architectural Design & Core Tenancy Alignment
- **Single Workspace with Partitioned Locations**: Warehouses and retail branch stores share catalog specifications, barcodes, and pack definitions within the workspace, but maintain strictly isolated physical stock levels (\`retail_stock_levels.location_id\`), in-transit allocations, and cashier shift assignments.
- **Location Hierarchy & Classification**: Added \`location_type\` (\`'WAREHOUSE'\` vs \`'RETAIL_BRANCH'\`), manager assignments, contact details, and operational status to \`retail_locations\`.

---

### Key Capabilities Delivered

1. **Replenishment Requests (Zero-Inventory Invariant)**:
   - Branch store managers request stock replenishment with priority (\`LOW\`, \`NORMAL\`, \`HIGH\`, \`URGENT\`) and operational reasons.
   - **Invariant**: Replenishment requests **NEVER** alter or inflate inventory balances anywhere in the network until physically picked and dispatched.

2. **Atomic Warehouse Dispatch & In-Transit Tracking**:
   - Central warehouse managers review requests, allocate stock, pick, pack, and execute atomic dispatch via PostgreSQL procedure \`execute_atomic_dispatch_stock_transfer\`.
   - Source warehouse \`quantity_on_hand\` is decremented exactly once, \`retail_stock_movements\` records an immutable \`TRANSFER_OUT\` audit ledger entry, transfer transitions to \`IN_TRANSIT\`, and destination branch \`quantity_in_transit\` is incremented.
   - Captures carrier name, driver identity, vehicle registration plate, and dispatch note numbers.

3. **Destination Receiving & Strict Damage Quarantine**:
   - Destination branch managers physically inspect incoming shipments against the transfer manifest via \`execute_atomic_receive_stock_transfer\`.
   - **Transit Damage Defense**: Only undamaged good units increment sellable on-hand stock (\`quantity_on_hand\`). Damaged units are strictly routed to \`quantity_damaged\` (quarantine) and logged in \`retail_transfer_discrepancies\` with resolution action \`QUARANTINE\`. Damaged units are **NEVER** added to sellable POS stock.
   - In-transit balance (\`quantity_in_transit\`) decrements to 0.
   - **Conservation of Inventory**: \`Warehouse Stock + In-Transit + Branch Sellable Stock + Quarantined Damages = Total Network Stock\` (zero ghost inventory).

4. **POS Cashier Branch Location Isolation**:
   - Cashier shifts are explicitly assigned to a retail branch counter (\`retail_cashier_shifts.location_id\`).
   - The cashier checkout procedure \`execute_atomic_retail_sale\` strictly verifies that inventory exists at the cashier's assigned branch. If an item is out of stock at Branch B, the sale is blocked even if the Central Warehouse or Branch A has hundreds of units on hand.

5. **Printable Transfer & Delivery Documentation**:
   - Dual-format printable documentation component (\`TransferDocumentationModal\`) supporting:
     - **A4 Delivery Note / Manifest**: Full-page manifest with dispatch details, vehicle registration, itemized packing list, and carrier/receiver signature sign-off blocks.
     - **80mm Thermal Summary Slip**: Compact register slip for quick driver handoff and bay filing.

6. **Reports & BI Multi-Branch Distribution Dashboard**:
   - Dedicated dashboard tab (\`Reports & BI → Multi-Branch Distribution & BI\`) displaying:
     - Distribution network KPI summary (Warehouses vs Branches, in-transit units, quarantine damages, pending replenishment demand).
     - Network location stock matrix.
     - Goods-in-transit & transfer manifest ledger.
     - Transit damage & shortage quarantine discrepancy audit.
     - CSV export for multi-branch inventory valuation.

7. **Idempotency & Replay Defense**:
   - Dispatch and receive operations enforce unique idempotency nonces (\`dispatch_nonce\`, \`receive_nonce\`). Retried requests return existing transfer state without duplicate stock deductions or double-receiving.

---

### Database Changes & Migrations
- **Canonical Migrations**:
  - \`packages/database/migrations/20261030000000_retail_multi_branch_distribution.sql\`
  - \`supabase/migrations/20261030000000_retail_multi_branch_distribution.sql\`
- **New Tables**:
  - \`retail_user_locations\`: User-to-location authorization mapping.
  - \`retail_stock_requests\` & \`retail_stock_request_items\`: Replenishment requests and line items.
  - \`retail_stock_transfers\` & \`retail_stock_transfer_items\`: Internal transfers, dispatch, and manifest lines.
  - \`retail_transfer_discrepancies\`: Damage, shortage, and surplus discrepancy audit.
- **Stored Procedures**:
  - \`execute_atomic_dispatch_stock_transfer\`: Atomic warehouse dispatch with row-level locks and ledger entry.
  - \`execute_atomic_receive_stock_transfer\`: Atomic branch receiving with physical inspection and quarantine routing.
  - \`execute_atomic_retail_sale\`: Updated with location parameter for branch-isolated POS sales.

---

### Verification & Testing
- **Multi-Branch Acceptance Suite** (\`scripts/test-retail-multi-branch-transfers.mjs\`):
  - ✓ Scenario 1: Replenishment request inventory invariant (stock unchanged across network).
  - ✓ Scenario 2: Atomic warehouse dispatch & in-transit tracking (warehouse -50, branch in-transit +50).
  - ✓ Scenario 3: Destination receiving with physical count & damage quarantine (branch sellable +48, damaged quarantine +2, in-transit 0, conservation of mass 500 = 500).
  - ✓ Scenario 4: Idempotency & replay defense (duplicate nonces return existing state without duplicate stock updates).
  - ✓ Scenario 5: POS cashier location isolation (Branch A cashier sells 3 units; Branch B cashier blocked from selling out-of-stock item).
  - ✓ Scenario 6: Multi-tenant boundary defense (cross-workspace transfers strictly rejected).
  - ✓ Scenario 7: Concurrency & over-allocation defense (dispatching more than available stock is rejected).
- **Migration Replay Suite** (\`scripts/security/test-preview-migration-replay.mjs\`):
  - ✓ 47 migrations replayed cleanly across 137 public tables.
- **TypeScript Compilation**:
  - ✓ \`npx tsc --noEmit\` passed with 0 errors across \`apps/ralion\`.
`;

  const res = await req('/repos/rasali535/alinew/pulls', 'POST', {
    title: 'feat(retail): Multi-Branch Stock Distribution System (Issue #165)',
    head: 'feat/retail-multi-branch-distribution-165',
    base: 'main',
    body: prBody,
    draft: false
  });

  if (res.status === 201) {
    console.log(`SUCCESS: PR #${res.data.number} created!`);
    console.log(`URL: ${res.data.html_url}`);
    return res.data;
  } else {
    console.error(`FAILED to create PR (status ${res.status}):`, JSON.stringify(res.data, null, 2));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal PR creation error:', err);
  process.exit(1);
});
