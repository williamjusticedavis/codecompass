# Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Bun** (>= 1.0.0)

   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Docker Desktop** (includes Docker Compose)
   - Download from: https://www.docker.com/products/docker-desktop

3. **Anthropic API Key**
   - Sign up at: https://console.anthropic.com/
   - Create an API key

## Initial Setup

### 1. Install Bun

If you haven't installed Bun yet:

```bash
curl -fsSL https://bun.sh/install | bash
```

Then restart your terminal or run:

```bash
source ~/.bashrc  # or ~/.zshrc
```

### 2. Configure Environment Variables

A `.env` file has been created for you. Update it with your Anthropic API key:

```bash
# Edit .env file
# Replace 'your_claude_api_key_here' with your actual API key
```

### 3. Install Dependencies

```bash
bun install
```

### 4. Start Development Environment

The easiest way to start everything is using Docker:

```bash
bun run docker:dev:build
```

This will:

- Start PostgreSQL database with pgvector extension
- Start the backend API server (port 3000)
- Start the frontend dev server (port 5173)

### 5. Run Database Migrations

In a new terminal, run:

```bash
cd packages/backend
bun run db:push
```

This will create all the database tables based on the Drizzle schemas.

## Alternative: Manual Setup (without Docker)

If you prefer to run services manually:

### 1. Start PostgreSQL

Make sure PostgreSQL with pgvector is running locally on port 5432.

### 2. Update DATABASE_URL in .env

```
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/explain_codebase_dev
```

### 3. Install Dependencies

```bash
bun install
```

### 4. Run Migrations

```bash
cd packages/backend
bun run db:push
```

### 5. Start Backend

```bash
cd packages/backend
bun run dev
```

### 6. Start Frontend

In a new terminal:

```bash
cd packages/frontend
bun run dev
```

## Accessing the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Health Check**: http://localhost:3000/health

## Testing the Authentication Flow

1. Go to http://localhost:5173
2. You'll be redirected to the login page
3. Click "Sign up" to create a new account
4. Fill in your email, password, and optional name
5. You'll be logged in and redirected to the dashboard
6. Try logging out and logging back in

## Development Commands

### Root Level

```bash
# Start all services with Docker
bun run docker:dev

# Rebuild and start Docker services
bun run docker:dev:build

# Stop Docker services
bun run docker:down

# Run dev mode for all packages
bun run dev

# Build all packages
bun run build
```

### Backend

```bash
cd packages/backend

# Run in development mode
bun run dev

# Build for production
bun run build

# Start production build
bun run start

# Generate migration files
bun run db:generate

# Run migrations
bun run db:migrate

# Push schema changes (dev)
bun run db:push

# Open Drizzle Studio (database GUI)
bun run db:studio
```

### Frontend

```bash
cd packages/frontend

# Run in development mode
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## Troubleshooting

### Port Already in Use

If ports 3000 or 5173 are already in use:

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Find and kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Docker Issues

```bash
# Stop all containers
bun run docker:down

# Remove volumes and start fresh
docker-compose -f docker-compose.dev.yml down -v
bun run docker:dev:build
```

### Database Connection Issues

1. Check that PostgreSQL is running
2. Verify DATABASE_URL in .env is correct
3. Check that pgvector extension is installed
4. Try connecting manually: `psql postgresql://dev:dev@localhost:5432/explain_codebase_dev`

### Frontend Can't Connect to Backend

1. Check that backend is running on port 3000
2. Visit http://localhost:3000/health
3. Check CORS settings in backend .env
4. Verify VITE_API_URL in docker-compose.dev.yml

## Next Steps (Phase 2)

Once authentication is working, we'll implement:

1. GitHub repository connection
2. File upload functionality
3. Project management (CRUD)
4. Repository ingestion pipeline
5. File discovery service

## Getting Help

If you encounter issues:

1. Check the logs:

   ```bash
   docker-compose -f docker-compose.dev.yml logs -f
   ```

2. Restart services:

   ```bash
   bun run docker:down
   bun run docker:dev:build
   ```

3. Check that all environment variables are set correctly in `.env`
