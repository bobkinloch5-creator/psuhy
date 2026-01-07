# BlaxSmith AI - Setup Instructions

## Database Setup

The app requires a Supabase database with the proper schema. Follow these steps:

### 1. Run the Database Migration

Execute the SQL script to create all necessary tables:

1. Open the v0 preview
2. Navigate to the Scripts panel (bottom of the screen)
3. Find `scripts/001-create-tables.sql`
4. Click "Run Script"

This will create:
- `users` table - Discord OAuth users with generation credits
- `creations` table - Generated models, worlds, scripts, systems
- `studio_sessions` table - Roblox Studio connections
- `command_queue` table - Commands to send to Studio plugin

### 2. Enable Row Level Security (Optional but Recommended)

For production, enable RLS policies in Supabase dashboard:

\`\`\`sql
-- Users can only read their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (discord_id = auth.uid());

-- Users can only access their own creations
ALTER TABLE creations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own creations" ON creations FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE discord_id = auth.uid())
);
\`\`\`

### 3. Environment Variables

The following are already configured:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

You need to add:
- `OPENAI_API_KEY` - Your OpenAI API key (sk-ox74OSjMATMz3zJer9UEdAxYA4FESCHDXmsj82t1bvL0v1RZ)
- `POLYPIZZA_API_KEY` - For 3D model generation (get from polypizza.com)
- `NEXT_PUBLIC_SITE_URL` - Your site URL for OAuth redirects

### 4. Discord OAuth Setup

1. Go to https://discord.com/developers/applications
2. Create a new application
3. Enable OAuth2
4. Add redirect URL: `YOUR_SITE_URL/auth/callback`
5. Copy Client ID and Secret
6. In Supabase Dashboard → Authentication → Providers → Discord
7. Enable Discord provider and paste credentials

### 5. Roblox Studio Plugin

1. Download `public/BlaxSmith_Plugin.lua`
2. Open Roblox Studio
3. Go to Plugins folder
4. Create new Script and paste the plugin code
5. Publish as Plugin
6. Update the `API_URL` in the plugin to your site URL

## Testing the Connection Flow

1. Click "Login with Discord" on landing page
2. Authorize with Discord
3. You should be redirected to `/forge`
4. Your user should have 50 generation credits
5. Try generating a model, world, or script
6. Check that credits decrement properly

## Troubleshooting

### "User not found in database"
- Make sure the SQL migration ran successfully
- Check Supabase logs for insert errors
- Verify Discord OAuth is configured correctly

### "Generation failed"
- Check that OPENAI_API_KEY is set correctly
- Check that POLYPIZZA_API_KEY is set
- Verify AI SDK is working (check console logs)
- Ensure user has credits remaining

### Roblox Studio not connecting
- Update API_URL in plugin to match your deployed URL
- Check network requests in Studio output
- Verify CORS settings allow Studio requests
