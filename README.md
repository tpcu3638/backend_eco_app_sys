# Backend Eco App System

A backend service for environmental monitoring IoT devices. This system collects data from ESP32-based devices via MQTT, enriches it with weather information from Taiwan's Central Weather Administration (CWA), and stores everything in a PostgreSQL database.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [MQTT Communication](#mqtt-communication)
- [Database](#database)
- [API Integration](#api-integration)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Monitoring & Logging](#monitoring--logging)
- [Security](#security)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## Features

- 🌐 **MQTT Integration**: Subscribes to device topics and processes real-time environmental data
- 🌦️ **Weather API Integration**: Fetches current weather data from CWA based on device GPS coordinates
- 📊 **Data Logging**: Stores comprehensive environmental data including:
  - Local temperature and humidity
  - GPS coordinates
  - Light detection status
  - Weather forecast data (current, daily high/low)
  - Custom detection data (JSONB format)
- 🔒 **UUID Validation**: Ensures only valid device IDs are processed
- 🐳 **Docker Support**: Containerized deployment with automated CI/CD
- ⚡ **Bun Runtime**: Fast JavaScript runtime for optimal performance
- 🔄 **Auto-Reconnect**: Automatic MQTT reconnection on connection loss
- 🛡️ **Type Safety**: Full TypeScript implementation for robust code
- 📝 **Structured Logging**: Comprehensive logging for debugging and monitoring
- 🎯 **Dynamic Subscriptions**: Smart topic subscription management per device

## Architecture

### System Overview

```
┌─────────────┐        MQTT         ┌──────────────────┐
│  ESP32      │ ═══════════════════> │  MQTT Broker     │
│  Devices    │                      │  (Mosquitto)     │
└─────────────┘                      └──────────────────┘
                                              │
                                              │ Subscribe
                                              ▼
                                     ┌──────────────────┐
                                     │  Backend Service │
                                     │  (This App)      │
                                     └──────────────────┘
                                              │
                        ┌─────────────────────┼────────────────┐
                        │                     │                │
                        ▼                     ▼                ▼
                ┌───────────────┐    ┌──────────────┐  ┌─────────────┐
                │  CWA Weather  │    │  PostgreSQL  │  │  Validation │
                │  API Service  │    │   Database   │  │  & Logging  │
                └───────────────┘    └──────────────┘  └─────────────┘
```

### Data Flow

1. **Device Connection**: ESP32 devices connect to MQTT broker and publish status
2. **Topic Subscription**: Backend subscribes to device-specific topics
3. **Data Collection**: Devices publish environmental sensor data
4. **Weather Enrichment**: Backend fetches CWA weather data based on GPS coordinates
5. **Data Validation**: All incoming data is validated and sanitized
6. **Database Storage**: Validated data is stored in PostgreSQL
7. **Acknowledgment**: Server sends confirmation back to device

### Component Architecture

```typescript
app/
├── index.ts              # Main application & MQTT event handlers
├── clients.ts            # MQTT & Database client initialization
├── types.ts              # TypeScript interfaces & types
└── components/
    ├── getCwaData.ts     # Weather API integration
    └── randomString.ts   # Utility functions
```

## Prerequisites

### Required Software

- **[Bun](https://bun.sh)** v1.2.12 or higher
- **PostgreSQL** 12+ (with JSONB support)
- **MQTT Broker** (Mosquitto 2.0+, HiveMQ, or EMQX)
- **CWA API Access** (Taiwan Central Weather Administration)

### Hardware Recommendations

#### Development Environment

- CPU: 2+ cores
- RAM: 2GB minimum
- Storage: 10GB available space
- Network: Stable internet connection

#### Production Environment

- CPU: 4+ cores
- RAM: 4GB+ (depends on device count)
- Storage: 50GB+ (depends on data retention)
- Network: Low-latency connection to MQTT broker

## Installation

### Local Development

1. Clone the repository:

```bash
git clone https://github.com/tpcu3638/backend_eco_app_sys.git
cd backend_eco_app_sys
```

2. Install dependencies:

```bash
bun install
```

3. Set up PostgreSQL database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE eco_app;

# Connect to the database
\c eco_app

# Create the logger table (see Database Schema section)
```

4. Configure environment variables (see [Configuration](#configuration))

5. Run the application:

```bash
bun start
```

### Docker Deployment

#### Quick Start

Build and run with Docker:

```bash
docker build -t backend-eco-app .
docker run -d \
  --name eco-backend \
  -e MQTT_BROKER_URL="mqtt://your-broker:1883" \
  -e MQTT_USERNAME="your-username" \
  -e MQTT_PASSWORD="your-password" \
  -e DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
  -e CWA_API_SERVICE="https://your-cwa-api.com" \
  --restart unless-stopped \
  backend-eco-app
```

#### Docker Compose (Recommended)

Create a `docker-compose.yml` file:

```yaml
version: "3.8"

services:
  backend:
    build: .
    container_name: eco-backend
    environment:
      - MQTT_BROKER_URL=mqtt://mosquitto:1883
      - MQTT_USERNAME=eco_user
      - MQTT_PASSWORD=${MQTT_PASSWORD}
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/eco_app
      - CWA_API_SERVICE=${CWA_API_SERVICE}
    depends_on:
      db:
        condition: service_healthy
      mosquitto:
        condition: service_started
    restart: unless-stopped
    networks:
      - eco-network

  db:
    image: postgres:15-alpine
    container_name: eco-postgres
    environment:
      POSTGRES_DB: eco_app
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - eco-network

  mosquitto:
    image: eclipse-mosquitto:2
    container_name: eco-mosquitto
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - mosquitto_data:/mosquitto/data
      - mosquitto_logs:/mosquitto/log
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
    networks:
      - eco-network

volumes:
  postgres_data:
    driver: local
  mosquitto_data:
    driver: local
  mosquitto_logs:
    driver: local

networks:
  eco-network:
    driver: bridge
```

Create a `.env` file for Docker Compose:

```env
POSTGRES_PASSWORD=your_secure_password_here
MQTT_PASSWORD=your_mqtt_password_here
CWA_API_SERVICE=https://your-cwa-api-endpoint.com
```

Start the services:

```bash
docker-compose up -d
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# MQTT Broker Configuration (required)
MQTT_BROKER_URL=mqtt://localhost:1883

# MQTT Authentication (optional)
MQTT_USERNAME=your_mqtt_username
MQTT_PASSWORD=your_mqtt_password

# PostgreSQL Connection (required)
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# CWA API Configuration (required)
# Format: Base URL that accepts /{latitude}/{longitude} path parameters
CWA_API_SERVICE=https://api.example.com/weather
```

### Environment Variables Explained

| Variable          | Required    | Default | Description                                                                           |
| ----------------- | ----------- | ------- | ------------------------------------------------------------------------------------- |
| `MQTT_BROKER_URL` | ✅ Yes      | -       | Full URL to MQTT broker (e.g., `mqtt://broker:1883` or `mqtts://broker:8883` for TLS) |
| `MQTT_USERNAME`   | ⚠️ Optional | -       | MQTT authentication username (if broker requires auth)                                |
| `MQTT_PASSWORD`   | ⚠️ Optional | -       | MQTT authentication password (if broker requires auth)                                |
| `DATABASE_URL`    | ✅ Yes      | -       | PostgreSQL connection string in format: `postgresql://user:pass@host:port/dbname`     |
| `CWA_API_SERVICE` | ✅ Yes      | -       | Base URL for CWA API service. System appends `/{lat}/{long}` to fetch weather data    |

### MQTT Broker Configuration

Example `mosquitto.conf`:

```conf
# Basic Configuration
listener 1883
allow_anonymous false

# Authentication
password_file /mosquitto/config/passwd

# Persistence
persistence true
persistence_location /mosquitto/data/

# Logging
log_dest file /mosquitto/log/mosquitto.log
log_type all

# Security
max_connections 1000
max_keepalive 3600
```

Create password file:

```bash
mosquitto_passwd -c passwd eco_user
```

## MQTT Communication

### Topic Structure

The system uses a hierarchical topic structure:

```
eco_clients/
├── {device-uuid}/
│   ├── status              # Device connection status
│   ├── data                # Environmental sensor data
│   └── server_response     # Server acknowledgments
```

### Device UUID Format

Device IDs must follow UUIDv4 specification:

```
Pattern: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
Example: 550e8400-e29b-41d4-a716-446655440000
```

**UUID Validation Regex:**

```regex
^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$
```

### Message Flow

**1. Device Initialization**

```
Device → MQTT: PUBLISH eco_clients/{uuid}/status {"status": "online"}
Backend: Subscribes to eco_clients/{uuid}/data
```

**2. Data Transmission**

```
Device → MQTT: PUBLISH eco_clients/{uuid}/data {sensor_data}
Backend: Receives & validates data
Backend: Fetches CWA weather data
Backend: Stores in PostgreSQL
Backend → MQTT: PUBLISH eco_clients/{uuid}/server_response "ok"
```

### Data Payload Structure

Devices should publish JSON data to `eco_clients/{device-uuid}/data`:

```json
{
  "esp_temp": 25.5,
  "local_temp": 24.8,
  "local_hum": 65.2,
  "local_gps_lat": "25.0330",
  "local_gps_long": "121.5654",
  "local_time": "2025-01-01T12:00:00Z",
  "local_jistatus": true,
  "local_light": true,
  "local_detect": {
    "motion": false,
    "sound_level": 45,
    "air_quality": "good"
  },
  "cwa_temp": 26.0,
  "cwa_hum": 68.0,
  "cwa_daily_high": 28.5,
  "cwa_daily_low": 22.0
}
```

#### Field Descriptions

| Field            | Type    | Required | Description                                    |
| ---------------- | ------- | -------- | ---------------------------------------------- |
| `esp_temp`       | number  | ✅       | ESP32 internal temperature sensor reading (°C) |
| `local_temp`     | number  | ✅       | External temperature sensor reading (°C)       |
| `local_hum`      | number  | ✅       | Humidity sensor reading (%)                    |
| `local_gps_lat`  | string  | ✅       | GPS latitude coordinate                        |
| `local_gps_long` | string  | ✅       | GPS longitude coordinate                       |
| `local_time`     | string  | ❌       | ISO 8601 timestamp from device                 |
| `local_jistatus` | boolean | ❌       | Status of JI sensor                            |
| `local_light`    | boolean | ❌       | Light detection status                         |
| `local_detect`   | object  | ❌       | Custom detection data (stored as JSONB)        |
| `cwa_temp`       | number  | ❌       | CWA temperature reading (°C)                   |
| `cwa_hum`        | number  | ❌       | CWA humidity reading (%)                       |
| `cwa_daily_high` | number  | ❌       | CWA daily high forecast (°C)                   |
| `cwa_daily_low`  | number  | ❌       | CWA daily low forecast (°C)                    |

### QoS Levels

The system uses **QoS 0** (At most once) for optimal performance:

- Low latency
- No message acknowledgment overhead
- Suitable for frequently updated sensor data

## Database

### Schema

The system uses a single `logger` table with the following structure:

```sql
CREATE TABLE logger (
  id SERIAL PRIMARY KEY,
  device_uuid VARCHAR(36) NOT NULL,
  cwa_type VARCHAR(50),
  cwa_location VARCHAR(100),
  cwa_temp NUMERIC(5,2),
  cwa_hum NUMERIC(5,2),
  cwa_daily_high NUMERIC(5,2),
  cwa_daily_low NUMERIC(5,2),
  local_temp NUMERIC(5,2),
  local_hum NUMERIC(5,2),
  local_gps_lat VARCHAR(20),
  local_gps_long VARCHAR(20),
  local_time TIMESTAMP,
  local_jistatus BOOLEAN,
  local_light BOOLEAN,
  local_detect JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_device_uuid ON logger(device_uuid);
CREATE INDEX idx_created_at ON logger(created_at);
CREATE INDEX idx_device_time ON logger(device_uuid, created_at);
CREATE INDEX idx_local_detect_gin ON logger USING GIN (local_detect);
```

### Data Retention

Consider implementing data retention policies:

```sql
-- Delete records older than 90 days
DELETE FROM logger WHERE created_at < NOW() - INTERVAL '90 days';

-- Or use partitioning for better performance
CREATE TABLE logger_y2025m01 PARTITION OF logger
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Database Migrations

Create an `init.sql` file for Docker initialization:

```sql
-- init.sql
CREATE TABLE IF NOT EXISTS logger (
  id SERIAL PRIMARY KEY,
  device_uuid VARCHAR(36) NOT NULL,
  cwa_type VARCHAR(50),
  cwa_location VARCHAR(100),
  cwa_temp NUMERIC(5,2),
  cwa_hum NUMERIC(5,2),
  cwa_daily_high NUMERIC(5,2),
  cwa_daily_low NUMERIC(5,2),
  local_temp NUMERIC(5,2),
  local_hum NUMERIC(5,2),
  local_gps_lat VARCHAR(20),
  local_gps_long VARCHAR(20),
  local_time TIMESTAMP,
  local_jistatus BOOLEAN,
  local_light BOOLEAN,
  local_detect JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_uuid ON logger(device_uuid);
CREATE INDEX IF NOT EXISTS idx_created_at ON logger(created_at);
CREATE INDEX IF NOT EXISTS idx_device_time ON logger(device_uuid, created_at);
CREATE INDEX IF NOT EXISTS idx_local_detect_gin ON logger USING GIN (local_detect);
```

### Querying Data

Example queries:

```sql
-- Get latest data for a device
SELECT * FROM logger
WHERE device_uuid = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC
LIMIT 10;

-- Get average temperature per device
SELECT device_uuid,
       AVG(local_temp) as avg_temp,
       COUNT(*) as readings
FROM logger
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY device_uuid;

-- Query JSONB detect data
SELECT * FROM logger
WHERE local_detect->>'motion' = 'true'
AND created_at > NOW() - INTERVAL '1 hour';
```

## API Integration

### CWA Weather API

The system integrates with Taiwan's Central Weather Administration API:

**API Endpoint Format:**

```
{CWA_API_SERVICE}/{latitude}/{longitude}
```

**Example Request:**

```
GET https://api.example.com/weather/25.0330/121.5654
```

**Expected Response:**

```json
{
  "weather": "晴",
  "location": "台北市",
  "temperature": 26.5,
  "humidity": 68
}
```

The system expects the following response structure:

- `weather`: Weather condition description
- `location`: Location name (stored as `cwa_location`)
- Additional fields are optional and can be extended

## Project Structure

```
backend_eco_app_sys/
├── app/
│   ├── index.ts              # Main application & MQTT event handlers
│   ├── clients.ts            # MQTT & Database client initialization
│   ├── types.ts              # TypeScript type definitions
│   └── components/
│       ├── getCwaData.ts     # CWA Weather API integration
│       └── randomString.ts   # Utility: Random string generation
│
├── .github/
│   └── workflows/
│       ├── dockerhub.yml     # Docker Hub deployment workflow
│       └── build-image.yaml  # Additional build workflows
│
├── Dockerfile                # Container definition (Bun + app)
├── docker-compose.yml        # Multi-container orchestration (create this)
├── init.sql                  # Database initialization script (create this)
├── mosquitto.conf            # MQTT broker configuration (create this)
│
├── package.json              # Project dependencies & scripts
├── tsconfig.json            # TypeScript compiler configuration
├── bun.lock                 # Bun lock file
│
├── .env                      # Environment variables (create from .env.example)
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
└── README.md                # This file
```

## Development

### Running in Development Mode

```bash
# Start the application
bun start

# Run with auto-reload (if configured)
bun --watch app/index.ts
```

### Code Formatting

Format code using Prettier:

```bash
bun run clean
```

### TypeScript

The project uses TypeScript with Bun's built-in support. No separate compilation needed.

```bash
# Type checking (optional)
bun run tsc --noEmit
```

### Development Tips

1. **MQTT Testing**: Use MQTT client tools

   ```bash
   # Subscribe to topics
   mosquitto_sub -h localhost -t "eco_clients/#" -v

   # Publish test data
   mosquitto_pub -h localhost -t "eco_clients/550e8400-e29b-41d4-a716-446655440000/data" \
     -m '{"esp_temp":25.5,"local_temp":24.8,"local_hum":65.2,"local_gps_lat":"25.0330","local_gps_long":"121.5654"}'
   ```

2. **Database Testing**

   ```bash
   # Connect to database
   psql postgresql://user:pass@localhost:5432/eco_app

   # Monitor logs in real-time
   SELECT * FROM logger ORDER BY created_at DESC LIMIT 5;
   ```

3. **Logging**: Use `console.log()` for debugging - all output is captured

## Deployment

### Production Deployment

#### Using Docker Hub (Automated CI/CD)

The project includes GitHub Actions workflow for automated deployment:

1. Push to `remove_better_auth` branch
2. GitHub Actions builds ARM64 Docker image
3. Image pushed to Docker Hub: `yoinkedu/logger-v2-mqtt-end:latest`

Pull and run the production image:

```bash
docker pull yoinkedu/logger-v2-mqtt-end:latest
docker run -d \
  --name eco-backend \
  -e MQTT_BROKER_URL="mqtt://broker:1883" \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e CWA_API_SERVICE="https://api.example.com" \
  --restart unless-stopped \
  yoinkedu/logger-v2-mqtt-end:latest
```

#### Manual Deployment

```bash
# Build for production
docker build -t eco-backend:prod .

# Run with production settings
docker run -d \
  --name eco-backend-prod \
  --env-file .env.prod \
  --restart always \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  eco-backend:prod
```

### Environment-Specific Configurations

**Development `.env`:**

```env
MQTT_BROKER_URL=mqtt://localhost:1883
DATABASE_URL=postgresql://postgres:password@localhost:5432/eco_app_dev
CWA_API_SERVICE=https://staging-api.example.com
```

**Production `.env.prod`:**

```env
MQTT_BROKER_URL=mqtts://prod-broker.example.com:8883
DATABASE_URL=postgresql://prod_user:secure_pass@db.example.com:5432/eco_app
CWA_API_SERVICE=https://api.cwa.gov.tw/service
MQTT_USERNAME=prod_mqtt_user
MQTT_PASSWORD=secure_mqtt_password
```

## Monitoring & Logging

### Application Logs

The application logs to `stdout`:

```bash
# View Docker container logs
docker logs -f eco-backend

# Filter specific patterns
docker logs eco-backend 2>&1 | grep "Device"
```

### MQTT Monitoring

```bash
# Monitor all topics
mosquitto_sub -h localhost -t "eco_clients/#" -v

# Monitor specific device
mosquitto_sub -h localhost -t "eco_clients/550e8400-e29b-41d4-a716-446655440000/#" -v
```

### Database Monitoring

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Table size
SELECT pg_size_pretty(pg_total_relation_size('logger'));

-- Recent inserts rate
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as records
FROM logger
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Health Checks

Create a health check endpoint or script:

```bash
#!/bin/bash
# healthcheck.sh

# Check if process is running
if ! pgrep -f "bun" > /dev/null; then
    echo "Process not running"
    exit 1
fi

# Check MQTT connection (requires mosquitto-clients)
if ! timeout 5 mosquitto_pub -h localhost -t "health" -m "check" -q 0; then
    echo "MQTT broker unreachable"
    exit 1
fi

# Check database connection
if ! PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -d eco_app -c "SELECT 1" > /dev/null 2>&1; then
    echo "Database unreachable"
    exit 1
fi

echo "All systems healthy"
exit 0
```

## Security

### Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong passwords
   - Rotate credentials regularly

2. **MQTT Security**

   ```conf
   # Enable TLS in mosquitto.conf
   listener 8883
   cafile /mosquitto/certs/ca.crt
   certfile /mosquitto/certs/server.crt
   keyfile /mosquitto/certs/server.key
   require_certificate false
   ```

3. **Database Security**
   - Use connection pooling limits
   - Implement prepared statements (done automatically with Bun SQL)
   - Regular backups
   - Network isolation (Docker networks)

4. **Input Validation**
   - UUID format validation
   - JSON schema validation
   - Type checking for all numeric values
   - SQL injection protection (parameterized queries)

5. **Network Security**
   ```yaml
   # docker-compose.yml
   networks:
     eco-network:
       driver: bridge
       ipam:
         config:
           - subnet: 172.20.0.0/16
   ```

### Firewall Rules

```bash
# Allow MQTT
sudo ufw allow 1883/tcp
sudo ufw allow 8883/tcp  # TLS

# Allow PostgreSQL (only from specific IP)
sudo ufw allow from 192.168.1.0/24 to any port 5432

# Enable firewall
sudo ufw enable
```

## Performance

### Optimization Tips

1. **Database Indexing**: Already implemented for common queries
2. **Connection Pooling**: Managed by Bun SQL driver
3. **MQTT QoS**: Using QoS 0 for better throughput
4. **Async Operations**: All I/O operations are non-blocking

### Performance Metrics

Expected performance with recommended hardware:

| Metric       | Value                      |
| ------------ | -------------------------- |
| Max Devices  | 1000+ concurrent           |
| Messages/sec | 100+                       |
| Avg Latency  | <100ms                     |
| Memory Usage | ~100MB base                |
| CPU Usage    | <10% idle, <50% under load |

### Scaling Considerations

**Horizontal Scaling:**

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: "2"
          memory: 2G
```

**Database Optimization:**

```sql
-- Partition by month
CREATE TABLE logger_y2025m01 PARTITION OF logger
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Vacuum regularly
VACUUM ANALYZE logger;
```

## Troubleshooting

### Common Issues

#### 1. MQTT Connection Failed

**Symptoms:** `MQTT error: Connection refused`

**Solutions:**

```bash
# Check broker is running
systemctl status mosquitto

# Verify broker URL
echo $MQTT_BROKER_URL

# Test connection
mosquitto_pub -h localhost -t test -m "hello"

# Check authentication
mosquitto_sub -h localhost -t test -u username -P password
```

#### 2. Database Connection Error

**Symptoms:** `DATABASE_URL environment variable is not set`

**Solutions:**

```bash
# Verify .env file
cat .env

# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check PostgreSQL is running
systemctl status postgresql
```

#### 3. Invalid UUID Error

**Symptoms:** `Invalid client ID format`

**Solutions:**

- Ensure device UUID matches UUIDv4 format
- Verify topic structure: `eco_clients/{uuid}/data`
- Use online UUID validator

#### 4. JSON Parse Error

**Symptoms:** `Failed to parse JSON`

**Solutions:**

```bash
# Validate JSON payload
echo '{"esp_temp": 25.5}' | jq .

# Check for special characters
# Ensure proper UTF-8 encoding
```

#### 5. CWA API Timeout

**Symptoms:** `Error fetching CWA data`

**Solutions:**

- Verify API endpoint is accessible
- Check API key/credentials
- Monitor rate limits
- Implement retry logic

### Debug Mode

Enable verbose logging:

```bash
# Add to .env
DEBUG=*

# Or run with debug flag
DEBUG=mqtt* bun start
```

### Logs Analysis

```bash
# Show errors only
docker logs eco-backend 2>&1 | grep -i error

# Count messages by device
docker logs eco-backend 2>&1 | grep "Device" | awk '{print $2}' | sort | uniq -c

# Monitor real-time
docker logs -f --tail 100 eco-backend
```

## FAQ

### Q: How many devices can the system handle?

A: The system can handle 1000+ concurrent devices with recommended hardware. Performance depends on message frequency and complexity.

### Q: What happens if the database connection is lost?

A: The application will attempt to reconnect. Messages during downtime are lost (MQTT QoS 0).

### Q: Can I use a different database?

A: The system uses Bun's SQL driver which supports PostgreSQL. Porting to other databases requires code changes.

### Q: How do I add custom sensors?

A: Add fields to the `local_detect` JSONB column. No schema changes needed for flexible data.

### Q: Is SSL/TLS supported?

A: Yes, use `mqtts://` protocol in `MQTT_BROKER_URL` and configure broker certificates.

### Q: How do I backup the database?

```bash
# Full backup
pg_dump eco_app > backup_$(date +%Y%m%d).sql

# Restore
psql eco_app < backup_20250101.sql

# Automated backups with Docker
docker exec eco-postgres pg_dump -U postgres eco_app > backup.sql
```

### Q: Can I run multiple instances of the backend?

A: Yes, but be careful with MQTT subscriptions. Each instance will subscribe to all devices. Consider using MQTT bridge or load balancing.

### Q: What is the data retention period?

A: By default, data is kept indefinitely. Implement data retention policies based on your needs (see Database section).

### Q: How do I monitor system health?

A: Use the provided health check script, monitor logs, and set up alerts for database/MQTT connection failures.

## Contributing

We welcome contributions! Here's how you can help:

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and formatting:
   ```bash
   bun run clean
   ```
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Contribution Guidelines

- Follow existing code style (TypeScript, Prettier)
- Add comments for complex logic
- Update documentation for new features
- Test thoroughly before submitting
- Keep commits atomic and meaningful

### Code Standards

```typescript
// Good: Type-safe, clear naming
async function processDeviceData(
  uuid: string,
  data: MQTTReturnData,
): Promise<void> {
  const validated = validateData(data);
  await storeData(uuid, validated);
}

// Bad: No types, unclear naming
async function process(id, d) {
  await store(id, d);
}
```

### Reporting Issues

When reporting issues, please include:

- System information (OS, Bun version)
- Environment configuration (anonymized)
- Steps to reproduce
- Expected vs actual behavior
- Relevant log excerpts

## License

This project is **private**. All rights reserved.

**Copyright © 2025**

Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited without explicit permission from the repository owner.

For licensing inquiries, please contact the repository maintainers.

---

## Additional Resources

### Related Documentation

- [Bun Documentation](https://bun.sh/docs)
- [MQTT Protocol Specification](https://mqtt.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Taiwan CWA Open Data](https://opendata.cwa.gov.tw/)

### Community & Support

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Email**: Contact repository owner for sensitive issues

### Acknowledgments

- **Bun Team**: For the amazing JavaScript runtime
- **Eclipse Mosquitto**: For the reliable MQTT broker
- **PostgreSQL**: For robust database support
- **Taiwan CWA**: For providing weather API services

---

**Built with ❤️ using [Bun](https://bun.sh) 🚀**

_Last Updated: January 2025_
