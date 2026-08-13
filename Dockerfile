# ==============================================================================
# Stage 1: Build the React Frontend
# ==============================================================================
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Production Python Backend Container
# ==============================================================================
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend app & default configs
COPY backend/ ./backend/
COPY config/ ./config/

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port
EXPOSE 8000

# Run uvicorn on dynamic PORT (supported by Render, Railway, Fly.io, etc.)
WORKDIR /app/backend
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
