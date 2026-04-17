-- ============================================================
-- Missed Call Recovery Dashboard — Schema Additions
-- Run this in the Supabase SQL Editor (one-time setup)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extend the businesses table
-- ------------------------------------------------------------
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS plan       text NOT NULL DEFAULT 'Standard';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status     text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'inactive'));
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);

-- Update the plan column default if you had an older constraint:
-- ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_plan_check;

-- ------------------------------------------------------------
-- 2. Extend the conversations table
-- ------------------------------------------------------------
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS appointments_booked int NOT NULL DEFAULT 0;

-- ------------------------------------------------------------
-- 3. Row Level Security
-- ------------------------------------------------------------
ALTER TABLE businesses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop any stale policies before re-creating them
DROP POLICY IF EXISTS "Admin read all businesses"       ON businesses;
DROP POLICY IF EXISTS "Admin insert businesses"         ON businesses;
DROP POLICY IF EXISTS "Admin update businesses"         ON businesses;
DROP POLICY IF EXISTS "Client read own business"        ON businesses;
DROP POLICY IF EXISTS "Admin read all conversations"    ON conversations;
DROP POLICY IF EXISTS "Client read own conversations"   ON conversations;
DROP POLICY IF EXISTS "Service role full access businesses"   ON businesses;
DROP POLICY IF EXISTS "Service role full access conversations" ON conversations;

-- ── businesses ──────────────────────────────────────────────
-- Admin (bgordon@southpeak-systems.com) can do everything
CREATE POLICY "Admin full access businesses" ON businesses
  USING   (auth.jwt() ->> 'email' = 'bgordon@southpeak-systems.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'bgordon@southpeak-systems.com');

-- Clients can read only the row whose client_email matches their login
CREATE POLICY "Client read own business" ON businesses
  FOR SELECT
  USING (client_email = auth.jwt() ->> 'email');

-- ── conversations ────────────────────────────────────────────
-- Admin can read all conversations
CREATE POLICY "Admin read all conversations" ON conversations
  FOR SELECT
  USING (auth.jwt() ->> 'email' = 'bgordon@southpeak-systems.com');

-- Clients can read conversations belonging to their business
CREATE POLICY "Client read own conversations" ON conversations
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses
      WHERE client_email = auth.jwt() ->> 'email'
    )
  );

-- Express backend uses the service role key — bypasses RLS automatically.
-- No extra policy needed; service_role always bypasses RLS in Supabase.

-- ------------------------------------------------------------
-- 4. Useful indexes (idempotent)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS businesses_client_email
  ON businesses (client_email);

CREATE INDEX IF NOT EXISTS conversations_business_appts
  ON conversations (business_id, appointments_booked);
