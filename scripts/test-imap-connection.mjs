#!/usr/bin/env node
/**
 * Standalone IMAP connection test — exercises the same connect/login/logout
 * path as lib/connectors/imap.ts's verifyConnection(), without needing the
 * Next.js app, the database, or auth running.
 *
 * Usage:
 *   npm install   (once, to pull in imapflow — already added to package.json)
 *   node scripts/test-imap-connection.mjs <host> <port> <username> <password> [secure]
 *
 * Example (Gmail, app password required — not your normal password):
 *   node scripts/test-imap-connection.mjs imap.gmail.com 993 you@gmail.com 'app-password' true
 *
 * Example (generic cPanel/Hostinger/Spacemail mailbox):
 *   node scripts/test-imap-connection.mjs mail.yourdomain.com 993 you@yourdomain.com 'password' true
 */

import { ImapFlow } from "imapflow";

const [host, portArg, username, password, secureArg] = process.argv.slice(2);

if (!host || !portArg || !username || !password) {
  console.error(
    "Usage: node scripts/test-imap-connection.mjs <host> <port> <username> <password> [secure=true]"
  );
  process.exit(1);
}

const port = Number(portArg);
const secure = secureArg === undefined ? true : secureArg !== "false";

console.log(`Connecting to ${host}:${port} (secure=${secure}) as ${username} ...`);

const client = new ImapFlow({
  host,
  port,
  secure,
  auth: { user: username, pass: password },
  logger: false,
});

try {
  await client.connect();
  console.log("LOGIN OK");

  const list = await client.list();
  console.log(`Mailboxes found: ${list.length}`);
  for (const box of list.slice(0, 10)) {
    console.log(`  - ${box.path}`);
  }

  const lock = await client.getMailboxLock("INBOX");
  try {
    const exists = client.mailbox && typeof client.mailbox !== "boolean" ? client.mailbox.exists : 0;
    console.log(`INBOX message count: ${exists}`);
  } finally {
    lock.release();
  }

  console.log("\nCONNECTION TEST PASSED");
} catch (err) {
  console.error("\nCONNECTION TEST FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  try {
    await client.logout();
  } catch {
    // best effort
  }
}
