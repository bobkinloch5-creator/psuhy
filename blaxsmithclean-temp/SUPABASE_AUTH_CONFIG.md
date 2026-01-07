# 🔧 Complete Supabase Configuration for Discord Login

## The Problem
After Discord login, you're stuck and not redirecting to /forge dashboard.

## The Solution
You need to configure TWO redirect URLs in Supabase.

---

## Step-by-Step Fix

### 1. Go to Supabase URL Configuration

**Direct Link:** https://supabase.com/dashboard/project/cccmtdxtcajozuqiytov/auth/url-configuration

### 2. Set Site URL

In the **"Site URL"** field, enter:
\`\`\`
https://blaxsmith.dev
\`\`\`

### 3. Add Redirect URLs

In the **"Redirect URLs"** section, add BOTH of these (click "+ Add URL" for each):

\`\`\`
https://blaxsmith.dev/auth/callback
\`\`\`

\`\`\`
https://blax-smith-ai-studio.vercel.app/auth/callback
\`\`\`

**IMPORTANT:** You need BOTH URLs. One for your custom domain, one for the Vercel domain.

### 4. Save Changes

Click **"Save"** at the bottom of the page.

---

## Expected Flow After Fix

1. Visit **blaxsmith.dev**
2. Click **"Login with Discord"**
3. Authorize on Discord
4. Gets redirected to Supabase
5. Supabase redirects to `/auth/callback`
6. Your callback creates/updates user
7. **Redirects to `/forge` dashboard** ✅

Total time: 2-3 seconds

---

## Test It

1. **Clear browser cache/cookies**
2. Go to `https://blaxsmith.dev`
3. Click "Login with Discord"
4. Should redirect to dashboard immediately!

---

## Still Not Working?

### Check Vercel Logs

1. Go to: https://vercel.com/daves-projects-84f694a5/blax-smith-ai-studio
2. Click "Deployments" → Latest deployment
3. Click "Runtime Logs"
4. Look for `[Auth Callback]` messages
5. Check for errors

### Verify Discord Settings

Go to: https://discord.com/developers/applications

Make sure your redirect URL is:
\`\`\`
https://cccmtdxtcajozuqiytov.supabase.co/auth/v1/callback
\`\`\`

(This should already be correct)

---

## Quick Reference

**Supabase Project:** cccmtdxtcajozuqiytov

**Required Settings:**
- Site URL: `https://blaxsmith.dev`
- Redirect URL 1: `https://blaxsmith.dev/auth/callback`
- Redirect URL 2: `https://blax-smith-ai-studio.vercel.app/auth/callback`

**Discord OAuth Redirect:**
- `https://cccmtdxtcajozuqiytov.supabase.co/auth/v1/callback`

Once configured, login will work perfectly! 🚀
