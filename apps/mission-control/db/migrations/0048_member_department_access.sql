-- Migration 0048: member_department_access
-- Extends reviewer_seats with per-member department scope and
-- sensitivity ceiling. Members are restricted to specific departments
-- and cannot access evidence above their sensitivity ceiling.
--
-- department_access: JSON array of department names the member can access.
--   NULL or empty array = all departments (backward compatible).
-- sensitivity_ceiling: max sensitivity the member can retrieve.
--   NULL = workspace default (backward compatible).
--   Values: public, internal, confidential, restricted.

ALTER TABLE reviewer_seats
  ADD COLUMN IF NOT EXISTS department_access JSONB DEFAULT '[]'::jsonb;

ALTER TABLE reviewer_seats
  ADD COLUMN IF NOT EXISTS sensitivity_ceiling VARCHAR(16);
