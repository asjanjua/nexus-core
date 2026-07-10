-- Migration 0025: stripe_processed_events
-- Idempotency guard for Stripe webhook event delivery.
-- Stripe redelivers events on non-2xx responses (and occasionally on 2xx).
-- We insert the event ID before processing; a duplicate insert is rejected
-- by the unique constraint, letting us skip already-processed events safely.

CREATE TABLE IF NOT EXISTS stripe_processed_events (
  event_id    VARCHAR(255) PRIMARY KEY,
  event_type  VARCHAR(128) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-clean events older than 30 days (Stripe's max redelivery window is 3 days)
-- Run this periodically via cron or a cleanup job:
--   DELETE FROM stripe_processed_events WHERE processed_at < NOW() - INTERVAL '30 days';
