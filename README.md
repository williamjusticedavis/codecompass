# Explain My Codebase

An AI-powered developer onboarding and architecture understanding tool that helps developers quickly understand unfamiliar codebases.

## Features

- **Repository Analysis**: Connect GitHub repos or upload projects for automatic analysis
- **Architecture Insights**: AI-generated explanations of project structure and design patterns
- **Semantic Search**: Natural language search across your codebase
- **Dependency Visualization**: Interactive dependency graphs
- **Onboarding Guides**: Automatically generated guides for new developers

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, React Query
- **Backend**: Node.js, TypeScript, Express, Drizzle ORM
- **Database**: PostgreSQL with pgvector extension
- **AI**: Anthropic Claude API
- **Package Manager**: Bun
- **Infrastructure**: Docker

## Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- [Docker](https://www.docker.com/) and Docker Compose
- [Anthropic API Key](https://console.anthropic.com/)

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd explain-my-codebase
```

### 2. Install dependencies

```bash
bun install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
- `ANTHROPIC_API_KEY`: Your Claude API key
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token generation

### 4. Start the development environment

```bash
bun run docker:dev
```

This will start:
- PostgreSQL database (with pgvector)
- Backend API server
- Frontend development server

### 5. Access the application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Database: localhost:5432

## Development

### Available Scripts

- `bun run dev` - Start all packages in development mode
- `bun run build` - Build all packages for production
- `bun run docker:dev` - Start Docker development environment
- `bun run docker:dev:build` - Rebuild and start Docker development environment
- `bun run docker:down` - Stop Docker containers

### Project Structure

```
explain-my-codebase/
├── packages/
│   ├── frontend/       # React frontend application
│   ├── backend/        # Node.js API server
│   └── shared/         # Shared types and constants
├── infrastructure/     # Docker and infrastructure configs
└── docker-compose.yml  # Docker orchestration
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## License

MIT
