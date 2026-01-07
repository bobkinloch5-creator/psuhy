# Setting Up Sloyd Integration

## Step 1: Get Your Sloyd Pro Cookies

1. **Login to Sloyd:**
   - Go to https://app.sloyd.ai/labs/text-to-3d
   - Make sure you're logged in with your Pro account

2. **Open Browser DevTools:**
   - Press `F12` or right-click → Inspect
   - Go to the **Network** tab

3. **Make a Test Generation:**
   - Type any prompt and click generate
   - Look for a request to `generate` in the Network tab

4. **Copy Request Headers:**
   - Click on the `generate` request
   - Go to the **Headers** tab
   - Find the `Cookie` header
   - Copy the ENTIRE cookie string

## Step 2: Add to Vercel Environment Variables

1. **Go to Vercel Dashboard:**
   - https://vercel.com/daves-projects-84f694a5/blax-smith-ai-studio/settings/environment-variables

2. **Add New Variable:**
   - Name: `SLOYD_COOKIE`
   - Value: (paste the entire cookie string)
   - Environment: Production, Preview, Development

3. **Redeploy:**
   ```bash
   vercel --prod
   ```

## Cookie Format Example

Your cookie should look something like:
```
_sloyd_session=abc123...; user_token=xyz789...; other_cookies=...
```

## Testing

After setting the cookie:
1. Go to https://blaxsmith.dev/forge
2. Try generating a model
3. Should work using your Sloyd Pro account! 🎉

## Notes

- Cookies may expire - you'll need to update them periodically
- Keep cookies secure - don't share them
- This uses YOUR Sloyd Pro credits for all generations
