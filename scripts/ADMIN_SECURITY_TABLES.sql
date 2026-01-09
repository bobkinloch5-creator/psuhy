-- =============================================
-- ADMIN PANEL SECURITY TABLES
-- Run this script in Supabase SQL Editor
-- =============================================

-- 1. Banned IPs table for VPN ban protection
CREATE TABLE IF NOT EXISTS banned_ips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    discord_id TEXT,
    reason TEXT,
    banned_by UUID REFERENCES users(id),
    fingerprint TEXT, -- Browser fingerprint for additional tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast IP lookups
CREATE INDEX IF NOT EXISTS idx_banned_ips_address ON banned_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_banned_ips_fingerprint ON banned_ips(fingerprint);

-- 2. IP tracking for users (store their known IPs)
CREATE TABLE IF NOT EXISTS user_ips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    fingerprint TEXT,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_vpn BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_user_ips_user ON user_ips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ips_address ON user_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_ips_fingerprint ON user_ips(fingerprint);

-- 3. Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    credits INTEGER NOT NULL DEFAULT 0,
    subscription_tier TEXT CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);

-- 4. Promo code redemptions tracking
CREATE TABLE IF NOT EXISTS promo_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    UNIQUE(promo_code_id, user_id) -- One user can only redeem each code once
);

-- 5. Security logging
CREATE TABLE IF NOT EXISTS security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL, -- 'ban', 'unban', 'ip_block', 'login_attempt', 'suspicious_activity'
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_time ON security_logs(created_at);

-- Grant permissions
GRANT ALL ON banned_ips TO authenticated;
GRANT ALL ON user_ips TO authenticated;
GRANT ALL ON promo_codes TO authenticated;
GRANT ALL ON promo_redemptions TO authenticated;
GRANT ALL ON security_logs TO authenticated;

-- Enable RLS (Row Level Security)
ALTER TABLE banned_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role access" ON banned_ips FOR ALL USING (true);
CREATE POLICY "Service role access" ON user_ips FOR ALL USING (true);
CREATE POLICY "Service role access" ON promo_codes FOR ALL USING (true);
CREATE POLICY "Service role access" ON promo_redemptions FOR ALL USING (true);
CREATE POLICY "Service role access" ON security_logs FOR ALL USING (true);

SELECT 'All tables created successfully!' as status;
