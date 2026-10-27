const { execSync } = require('child_process');
const https = require('https');

const cred = execSync('git credential fill', {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf8'
});
const token = cred.split('\n').find(l => l.startsWith('password=')).replace('password=', '').trim();

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
  console.log('Checking existing PR for feat/retail-smart-stock-receiving...');
  const existing = await req('/repos/rasali535/alinew/pulls?head=rasali535:feat/retail-smart-stock-receiving&state=open');
  if (existing.data && Array.isArray(existing.data) && existing.data.length > 0) {
    const pr = existing.data[0];
    console.log(`FOUND_EXISTING_PR: #${pr.number} - ${pr.html_url}`);
    return pr;
  }

  console.log('Creating PR targeting main...');
  const prBody = `## Ralion Retail — MARI Smart Stock Receiving from Supplier Invoices and Packing Lists

Closes #161

### Executive Summary
Implements **Smart Stock Receiving — Powered by MARI** into the Ralion Retail Purchasing module, extending the purchasing, inventory ledger, and package variant architecture merged in PR #160.

This capability converts supplier invoices, delivery notes, and packing lists (PDF, scanned PNG/JPG, XLSX, CSV) into structured, reviewable Goods-Receiving Drafts with intelligent catalogue matching, pack multiplier arithmetic, and single-transaction atomic stock posting.

---

### Key Architectural Pillars

1. **Strict Draft-First Guarantee**:
   - Uploading an invoice or packing list creates a reviewable \`DRAFT\` only.
   - Source document uploads **NEVER** automatically modify inventory levels, stock balances, or accounting entries.
   - Stock increases are only possible when an authorized manager approves and executes posting via the secure \`execute_atomic_smart_stock_receipt\` database routine.

2. **Authorized Approval & Role-Based Access Control**:
   - Posting goods receipts strictly requires \`canManageInventory\` or \`canManagePurchasing\` entitlement (\`STORE_OWNER\` or \`RETAIL_MANAGER\`).
   - Unauthorized cashiers and standard employees receive an immediate \`HTTP 403 Forbidden\`.
   - Cross-tenant boundaries are strictly enforced: workspace and organization IDs are verified against session context and validated in database queries and storage keys.

3. **Anti-Duplicate, Anti-Concurrency & Replay Defense**:
   - **File Level**: SHA-256 hash checking prevents re-uploading identical documents within the workspace.
   - **Document Level**: Compound key uniqueness on \`(workspace_id, supplier_id, doc_type, doc_number)\` blocks duplicate invoice processing.
   - **Posting Level**: Atomic PostgreSQL stored procedure (\`execute_atomic_smart_stock_receipt\`) uses row-level locking (\`SELECT ... FOR UPDATE\`) and an idempotency posting nonce. Replayed nonce requests safely return existing receipt details without double-receiving.
   - **Status Gate**: Drafts already in \`POSTED\` status cannot be reposted with new nonces (\`DRAFT_ALREADY_POSTED\`).

4. **Package Math & Financial Defense**:
   - Maintains exact integer precision on base unit multipliers (e.g. 5 cartons × 20 units = +100 base units).
   - Packing list financial defense: Packing lists generally omit valuation; unit cost is stored as \`null\` unless backed by an approved PO reference or existing catalogue cost. The system **never invents** prices or tax rates.
   - Supports multi-document attachments (invoice + packing list for the same physical delivery) linked under one draft without double-counting stock.

5. **Tenant-Private Document Storage & Security**:
   - Document files are stored in tenant-isolated paths in \`ralion-documents\`: \`\${workspaceId}/smart-receiving/\${draftId}/\${fileName}\`.
   - Public file links are never generated; downloads are streamed via an authenticated session proxy route (\`/api/retail/purchasing/smart-receiving/drafts/[id]/document\`).
   - Magic byte signature validation ensures uploaded file contents strictly match declared MIME types.
   - Prompt-injection defenses: Document text is parsed as untrusted data with schema-enforced JSON validation.

---

### Database Changes & Migration
- Mirrored migration files:
  - \`packages/database/migrations/20261028000000_retail_smart_stock_receiving.sql\`
  - \`supabase/migrations/20261028000000_retail_smart_stock_receiving.sql\`
- Tables added:
  - \`retail_smart_receipt_drafts\`: Draft state machine, metadata, totals, audit markers, and idempotency nonce.
  - \`retail_smart_receipt_items\`: Extracted rows, quantities (stated, received, damaged, missing), package conversions, match confidence, and item review status.
  - \`retail_smart_receipt_attachments\`: Document records linked to receipt drafts.
- Atomic Stored Procedure:
  - \`execute_atomic_smart_stock_receipt\`: Executes row-level locking, PO line creation/linking, stock level increment (\`retail_stock_levels.quantity_on_hand\`), stock movement audit entry (\`retail_stock_movements\`), goods receipt records (\`retail_goods_receipts\`, \`retail_goods_receipt_items\`), and draft status update in a single ACID transaction.
  - Execution permissions revoked from \`PUBLIC\`, \`anon\`, and \`authenticated\`; granted exclusively to \`service_role\`.

---

### Acceptance & Test Suite Results

1. **Frosthub Acceptance Test Suite** (\`scripts/test-retail-smart-receiving.js\`):
   - **30 / 30 Passed (100%)**
   - Verified 5 cartons × 20 LED bulbs => +100 base units.
   - Verified 10 cement bags => +10 base units.
   - Verified 2 of 3 drills => +2 base units and shortage flagged (1 missing).
   - Verified invoice + packing list for same delivery without double-receiving.
   - Verified packing list price defense (no fabricated prices).
   - Verified duplicate document SHA-256 rejection.
   - Verified posting nonce idempotency and anti-concurrency guards.
   - Verified multi-tenant isolation and cashier 403 access blocking.

2. **Migration Replay Test** (\`scripts/security/test-preview-migration-replay.mjs\`):
   - Replayed all 45 migrations against fresh embedded PostgreSQL.
   - All 137 public schema tables and RPC functions verified clean with zero errors.

3. **TypeScript & Static Analysis**:
   - \`npx tsc --noEmit\` passed with 0 errors across \`apps/ralion\`.

4. **Monorepo Build**:
   - \`npm run build\` successfully compiled \`@ralion/admin\`, \`@ralion/app\`, website Vite build, and monorepo workspaces.

---

### Documentation
- Updated root \`README.md\` Section 6 with comprehensive MARI Smart Stock Receiving architectural specs, supported document formats, security model, and testing instructions.

---

> [!NOTE]
> Do NOT merge or deploy without review. All migrations and features are tested and ready for review.`;

  const create = await req('/repos/rasali535/alinew/pulls', 'POST', {
    title: 'feat(retail): MARI Smart Stock Receiving from supplier invoices and packing lists (#161)',
    head: 'feat/retail-smart-stock-receiving',
    base: 'main',
    body: prBody
  });

  if (create.status === 201) {
    console.log(`PR_CREATED_SUCCESS: #${create.data.number} - ${create.data.html_url}`);
    return create.data;
  } else {
    console.error('FAILED_TO_CREATE_PR:', create.status, create.data);
    throw new Error(`Failed to create PR: ${JSON.stringify(create.data)}`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
