# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React Router + Tailwind)
- **Development**: `cd frontend && npm run dev` (starts dev server on port 3000)
- **Build**: `cd frontend && npm run build` 
- **Production**: `cd frontend && npm start`
- **Linting**: `cd frontend && npm run lint`
- **Type checking**: `cd frontend && npm run typecheck`

### Backend (Rust + Actix Web)
- **Development**: `cd backend && cargo run` (starts server on port 8080)
- **Build**: `cd backend && cargo build`
- **Test**: `cd backend && cargo test`

### Full Stack Development
- **Docker Development**: `docker-compose -f docker-compose-dev.yml up` (runs both frontend and backend)
- **Docker Production**: `docker-compose up` (production deployment)

## Architecture Overview

This is a full-stack typing application with separate frontend and backend services:

**Frontend** (`/frontend/`):
- React Router v7 application with TypeScript
- Tailwind CSS + shadcn/ui components
- File-system based routing in `/app/routes/`
- API communication with backend via fetch calls
- User authentication with session management
- Progress tracking and statistics features

**Backend** (`/backend/`):
- Rust + Actix Web REST API server
- SQLite database with SQLx for queries
- User authentication and session management
- Text generation using external LLM API (Google)
- Database migrations in `/migrations/`

**Key Data Flow**:
- Users register/login through frontend forms
- Backend authenticates users and manages sessions
- Text content is generated via LLM API calls
- User progress is tracked in SQLite database
- Frontend displays progress statistics and typing interface

**Database Schema**:
- Users table for authentication
- Languages/topics table for typing content
- Progress tracking for user statistics

**API Endpoints** (backend port 8080):
- `/login`, `/register` - User authentication
- `/get_text` - Fetch typing content
- `/get_progress` - User progress data
- `/random_topic` - Random content selection

**Deployment**:
- Both services containerized with Docker
- Production uses docker-compose with external volumes
- Frontend serves on ports 80/443, backend on 8080
- Environment variables for database URL and API keys