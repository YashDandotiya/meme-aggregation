📘 Overview

I built this project as a modular backend service written in TypeScript (Node.js) that aggregates token data from multiple sources and exposes them through a REST API and WebSocket updates.

The project includes Docker support, Redis caching, background job processing, and retry/error-handling utilities to ensure stability and performance.

⚙️ Setup & Installation
1. Clone the Repository
git clone <repo-url>
cd eterna

2. Configure Environment Variables

Edit the .env file with your configuration:

PORT=3000
REDIS_URL=redis://localhost:6379
NODE_ENV=development

3. Install Dependencies
npm install

4. Run with Docker (Recommended)
docker-compose up --build

5. Run Locally
npm run dev

📂 Project Structure
eterna/
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── routes/
│   ├── config/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── tests/
├── docker-compose.yml
├── DockerFile
├── jest.config.js
└── package.json

🧩 File-by-File Explanation
Root Files

DockerFile – Defines the container build for the Node.js app.

docker-compose.yml – Spins up the app and Redis service together.

package.json – Defines project dependencies and scripts.

jest.config.js – Configures Jest for unit and integration testing.

.env – Environment variables (not committed to Git).

tsconfig.json – TypeScript compiler configuration.

Core App

src/app.ts – Initializes the Express app, middleware, routes, and error handling.

src/server.ts – Launches the server and manages WebSocket connections.

API Layer

src/api/controllers/health.controller.ts
Handles the /health route for uptime and status checks.

src/api/controllers/tokens.controller.ts
Processes token-related requests, fetching data from aggregation services.

src/api/middleware/errorHandler.ts
Global error-handling middleware to format API responses.

src/api/routes/health.routes.ts
Declares /health endpoint routes.

src/api/routes/tokens.routes.ts
Declares /tokens API routes (e.g., /tokens/:symbol).

Configuration

src/config/index.ts
Loads environment variables and app configuration values.

Services

src/services/aggregation/

aggregation.service.ts – Coordinates fetching and merging data from multiple external APIs.

dexscreener.service.ts, geckoterminal.service.ts, jupiter.service.ts – Adapters for individual data providers.

merger.service.ts – Combines responses into a single unified token structure.

src/services/cache/redis.service.ts – Handles caching token data using Redis.

src/services/queue/jobs.service.ts – Manages background jobs (e.g., periodic updates).

src/services/websocket/websocket.service.ts – Manages real-time WebSocket updates for subscribed clients.

Utilities

src/utils/logger.ts – Centralized logging utility (console or file-based).

src/utils/rateLimiter.ts – Limits API request rates to prevent abuse.

src/utils/retry.ts – Retries failed external requests with exponential backoff.

Types

src/types/token.types.ts – Defines shared TypeScript interfaces for token data.

Tests

tests/unit/ – Unit tests for individual modules (e.g., retry, merger, rateLimiter).

tests/integration/ – Integration tests for API and WebSocket functionality.

🌐 API Routes
Method	Endpoint	Description
GET	/health	Returns API health status and uptime.
GET	/tokens	Returns aggregated data for all tokens.
GET	/tokens/:symbol	Returns details for a specific token.
Example Response
{
  "symbol": "SOL",
  "price": "184.52",
  "sources": ["Dexscreener", "GeckoTerminal", "Jupiter"],
  "lastUpdated": "2025-11-09T10:00:00Z"
}

🔌 WebSocket API

Clients can connect via WebSocket to receive live token updates:

const ws = new WebSocket("wss://your-domain/ws");
ws.onmessage = (msg) => console.log(JSON.parse(msg.data));

🧠 Design Decisions

Modular Architecture
I separated concerns into API, services, and utilities to make the system scalable and testable.

Service Abstraction Layer
Each data source (Dexscreener, GeckoTerminal, Jupiter) has its own service, allowing easy extension for new providers.

Redis Caching
Used to minimize repeated external API calls and improve performance.

Error Handling & Logging
A global error middleware ensures consistent responses. Custom logging helps in debugging production issues.

Retry & Rate Limiting
Implemented retry logic for unreliable external APIs and rate limiting to prevent abuse.

Real-Time Updates via WebSockets
Allows clients to receive instant updates when token data changes.

Testing Strategy
I used Jest for both unit and integration tests to ensure the reliability of aggregation logic and API responses.

🚀 Future Improvements

Add authentication for API routes.

Expand WebSocket events for market trends.

Include a simple frontend dashboard.

Add CI/CD pipeline for deployment.

👨‍💻 Author

Developed by: Yash Dandotiya
Built with ❤️ using TypeScript, Node.js, and Redis