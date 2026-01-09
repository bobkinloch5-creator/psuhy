-- Create promo_codes table for BlaxSmith promo code system
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    credits INTEGER DEFAULT 50,
    max_uses INTEGER DEFAULT 100,
    uses INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Allow admins to read/write
CREATE POLICY "Admins can manage promo codes"
ON promo_codes
FOR ALL
USING (true);

-- Create promo_redemptions table to track who used what code
CREATE TABLE IF NOT EXISTS promo_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code_id UUID REFERENCES promo_codes(id),
    user_id UUID REFERENCES users(id),
    credits_received INTEGER,
    redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_redemptions(user_id);
