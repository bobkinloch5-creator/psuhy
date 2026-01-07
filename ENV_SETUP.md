# Environment Variables Setup

Add these to your `.env.local` file:

```bash
# Existing variables
OPENAI_API_KEY=your_cometapi_key
POLYPIZZA_API_KEY=your_polypizza_key

# New - Required for Roblox Uploads
ROBLOX_OPEN_CLOUD_KEY=your_roblox_open_cloud_api_key
ROBLOX_USER_ID=your_roblox_user_id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Getting Roblox Open Cloud API Key

1. Go to https://create.roblox.com/credentials
2. Click "CREATE API KEY"
3. Name it "BlaxSmith AI Upload"
4. Add permissions: 
   - **asset:write** (required for uploads)
5. Set expiration or leave as "Never expires"
6. Copy the key and add to `.env.local`

## Getting Your Roblox User ID

1. Go to your Roblox profile
2. Copy the number from the URL: `https://www.roblox.com/users/YOUR_USER_ID/profile`
3. Add to `.env.local`
