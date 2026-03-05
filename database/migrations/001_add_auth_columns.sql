-- ============================================================================
-- MIGRATION 001 — Add auth + push notification columns to users table
-- Run in: Supabase Dashboard → SQL Editor → New Query → paste → Run
-- Date: 2026-03-03
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fcm_token     TEXT;

-- Remove the placeholder default now that the column exists
ALTER TABLE users
  ALTER COLUMN password_hash DROP DEFAULT;

-- ============================================================================
-- DONE
-- ============================================================================
