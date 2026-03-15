# Wavebook - Surf Session Tracking & Prediction App

Track your surf sessions, analyze conditions, and get personalized predictions for the best times to surf based on your history.

## Features

- **Surf Spots**: Mark your favorite surf spots on an interactive map
- **Session Logging**: Log sessions with rating, notes, and photos
- **Automatic Conditions**: Fetch historical weather/surf conditions for each session
- **Google Calendar Integration**: See when you're free to surf
- **Surf Predictions**: Get personalized surf predictions based on your past sessions
- **Golden Windows**: Find times when good conditions align with your availability

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM
- **Auth**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS + shadcn/ui
- **Maps**: Mapbox GL JS
- **Weather API**: Open-Meteo Marine API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Google Cloud Console project (for OAuth)
- Mapbox account

### 1. Clone and Install

```bash
cd wavebook
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration in `drizzle/migrations/0000_initial.sql`
3. Go to Storage and create a new public bucket called `session-photos`
4. Copy your project URL and keys from Settings > API

### 3. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the Google Calendar API
4. Go to Credentials > Create Credentials > OAuth Client ID
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
7. Copy Client ID and Client Secret

### 4. Get Mapbox Token

1. Sign up at [mapbox.com](https://mapbox.com)
2. Go to Account > Tokens
3. Copy your default public token

### 5. Configure Environment Variables

Copy `.env.local` and fill in your values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
wavebook/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login pages
│   │   ├── (dashboard)/      # Main app pages
│   │   │   ├── spots/        # Surf spots management
│   │   │   ├── sessions/     # Session logging
│   │   │   ├── predictions/  # Surf predictions
│   │   │   └── settings/     # User settings
│   │   └── api/              # API routes
│   ├── components/
│   │   ├── ui/               # shadcn components
│   │   ├── map/              # Map components
│   │   ├── sessions/         # Session components
│   │   ├── predictions/      # Prediction components
│   │   └── calendar/         # Calendar components
│   ├── lib/
│   │   ├── db/               # Database schema & client
│   │   ├── api/              # API clients
│   │   ├── matching/         # Prediction algorithm
│   │   └── utils/            # Utilities
│   └── types/                # TypeScript types
├── drizzle/
│   └── migrations/           # Database migrations
└── public/
```

## How Predictions Work

Wavebook compares upcoming forecast conditions to your past sessions to find similar conditions to days you rated highly.

**Matching criteria**:
- Wave height within +/-0.5m
- Swell direction within +/-30 degrees
- Swell period within +/-3 seconds
- Wind speed within +/-10 km/h

The more sessions you log, the more accurate predictions become!

## API Reference

### Open-Meteo Marine API

The app uses the free Open-Meteo Marine API for:
- 16-day marine forecasts
- Historical conditions (ERA5 reanalysis data from 1940)
- Wave height, period, direction
- Swell data (primary, secondary)
- Wind conditions
- Sea surface temperature

No API key required for free tier.

## Deployment

### Vercel

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

Remember to update `NEXTAUTH_URL` and Google OAuth redirect URIs for production.

## License

MIT
