# Security Configuration for BlaxSmith AI

## Environment Variables (Set in Vercel Dashboard)

### Required Secrets
\`\`\`
OPENAI_API_KEY=sk-8EKoYMR1zYg8RAZDHzY0RIWo3HFcAyyGwjFAmmJoMz9jXFRP
\`\`\`

### Supabase (if not already set)
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
\`\`\`

## Security Checklist

### ✅ Already Implemented
- [x] Authentication via Supabase (Discord OAuth)
- [x] API route protection (user must be authenticated)
- [x] Row-level security in database
- [x] Credits system prevents abuse
- [x] Admin access restricted to goldbergjoe100 only
- [x] Plugin connection requirement
- [x] `.env.local` in `.gitignore` (secrets not committed)

### ⚠️ Important Security Settings

#### 1. Vercel Environment Variables
Set these in Vercel Project Settings → Environment Variables:
- `OPENAI_API_KEY` (Production)
- All Supabase keys (Production)

#### 2. Supabase RLS Policies
Ensure Row-Level Security is enabled on all tables:
- Users can only read their own data
- Only service role can modify credits
- Admin queries require is_admin = true

#### 3. Rate Limiting (Optional but Recommended)
Consider adding rate limiting middleware to prevent API abuse

#### 4. CORS Configuration
Already handled by Next.js defaults

#### 5. Security Headers
Next.js automatically adds security headers

## Post-Deployment Steps

1. **Set Environment Variables in Vercel**
   - Go to Vercel Dashboard
   - Project Settings → Environment Variables
   - Add `OPENAI_API_KEY` for Production

2. **Run Database Migrations**
   - Execute SQL scripts in Supabase
   - `002-subscriptions.sql`
   - `003-admin-setup.sql`

3. **Test Security**
   - Try accessing `/admin` without goldbergjoe100 account
   - Try generating without plugin connected
   - Try generating with 0 credits

## Monitoring Recommendations

- Enable Vercel Analytics
- Monitor API usage in CometAPI dashboard
- Check Supabase logs for suspicious activity
- Set up alerts for high credit usage
