# 🔐 Discord OAuth Setup for blaxsmith.dev

## Quick Setup Checklist

- [ ] Update Supabase redirect URLs
- [ ] Update Discord Developer Portal
- [ ] Update Vercel environment variables
- [ ] Test login flow

---

## Step 1: Update Supabase

### A. Site URL
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/cccmtdxtcajozuqiytov/auth/url-configuration)
2. Find **"Site URL"**
3. Change to: `https://blaxsmith.dev`
4. Click **Save**

### B. Redirect URLs
1. In the same page, find **"Redirect URLs"**
2. Add these URLs (one per line):
```
https://blaxsmith.dev/auth/callback
https://blaxsmith.dev
http://localhost:3000/auth/callback
http://localhost:3000
```
3. Click **Save**

---

## Step 2: Update Discord Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your **BlaxSmith AI** application
3. Go to **OAuth2** → **General**
4. Under **"Redirects"**, add:
```
https://cccmtdxtcajozuqiytov.supabase.co/auth/v1/callback
https://blaxsmith.dev/auth/callback
```
5. Click **Save Changes**

---

## Step 3: Update Supabase Discord Provider

1. Go to [Auth Providers](https://supabase.com/dashboard/project/cccmtdxtcajozuqiytov/auth/providers)
2. Click on **Discord** provider
3. Verify these settings:
   - **Enabled**: ✅ ON
   - **Client ID**: Your Discord application ID
   - **Client Secret**: Your Discord application secret
   - **Redirect URL**: Should show `https://cccmtdxtcajozuqiytov.supabase.co/auth/v1/callback`
4. Click **Save**

---

## Step 4: Vercel Configuration (if deployed)

### Environment Variables
In your Vercel project dashboard, ensure these are set:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://cccmtdxtcajozuqiytov.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_cYyINgI0cnnTPRrzzB4g2Q_XNh6CnD5
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_cometapi_key
POLYPIZZA_API_KEY=your_polypizza_key
ROBLOX_OPEN_CLOUD_KEY=your_roblox_key
ROBLOX_USER_ID=your_roblox_user_id
```

### Custom Domain
If you've added `blaxsmith.dev` as a custom domain in Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add `blaxsmith.dev` and `www.blaxsmith.dev`
3. Configure DNS records as shown by Vercel

---

## Step 5: Test Login Flow

### Local Testing (localhost:3000)
1. `npm run dev`
2. Visit `http://localhost:3000`
3. Click "Login with Discord"
4. Should redirect to Discord
5. After authorization, redirect back to localhost ✅

### Production Testing (blaxsmith.dev)
1. Visit `https://blaxsmith.dev`
2. Click "Login with Discord"
3. Should redirect to Discord
4. After authorization, redirect back to blaxsmith.dev ✅

---

## Troubleshooting

### Issue: "404 Not Found" after Discord login
**Fix**: Check that Supabase "Site URL" is set to `https://blaxsmith.dev` (not localhost)

### Issue: "Redirect URI mismatch"
**Fix**: Ensure Discord Developer Portal has:
- `https://cccmtdxtcajozuqiytov.supabase.co/auth/v1/callback`
- `https://blaxsmith.dev/auth/callback`

### Issue: Login works locally but not in production
**Fix**: 
1. Verify Vercel environment variables are set
2. Check Supabase Site URL is `https://blaxsmith.dev`
3. Ensure custom domain is properly configured in Vercel

---

## Summary of Changes

| Setting | Old Value | New Value |
|---------|-----------|-----------|
| **Supabase Site URL** | `https://blax-smith-ai-studio.vercel.app` | `https://blaxsmith.dev` |
| **Discord Redirect** | `https://blax-smith-ai-studio.vercel.app/auth/callback` | `https://blaxsmith.dev/auth/callback` |
| **Supabase Redirect** | Old Vercel URL | `https://blaxsmith.dev` + callback |

---

## ✅ Verification Checklist

After completing all steps:
- [ ] Supabase Site URL = `https://blaxsmith.dev`
- [ ] Supabase has both localhost AND blaxsmith.dev redirects
- [ ] Discord has Supabase callback URL
- [ ] Vercel environment variables set
- [ ] Custom domain configured in Vercel
- [ ] Local login works (localhost)
- [ ] Production login works (blaxsmith.dev)

**All set! Your Discord OAuth is configured for blaxsmith.dev** 🚀
