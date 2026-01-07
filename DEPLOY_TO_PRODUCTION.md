# 🚀 Deployment Guide for blaxsmith.dev

## Pre-Deployment Checklist

### 1. Environment Variables (Vercel Dashboard)

Set these in your Vercel project settings:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://cccmtdxtcajozuqiytov.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_cYyINgI0cnnTPRrzzB4g2Q_XNh6CnD5
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Site URL (IMPORTANT!)
NEXT_PUBLIC_SITE_URL=https://blaxsmith.dev

# AI APIs
OPENAI_API_KEY=your_cometapi_key
POLYPIZZA_API_KEY=your_polypizza_key

# Roblox (for uploads)
ROBLOX_OPEN_CLOUD_KEY=your_roblox_key
ROBLOX_USER_ID=your_roblox_user_id
```

### 2. Supabase Configuration

#### Site URL
- Go to: https://supabase.com/dashboard/project/cccmtdxtcajozuqiytov/auth/url-configuration
- Set **Site URL** to: `https://blaxsmith.dev`

#### Redirect URLs
Add these (one per line):
```
https://blaxsmith.dev
https://blaxsmith.dev/auth/callback
http://localhost:3000
http://localhost:3000/auth/callback
```

### 3. Discord Developer Portal

Add redirect URL:
```
https://cccmtdxtcajozuqiytov.supabase.co/auth/v1/callback
```

### 4. Database Migration

Run in Supabase SQL Editor:
```sql
-- scripts/008-complete-platform.sql
-- (Copy and paste the entire file)
```

---

## Deployment Commands

### Option 1: Vercel CLI (Recommended)
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy to production
vercel --prod
```

### Option 2: Git Push (if connected to GitHub)
```bash
git add .
git commit -m "Complete platform build with all features"
git push origin main
```

Vercel will auto-deploy from your main branch.

---

## Post-Deployment Testing

### 1. Visit blaxsmith.dev
- Landing page loads ✅
- Discord login button visible ✅

### 2. Test Login Flow
- Click "Login with Discord"
- Discord authorization page appears
- After authorization, redirects to blaxsmith.dev/forge ✅

### 3. Test Features
- Generate a 3D model
- Open AI chat sidebar
- Create a project
- Download model (FBX/OBJ/GLTF)
- Upload to Roblox

---

## Troubleshooting

**Issue**: Login redirects to wrong URL
- Check `NEXT_PUBLIC_SITE_URL` in Vercel env vars
- Verify Supabase Site URL = `https://blaxsmith.dev`

**Issue**: Database errors
- Run migration script in Supabase
- Check service role key is set

**Issue**: Features not working
- Check all API keys are set in Vercel
- Redeploy after adding env vars

---

## Quick Deploy Checklist

- [ ] Vercel env vars configured
- [ ] Supabase Site URL = blaxsmith.dev
- [ ] Supabase redirect URLs added
- [ ] Discord callback URL added
- [ ] Database migration executed
- [ ] Deploy command run
- [ ] Test login flow
- [ ] Verify all features work
