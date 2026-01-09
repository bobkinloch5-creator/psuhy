-- Audit Logging System
-- Tracks all credit usage, generations, and suspicious activity

-- Credit transaction log (tracks every credit change)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deduction', 'addition', 'refund', 'admin_grant')),
    credit_type TEXT NOT NULL CHECK (credit_type IN ('generation', 'model', 'world')),
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reason TEXT NOT NULL,
    creation_id UUID REFERENCES creations(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin action log (tracks all admin actions)
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suspicious activity log (flags potential hacking attempts)
CREATE TABLE IF NOT EXISTS suspicious_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('rapid_requests', 'invalid_credits', 'tampering_attempt', 'unusual_pattern')),
    details JSONB,
    ip_address TEXT,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user ON suspicious_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_unresolved ON suspicious_activity(resolved) WHERE resolved = FALSE;

-- RLS for audit tables
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activity ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all credit transactions" ON credit_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE discord_id = auth.uid()::text AND is_admin = TRUE)
  );

CREATE POLICY "Admins can view all admin logs" ON admin_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE discord_id = auth.uid()::text AND is_admin = TRUE)
  );

CREATE POLICY "Admins can view suspicious activity" ON suspicious_activity
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE discord_id = auth.uid()::text AND is_admin = TRUE)
  );

-- Function to log credit transactions
CREATE OR REPLACE FUNCTION log_credit_transaction(
    p_user_id UUID,
    p_transaction_type TEXT,
    p_credit_type TEXT,
    p_amount INTEGER,
    p_balance_before INTEGER,
    p_balance_after INTEGER,
    p_reason TEXT,
    p_creation_id UUID DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    transaction_id UUID;
BEGIN
    INSERT INTO credit_transactions (
        user_id, transaction_type, credit_type, amount, 
        balance_before, balance_after, reason, creation_id, ip_address
    ) VALUES (
        p_user_id, p_transaction_type, p_credit_type, p_amount,
        p_balance_before, p_balance_after, p_reason, p_creation_id, p_ip_address
    ) RETURNING id INTO transaction_id;
    
    RETURN transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION check_suspicious_activity(
    p_user_id UUID,
    p_ip_address TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    recent_generations INTEGER;
    credit_mismatches INTEGER;
BEGIN
    -- Check for rapid generations (>10 in 1 minute)
    SELECT COUNT(*) INTO recent_generations
    FROM creations
    WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 minute';
    
    IF recent_generations > 10 THEN
        INSERT INTO suspicious_activity (user_id, activity_type, details, ip_address, severity)
        VALUES (p_user_id, 'rapid_requests', 
                jsonb_build_object('count', recent_generations, 'timeframe', '1 minute'),
                p_ip_address, 'high');
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE credit_transactions IS 'Complete audit trail of all credit changes';
COMMENT ON TABLE admin_logs IS 'Tracks all administrative actions for accountability';
COMMENT ON TABLE suspicious_activity IS 'Flags potential hacking and abuse attempts';
