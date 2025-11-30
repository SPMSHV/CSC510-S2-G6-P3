# Judge0 Docker Setup

This directory contains a Docker Compose configuration for running Judge0, a robust and scalable code execution system.

## What is Judge0?

Judge0 is an open-source online code execution system that can compile and run code in multiple programming languages. It provides a REST API that accepts code submissions and returns execution results including output, compilation errors, runtime errors, and execution statistics.

## Services Included

This Docker Compose setup includes three main services:

### 1. **PostgreSQL Database** (`judge0-db`)
- **Image**: `postgres:13`
- **Purpose**: Stores submission metadata, user data, and execution results
- **Port**: 5432 (internal only)
- **Credentials**: 
  - Database: `judge0`
  - Username: `judge0`
  - Password: `password`

### 2. **Redis Cache** (`redis`)
- **Image**: `redis:6-alpine`
- **Purpose**: Message queue for background job processing and caching
- **Port**: 6379 (internal only)

### 3. **Judge0 API** (`judge0-api`)
- **Image**: `judge0/api:latest`
- **Purpose**: REST API server that accepts code submissions
- **Port**: `2358` (exposed to host)
- **Environment**: Development mode with optimized settings

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)
- At least 2GB of available RAM
- Internet connection for downloading images

## Installation & Setup

### 1. Navigate to the project directory
```bash
cd "/proj2"
```

### 2. Start the services
```bash
docker compose up -d
```

This command will:
- Download the required Docker images (first time only)
- Create a network for the services to communicate
- Start all three containers in the background

### 3. Verify services are running
```bash
docker ps
```

You should see three containers running:
- `proj2-judge0-api-1`
- `proj2-judge0-db-1` 
- `proj2-redis-1`

### 4. Test the API
```bash
curl -X POST "http://localhost:2358/submissions/?base64_encoded=false&wait=true" \
     -H "Content-Type: application/json" \
     -d '{"language_id": 71, "source_code": "print(\"Hello, world!\")"}'
```

## Usage Examples

### Submit Python Code
```bash
curl -X POST "http://localhost:2358/submissions/?base64_encoded=false&wait=true" \
     -H "Content-Type: application/json" \
     -d '{
       "language_id": 71,
       "source_code": "print(\"Hello from Python!\")",
       "stdin": ""
     }'
```

### Submit Java Code
```bash
curl -X POST "http://localhost:2358/submissions/?base64_encoded=false&wait=true" \
     -H "Content-Type: application/json" \
     -d '{
       "language_id": 62,
       "source_code": "public class Main { public static void main(String[] args) { System.out.println(\"Hello from Java!\"); } }"
     }'
```

### Submit C++ Code
```bash
curl -X POST "http://localhost:2358/submissions/?base64_encoded=false&wait=true" \
     -H "Content-Type: application/json" \
     -d '{
       "language_id": 54,
       "source_code": "#include <iostream>\nint main() { std::cout << \"Hello from C++!\"; return 0; }"
     }'
```

## Common Language IDs

- **Python 3**: 71
- **Java**: 62
- **C++**: 54
- **C**: 50
- **JavaScript (Node.js)**: 63
- **Go**: 60
- **Rust**: 73

For a complete list, visit: `http://localhost:2358/languages`

## API Response Format

Successful submissions return JSON with:
```json
{
  "stdout": "Hello, world!\n",
  "time": "0.001",
  "memory": 2048,
  "stderr": null,
  "token": "unique-submission-id",
  "compile_output": null,
  "message": null,
  "status": {
    "id": 3,
    "description": "Accepted"
  }
}
```

## Management Commands

### View logs
```bash
# All services
docker compose logs

# Specific service
docker compose logs judge0-api
docker compose logs judge0-db
docker compose logs redis
```

### Stop services
```bash
docker compose down
```

### Stop and remove data
```bash
docker compose down -v
```

### Restart services
```bash
docker compose restart
```

### Update images
```bash
docker compose pull
docker compose up -d
```

## Troubleshooting

### Service won't start
1. Check if ports are available: `lsof -i :2358`
2. Verify Docker is running: `docker info`
3. Check logs: `docker compose logs [service-name]`

### API returns errors
1. Ensure all three services are running: `docker ps`
2. Check API logs: `docker compose logs judge0-api`
3. Verify database connection: `docker compose logs judge0-db`

### Performance issues
- Increase Docker Desktop memory allocation (recommended: 4GB+)
- On Apple Silicon Macs, the containers run in emulation mode (slower)

## File Structure

```
proj2/
├── docker-compose.yaml    # Main configuration file
├── README.md             # This file
└── (generated at runtime)
    ├── judge0-data/      # PostgreSQL data volume
    └── logs/            # Container logs
```

## Security Notes

- This setup is configured for **development use only**
- Default credentials are used (`password` for database)
- API is accessible without authentication
- For production use, implement proper security measures

## API Documentation

- **Base URL**: http://localhost:2358
- **Full API docs**: https://ce.judge0.com/
- **Languages endpoint**: http://localhost:2358/languages
- **System info**: http://localhost:2358/system_info

## Support

For issues related to:
- **Docker setup**: Check Docker Desktop logs and system requirements
- **Judge0 functionality**: Visit https://github.com/judge0/judge0
- **API usage**: Refer to https://ce.judge0.com/

---

**Note**: This setup currently includes only the API service. For full code execution capabilities, a worker service needs to be added to the docker-compose.yaml file.
