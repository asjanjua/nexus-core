-- 0037: Pro waitlist — capture Pro-plan intent at public launch, before Stripe
-- checkout exists. Launch is free; pricing is shown and Pro intent is collected
-- here, then invoiced manually for pilots. One intent record per workspace.

CREATE TABLE IF NOT EXISTS pro_waitlist (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email        VARCHAR(320) NOT NULL,
  name         VARCHAR(160),
  note         TEXT,
  created_by   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One Pro-intent record per workspace (re-submitting updates the same row).
CREATE UNIQUE INDEX IF NOT EXISTS idx_pro_waitlist_workspace
  ON pro_waitlist(workspace_id);
