/**
 * IMAP Email connector — second connector runtime (see docs/ARCHITECTURE.md §13).
 *
 * Unlike every other connector in this codebase, IMAP is protocol-level,
 * not provider-level: there is no "Spacemail connector" or "Hostinger
 * connector," just one configurable IMAP-over-TLS connector that works
 * against any standards-compliant mail server (same approach Thunderbird
 * and Apple Mail take). There is no OAuth dance — the user supplies
 * host/port/username/password directly, which get encrypted at rest via
 * the same `repository.upsertConnector` path every other connector uses.
 *
 * This file requires the `imapflow` and `mailparser` packages, which are
 * NOT used anywhere else in this codebase (every other connector is pure
 * `fetch()`). They are necessary here because IMAP is a stateful TCP/TLS
 * protocol, not a REST API — there is no way to speak it with `fetch()`.
 * Run `npm install` after pulling this change.
 *
 * No POP3 support — IMAP only, by design (see ARCHITECTURE.md §13).
 */

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImapConnectionConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export interface ImapMailboxSummary {
  path: string;
  name: string;
  delimiter: string;
  flags: string[];
}

export interface ImapMessageSummary {
  uid: number;
  subject?: string;
  from?: string;
  date?: string;
  seen: boolean;
}

export interface ImapMessageList {
  mailbox: string;
  messages: ImapMessageSummary[];
  total: number;
}

export interface ImapMessageFull {
  uid: number;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Connection helper
// ---------------------------------------------------------------------------

function buildClient(config: ImapConnectionConfig): ImapFlow {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
    logger: false,
  });
}

/**
 * Opens a connection, logs in, and immediately logs out. Used to validate
 * server settings and credentials at "connect" time before storing them.
 * Throws with a readable message on any failure (DNS, TLS, auth, etc).
 */
export async function verifyConnection(config: ImapConnectionConfig): Promise<void> {
  const client = buildClient(config);
  try {
    await client.connect();
  } catch (err) {
    const message = err instanceof Error ? err.message : "imap_connect_failed";
    throw new Error(message);
  } finally {
    try {
      await client.logout();
    } catch {
      // best effort — connection may already be dead
    }
  }
}

/** Lists mailboxes (folders) available on the account. */
export async function listMailboxes(
  config: ImapConnectionConfig
): Promise<ImapMailboxSummary[]> {
  const client = buildClient(config);
  await client.connect();
  try {
    const list = await client.list();
    return list.map((box) => ({
      path: box.path,
      name: box.name,
      delimiter: box.delimiter,
      flags: Array.from(box.flags ?? []),
    }));
  } finally {
    await client.logout();
  }
}

/**
 * Lists the most recent messages in a mailbox (default INBOX), newest
 * first, using envelope data only (no body fetch — cheap for browsing).
 */
export async function listMessages(
  config: ImapConnectionConfig,
  mailbox = "INBOX",
  limit = 50
): Promise<ImapMessageList> {
  const client = buildClient(config);
  await client.connect();
  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      const status = client.mailbox && typeof client.mailbox !== "boolean" ? client.mailbox : undefined;
      const total = status?.exists ?? 0;
      if (total === 0) {
        return { mailbox, messages: [], total: 0 };
      }

      const start = Math.max(1, total - limit + 1);
      const range = `${start}:${total}`;

      const messages: ImapMessageSummary[] = [];
      for await (const msg of client.fetch(range, { envelope: true, flags: true, uid: true })) {
        messages.push({
          uid: msg.uid,
          subject: msg.envelope?.subject ?? undefined,
          from: msg.envelope?.from?.[0]?.address ?? undefined,
          date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : undefined,
          seen: msg.flags ? msg.flags.has("\\Seen") : false,
        });
      }

      messages.reverse(); // newest first
      return { mailbox, messages, total };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * Fetches a single message by UID, downloads the raw RFC822 source, and
 * parses it with mailparser to extract a plain-text body and headers.
 */
export async function getMessage(
  config: ImapConnectionConfig,
  mailbox: string,
  uid: number
): Promise<ImapMessageFull> {
  const client = buildClient(config);
  await client.connect();
  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      const download = await client.download(String(uid), undefined, { uid: true });
      if (!download?.content) {
        throw new Error("imap_message_not_found");
      }

      const chunks: Buffer[] = [];
      for await (const chunk of download.content) {
        chunks.push(Buffer.from(chunk));
      }
      const raw = Buffer.concat(chunks);

      const parsed = await simpleParser(raw);

      return {
        uid,
        subject: parsed.subject,
        from: parsed.from?.text,
        to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map((t) => t.text).join(", ") : parsed.to.text) : undefined,
        date: parsed.date ? parsed.date.toISOString() : undefined,
        text: parsed.text ?? (parsed.html ? parsed.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : ""),
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}
