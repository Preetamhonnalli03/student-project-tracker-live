# Student Project Tracker — Cloud Variant

## Overview
This project is a hands-on web app development cloud variant of the Student Project Tracker. It uses Vercel for hosting and Supabase PostgreSQL for cloud data storage.

The original SQLite project remains separate. Its local database records have not been migrated to Supabase.

## Technologies
- Node.js
- Express
- PostgreSQL
- Supabase
- Vercel

## Run Locally
1. Install the required Node.js version.
2. Install dependencies:
   ```powershell
   npm.cmd ci
   ```
3. Create a private `.env` file using `.env.example` as a guide.
4. Set `DATABASE_URL` in `.env` to your own Supabase PostgreSQL connection string.
5. Start the application:
   ```powershell
   npm.cmd start
   ```
6. Open `http://localhost:3000`.
7. Check `http://localhost:3000/api/health`.

## Database Setup
- `schema.sql` defines the PostgreSQL table.
- `DATABASE_URL` is a server-only environment variable.
- Never commit `.env` or publish database credentials.
- Each person running their own instance must configure their own database connection.

## Application Behaviour
The application uses shared demo records and does not have sign-in or user-specific accounts. Do not use sensitive or private data.

## Testing Status
- Local server starts successfully.
- Health endpoint returns `ok: true`.
- Creating and editing a project have been tested.
- Supabase Table Editor has been checked against the application data.

Additional checks, including deletion and persistence after restart, should be recorded only after they have been completed.

## Hosted Application
Hosted URL: To be added after deployment to Vercel.