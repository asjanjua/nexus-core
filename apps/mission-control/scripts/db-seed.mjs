import { Pool } from "pg";
import crypto from "node:crypto";

function requireDbUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is required for db:seed");
  return dbUrl;
}

function hashPassword(password, salt) {
  const actualSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, actualSalt, 64).toString("hex");
  return { salt: actualSalt, hash };
}

async function main() {
  const pool = new Pool({ connectionString: requireDbUrl() });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const adminPassword = process.env.MISSION_CONTROL_PASSWORD || process.env.MISSION_CONTROL_PIN || "admin";
    const adminSecret = hashPassword(adminPassword);

    await client.query(
      `INSERT INTO tenants (id, name)
       VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING`,
      ["tenant-demo", "Demo Tenant"]
    );

    await client.query(
      `INSERT INTO workspaces (id, tenant_id, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      ["workspace-demo", "tenant-demo", "Demo Workspace"]
    );

    await client.query(
      `DELETE FROM roles
       WHERE user_id IN (
         SELECT id FROM users WHERE email = $1 AND id <> $2
       )`,
      ["admin@nexus.local", "admin"]
    );

    await client.query(`DELETE FROM users WHERE email = $1 AND id <> $2`, ["admin@nexus.local", "admin"]);

    await client.query(
      `INSERT INTO users (id, tenant_id, email, display_name, password_hash, password_salt, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (id) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         password_salt = EXCLUDED.password_salt,
         active = true`,
      ["admin", "tenant-demo", "admin@nexus.local", "Nexus Admin", adminSecret.hash, adminSecret.salt]
    );

    await client.query(
      `INSERT INTO roles (id, user_id, workspace_id, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      ["role-admin", "admin", "workspace-demo", "admin"]
    );

    await client.query(
      `INSERT INTO evidence_records (
        id, tenant_id, workspace_id, source_type, source_path, source_uri,
        source_timestamp, hash, sensitivity, extraction_confidence, ingestion_status, freshness_hours, body
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8, $9::sensitivity, $10, $11::ingestion_status, $12, $13),
      ($14, $15, $16, $17, $18, $19, $20::timestamptz, $21, $22::sensitivity, $23, $24::ingestion_status, $25, $26),
      ($27, $28, $29, $30, $31, $32, $33::timestamptz, $34, $35::sensitivity, $36, $37::ingestion_status, $38, $39)
      ON CONFLICT (id) DO NOTHING`,
      [
        "ev-001",
        "tenant-demo",
        "workspace-demo",
        "document",
        "/sources/board/board-pack-apr-2026.pdf",
        "gs://nexus-demo/board-pack-apr-2026.pdf",
        "2026-04-28T08:00:00Z",
        "sha256:boardpack001",
        "confidential",
        89,
        "processed",
        72,
        "Board pack flagged margin compression in segment B and unresolved pricing decision for Q3.",
        "ev-002",
        "tenant-demo",
        "workspace-demo",
        "slack",
        "#exec-thread/1744.1201",
        "slack://workspace-demo/C001/1744.1201",
        "2026-04-29T11:15:00Z",
        "sha256:slackthread002",
        "internal",
        82,
        "processed",
        48,
        "COO reported onboarding delays and handoff failures in KYC workflow.",
        "ev-003",
        "tenant-demo",
        "workspace-demo",
        "upload",
        "/uploads/risk-register-draft.docx",
        null,
        "2026-04-30T09:20:00Z",
        "sha256:riskdraft003",
        "restricted",
        41,
        "quarantined",
        24,
        "Draft register with personally identifiable details and incomplete extraction."
      ]
    );

    await client.query(
      `INSERT INTO recommendations (
        id, workspace_id, title, owner, status, confidence, created_at, updated_at
      )
      VALUES
      ($1, $2, $3, $4, $5::recommendation_status, $6, $7::timestamptz, $8::timestamptz),
      ($9, $10, $11, $12, $13::recommendation_status, $14, $15::timestamptz, $16::timestamptz)
      ON CONFLICT (id) DO NOTHING`,
      [
        "rec-001",
        "workspace-demo",
        "Close KYC handoff bottleneck in onboarding",
        "coo_agent",
        "in_review",
        84,
        "2026-04-29T12:00:00Z",
        "2026-04-29T12:00:00Z",
        "rec-002",
        "workspace-demo",
        "Resolve Q3 pricing decision with explicit margin floor",
        "ceo_agent",
        "draft",
        78,
        "2026-04-30T10:00:00Z",
        "2026-04-30T10:00:00Z"
      ]
    );

    await client.query(
      `INSERT INTO decisions (
        id, workspace_id, title, owner, rationale, status, decided_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::decision_status, $7::timestamptz)
      ON CONFLICT (id) DO NOTHING`,
      [
        "dec-001",
        "workspace-demo",
        "Partner replication remains deferred until post-pilot",
        "manager_agent",
        "Pilot must prioritize evidence and governance reliability before replication complexity.",
        "decided",
        "2026-04-30T13:30:00Z"
      ]
    );

    await client.query("COMMIT");
    console.log("Seed completed.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
