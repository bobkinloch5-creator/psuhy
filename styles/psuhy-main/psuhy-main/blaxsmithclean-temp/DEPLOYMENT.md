# 🚀 Complete Deployment Guide - Environment Variables

## 📋 All Required Environment Variables

Copy these EXACTLY into your `.env.local` file or Vercel Dashboard:

### ✅ Supabase (Database & Auth)
\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=https://cccmtdxtcajozuqiytov.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_cYyINgI0cnnTPRrzzB4g2Q_XNh6CnD5
SUPABASE_SERVICE_ROLE_KEY=sb_secret_AE3Jkl8LXlvjxiY9hbJpTw_rV1Knph9
\`\`\`

### ✅ AI Models (ForgeMind)
\`\`\`bash
OPENAI_API_KEY=sk-8EKoYMR1zYg8RAZDHzY0RIWo3HFcAyyGwjFAmmJoMz9jXFRP
\`\`\`

### Optional
\`\`\`bash
# Roblox Studio Plugin (Optional)
ROBLOX_API_TOKEN=your_token_here

# Direct Database Access (Optional - for CLI tools)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.cccmtdxtcajozuqiytov.supabase.co:5432/postgres
\`\`\`

---

## 🖥️ Local Development Setup

### 1. Create `.env.local` File
\`\`\`bash
cd c:\Users\david\Downloads\blax-smith-ai-studio
\`\`\`

Create `.env.local` with this content:
\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=https://cccmtdxtcajozuqiytov.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_cYyINgI0cnnTPRrzzB4g2Q_XNh6CnD5
SUPABASE_SERVICE_ROLE_KEY=sb_secret_AE3Jkl8LXlvjxiY9hbJpTw_rV1Knph9
OPENAI_API_KEY=sk-8EKoYMR1zYg8RAZDHzY0RIWo3HFcAyyGwjFAmmJoMz9jXFRP
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Run Database Migrations
Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/cccmtdxtcajozuqiytov/sql/new)

Run these files in order:
1. `scripts/001-create-tables.sql`
2. `scripts/002-subscriptions.sql`
3. `scripts/003-admin-setup.sql`
4. `scripts/004-separate-credits.sql`
5. `scripts/005-sloyd-integration.sql`
6. `scripts/006-sync-enhancements.sql`

### 4. Start Development Server
\`\`\`bash
npm run dev
\`\`\`

Visit: `http://localhost:3000`

---

## ☁️ Vercel Production Deployment

### 1. Set Environment Variables in Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these **4 variables** (Production + Preview + Development):

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cccmtdxtcajozuqiytov.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_cYyINgI0cnnTPRrzzB4g2Q_XNh6CnD5` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_AE3Jkl8LXlvjxiY9hbJpTw_rV1Knph9` |
| `OPENAI_API_KEY` | `sk-8EKoYMR1zYg8RAZDHzY0RIWo3HFcAyyGwjFAmmJoMz9jXFRP` |

### 2. Deploy to Vercel

**Option A: Git Deploy (Recommended)**
\`\`\`bash
git add .
git commit -m "Deploy ForgeMind with Supabase"
git push
\`\`\`
Vercel auto-deploys from GitHub.

**Option B: CLI Deploy**
\`\`\`bash
vercel --prod
\`\`\`

### 3. Verify Deployment
- Visit your Vercel URL
- Login with Discord
- Check Supabase → Table Editor → users (should see your account)
- Test ForgeMind generation

---

## 🔧 Backend Always Running

Your backend runs on **Vercel Serverless Functions**:
- ✅ Auto-scales automatically
- ✅ Zero downtime
- ✅ Always available (99.99% uptime)
- ✅ No server management needed

**API Routes** (serverless functions):
- `/api/generate/script` - ForgeMind script generation
- `/api/generate/world` - ForgeMind world generation
- `/api/generate/system` - ForgeMind system generation
- `/api/auth/*` - Supabase authentication

These run on-demand when called. No need to keep a server running!

---

## ✅ Verification Checklist

After deployment:

- [ ] Environment variables set in Vercel
- [ ] Database migrations run in Supabase
- [ ] Site loads at Vercel URL
- [ ] Discord login works
- [ ] User appears in Supabase users table
- [ ] ForgeMind generates scripts
- [ ] ForgeMind generates worlds
- [ ] Credits deduct properly
- [ ] goldbergjoe100 has 999,999 credits

---

## 🆘 Troubleshooting

**"Supabase connection failed"**
- Check environment variables are EXACTLY as shown
- Verify Supabase project is not paused

**"AI generation not working"**
- Verify `OPENAI_API_KEY` is set
- Check CometAPI account has credits

**"User not found"**
- Run database migrations
- Check Discord OAuth is configured in Supabase

**"No credits"**
- Run `003-admin-setup.sql` migration
- Login as goldbergjoe100

---

## 🎯 Summary

**Required Variables (4):**
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`
4. `OPENAI_API_KEY`

**Backend:** Always running on Vercel (serverless, auto-scaling)

**You're ready to deploy!** 🚀
