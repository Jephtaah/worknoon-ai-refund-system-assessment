# Worknoon AI Refund System Assessment

## Milestone 1: Scaffold

### Running with Docker Compose

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Start the stack:
   ```bash
   docker-compose up --build
   ```
3. Visit `http://localhost:5173` to see the frontend health status.
4. Test backend health:
   ```bash
   curl http://localhost:4000/api/health
   ```
