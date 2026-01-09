# BlaxSmith AI - Forge Your Roblox World

AI-powered creation studio for Roblox developers. Generate 3D models, worlds, scripts, and game systems instantly with natural language prompts.

## Features

- **3D Model Generation**: Create characters, props, and buildings with AI
- **World Generation**: Generate complete environments with lighting and terrain
- **Script Generation**: AI-powered Lua scripts for any game mechanic
- **System Generation**: Complete game systems like inventory, combat, or quests
- **Roblox Studio Integration**: Direct plugin connection for seamless workflow
- **Discord Authentication**: Secure login with Discord OAuth
- **Generation Credits**: 50 free generations per month

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Discord OAuth
- **AI**: PollyPizza (3D models), OpenAI GPT-4 (scripts & worlds)
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your credentials
3. Install dependencies: `npm install`
4. Run database migrations (see `scripts/` folder)
5. Start dev server: `npm run dev`

## Database Setup

1. Create a Supabase project
2. Run the SQL scripts in the `scripts/` folder in order
3. Enable Discord OAuth in Supabase Authentication settings
4. Add your environment variables

## Roblox Studio Plugin

1. Download `BlaxSmith_Plugin.lua` from the `public/` folder
2. Install in Roblox Studio as a plugin
3. Update the `APP_URL` in the plugin to your deployment URL
4. Click "Connect" in Studio to link with your web session

## Environment Variables

See `.env.example` for required environment variables.

## License

MIT License - See LICENSE file for details

## Support

Join our Discord community or visit blaxsmith.dev for help and updates.
