const { Client } = require('pg');

async function run() {
  const [,, workerId, connectionString, payloadJson] = process.argv;
  const payload = JSON.parse(payloadJson);

  const client = new Client({ connectionString });
  await client.connect();

  // Notify parent that worker is connected and ready
  if (process.send) {
    process.send({ type: 'READY', workerId });
  }

  // Wait for parent start signal via IPC or stdin
  await new Promise((resolve) => {
    process.once('message', (msg) => {
      if (msg === 'GO') resolve();
    });
    // Fallback timeout in case IPC signal is delayed
    setTimeout(resolve, 2000);
  });

  const startTime = Date.now();
  try {
    const query = `
      SELECT public.claim_social_publish_dispatch(
        $1::text, $2::text, $3::text, $4::text, $5::text, $6::text, $7::text
      ) AS result;
    `;
    const res = await client.query(query, [
      payload.userId,
      payload.organizationId,
      payload.workspaceId,
      payload.destination,
      payload.idempotencyKey,
      payload.bodyHash,
      null // lease_token generated in DB
    ]);

    const elapsed = Date.now() - startTime;
    const claimResult = res.rows[0].result;

    if (process.send) {
      process.send({
        type: 'RESULT',
        workerId,
        pid: process.pid,
        elapsed,
        claimResult
      });
    } else {
      console.log(JSON.stringify({ workerId, pid: process.pid, elapsed, claimResult }));
    }
  } catch (err) {
    if (process.send) {
      process.send({
        type: 'ERROR',
        workerId,
        pid: process.pid,
        error: err.message
      });
    }
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(`Worker error:`, err);
  process.exit(1);
});
