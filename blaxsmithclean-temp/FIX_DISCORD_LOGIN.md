# 🔧 Fix Discord Login Redirect Issue

## Problem
After Discord login, you see "Discord App Launched" page but it doesn't redirect to the dashboard.

## Solution

### Step 1: Configure Supabase URLs

Go to: **https://supabase.com/dashboard/project/cccmtdxtcajozuqiytov/auth/url-configuration**

#### Set Site URL:
\`\`\`
https://blaxsmith.dev
\`\`\`

#### Set Redirect URLs (add both):
\`\`\`
https://blaxsmith.dev/auth/callback
https://blax-smith-ai-studio.vercel.app/auth/callback
\`\`\`

### Step 2: Verify Discord Developer Portal

Go to: **https://discord.com/developers/applications**

Find your app → OAuth2 → Redirects

**Make sure this is there:**
\`\`\`
https://cccmtdxtcajozuqiytov.supabase.co/auth/v1/callback
\`\`\`

### Step 3: Test Login Flow

1. Clear browser cookies/cache
2. Go to https://blaxsmith.dev
3. Click "Login with Discord"
4. Authorize the app
5. You should be redirected to `/forge` dashboard automatically

---

## Expected Flow

1. **Click Login** → Redirects to Discord OAuth
2. **Authorize App** → Redirects to Supabase callback
3. **Supabase Callback** → Redirects to `/auth/callback`
4. **Your Auth Callback** → Creates/updates user → Redirects to `/forge`
5. **Forge Dashboard** → You're in!

The whole process should take 2-3 seconds.

---

## Still Not Working?

### Check Vercel Logs
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click latest deployment → Runtime Logs
3. Look for `[Auth Callback]` messages
4. Check for any errors

### Common Issues

**Issue**: Stuck on "Discord App Launched"
- **Fix**: Supabase Site URL is wrong or missing

**Issue**: 404 after Discord auth
- **Fix**: Redirect URLs not configured in Supabase

**Issue**: Loops back to login page
- **Fix**: User not being created in database - check RLS policies

---

## Quick Fix Commands

If you need to reset your session:

\`\`\`javascript
// In browser console on blaxsmith.dev
localStorage.clear()
sessionStorage.clear()
location.reload()
\`\`\`

Then try logging in again.

---

## ✅ Correct Configuration Summary

**Supabase Site URL:**
- `https://blaxsmith.dev`

**Supabase Redirect URLs:**
- `https://blaxsmith.dev/auth/callback`
- `https://blax-smith-ai-studio.vercel.app/auth/callback`

**Discord Redirect URL:**
- `https://cccmtdxtcajozuqiytov.supabase.co/auth/v1/callback`

Once all three are configured correctly, Discord login will work perfectly! 🚀
