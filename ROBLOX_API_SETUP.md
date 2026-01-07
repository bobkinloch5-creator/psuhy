# Roblox API Integration Setup

## Environment Variable Required

Add your Roblox API token to `.env.local`:

\`\`\`bash
# Required for Roblox Studio plugin connection
ROBLOX_API_TOKEN=your_roblox_token_here
\`\`\`

## Token Format

Your Roblox API token is a JWT (JSON Web Token) that contains:
- Authentication credentials
- User identification 
- Base API key
- Owner ID
- Expiration time

**CRITICAL**: Never share this token publicly or commit it to Git!

## Setup Steps

1. Create or update `.env.local`:
\`\`\`bash
cd c:\Users\david\Downloads\blax-smith-ai-studio

# Add to .env.local
ROBLOX_API_TOKEN=<your_token>
\`\`\`

2. Restart your development server:
\`\`\`bash
npm run dev
\`\`\`

3. The token will be used for:
- Roblox Studio plugin authentication
- Asset deployment to Roblox
- Toolbox asset recommendations
- World/model synchronization

## Security Notes

✅ Token is stored in `.env.local` (gitignored)
✅ Only used server-side 
✅ Never exposed to client
✅ Encrypted in transit

## Token Expiration

If your token expires, you'll need to:
1. Generate a new token in Roblox Creator Dashboard
2. Update `.env.local` with the new token
3. Restart the server

## Verification

To verify the token is working:
1. Connect Roblox Studio plugin
2. Check for "Connected" status in Forge
3. Try generating a world or system
