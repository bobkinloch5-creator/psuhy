# Supabase Connection Setup

## ✅ Your Supabase Instance

**Project URL:** `https://cccmtdxtcajozuqiytov.supabase.co`  
**Database Host:** `db.cccmtdxtcajozuqiytov.supabase.co`  
**Anon Key:** `sb_publishable_cYyINgI0cnnTPRrzzB4g2Q_XNh6CnD5`

## 📝 Environment Variables

Create `.env.local` in project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://cccmtdxtcajozuqiytov.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_cYyINgI0cnnTPRrzzB4g2Q_XNh6CnD5

# Get this from Supabase Dashboard → Settings → API → service_role (secret)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# AI Models
OPENAI_API_KEY=sk-8EKoYMR1zYg8RAZDHzY0RIWo3HFcAyyGwjFAmmJoMz9jXFRP

# Optional
ROBLOX_API_TOKEN=your_roblox_token_here
```

## 🔑 Get Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `cccmtdxtcajozuqiytov`
3. Settings → API
4. Copy `service_role` key (labeled as "secret")
5. Add to `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

## 🗄️ Run Database Migrations

In Supabase SQL Editor (Dashboard → SQL Editor), run these files in order:

1. **Create Tables**
   ```sql
   -- scripts/001-create-tables.sql
   ```

2. **Add Subscriptions**
   ```sql
   -- scripts/002-subscriptions.sql
   ```

3. **Setup Admin**
   ```sql
   -- scripts/003-admin-setup.sql
   ```

4. **Separate Credits**
   ```sql
   -- scripts/004-separate-credits.sql
   ```

5. **Sloyd Integration**
   ```sql
   -- scripts/005-sloyd-integration.sql
   ```

6. **Sync Enhancements**
   ```sql
   -- scripts/006-sync-enhancements.sql
   ```

## ✅ Verify Connection

Test locally:
```bash
npm run dev
```

Visit: `http://localhost:3000`
- Login with Discord
- Should create user in Supabase
- Check Supabase Dashboard → Table Editor → users

## 🚀 Deploy to Vercel

Set environment variables in Vercel Dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Then deploy:
```bash
vercel --prod
```

**All set!** Supabase is fully connected. 🎉
