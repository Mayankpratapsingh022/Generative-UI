# Docker Deployment Guide

## Quick Start

### 1. Build the Docker Image
```bash
cd Backend
docker build -t generative-ui-backend .
```

### 2. Run with Docker Compose
```bash
# Copy and configure environment
cp production.env.example .env
# Edit .env with your actual values

# Run the application
docker-compose up -d
```

### 3. Run with Docker (Standalone)
```bash
# Set environment variables
export OPENAI_API_KEY="your_openai_api_key_here"

# Run the container
docker run -d \
  --name generative-ui-backend \
  -p 8000:8000 \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e ENVIRONMENT=production \
  generative-ui-backend
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional
ENVIRONMENT=production
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

## Production Deployment

### Using Docker Compose (Recommended)
```bash
# Production deployment
docker-compose -f docker-compose.yml up -d
```

### Using Docker Swarm
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml generative-ui
```

## Health Checks

The container includes health checks:
- **Endpoint**: `http://localhost:8000/health`
- **Interval**: 30 seconds
- **Timeout**: 30 seconds
- **Retries**: 3

## Monitoring

Check container status:
```bash
# Check if container is running
docker ps

# Check logs
docker logs generative-ui-backend

# Check health
curl http://localhost:8000/health
```

## Security Features

- ✅ **Non-root user**: Runs as `app` user
- ✅ **Minimal base image**: Python 3.12 slim
- ✅ **No unnecessary packages**: Optimized dependencies
- ✅ **Health checks**: Automatic container monitoring

## Scaling

### Horizontal Scaling
```bash
# Scale to 3 replicas
docker-compose up -d --scale backend=3
```

### Load Balancer Configuration
Use nginx or traefik as a reverse proxy for production deployments.

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using port 8000
   lsof -i :8000
   # Kill the process or use different port
   docker run -p 8001:8000 generative-ui-backend
   ```

2. **OpenAI API Key not set**
   ```bash
   # Check environment variables
   docker exec generative-ui-backend env | grep OPENAI
   ```

3. **Container won't start**
   ```bash
   # Check logs
   docker logs generative-ui-backend
   ```

## Performance Optimization

### Resource Limits
```yaml
# In docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### Multi-stage Build (Optional)
For even smaller images, you can use multi-stage builds to reduce the final image size.
