# AI Chatbot Backend - Architecture Blueprint & Implementation Plan

## 📋 Executive Summary

**Project**: Production-Ready Serverless AI Chatbot Backend  
**Runtime**: Node.js (TypeScript) + Express  
**AI Engine**: Gemini 3 Pro via Vertex AI SDK  
**Database**: PostgreSQL with pgvector (Cloud SQL or Supabase)  
**Deployment**: Docker → Google Cloud Run  
**CI/CD**: GitHub Actions  

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  (Web App, Mobile App, API Consumers)                       │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Google Cloud Run                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Express.js API Server (TypeScript)          │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │  │
│  │  │  Controllers │  │  Middleware  │  │   Routes    │ │  │
│  │  └──────┬───────┘  └──────────────┘  └─────────────┘ │  │
│  │         │                                             │  │
│  │  ┌──────▼───────────────────────────────────────┐    │  │
│  │  │            Service Layer                     │    │  │
│  │  │  • ChatService                               │    │  │
│  │  │  • GeminiService (Vertex AI SDK)            │    │  │
│  │  │  • MemoryService (pgvector)                 │    │  │
│  │  │  • SessionService                            │    │  │
│  │  └──────┬───────────────────────────────────────┘    │  │
│  │         │                                             │  │
│  │  ┌──────▼───────────────────────────────────────┐    │  │
│  │  │         Data Access Layer (DAL)              │    │  │
│  │  │  • Database Models                           │    │  │
│  │  │  • Repository Pattern                        │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────┬───────────────────────┬───────────────────────┘
              │                       │
              ▼                       ▼
┌─────────────────────────┐  ┌──────────────────────────┐
│  PostgreSQL + pgvector  │  │   Vertex AI (Gemini)     │
│  (Cloud SQL/Supabase)   │  │   Google Cloud Platform  │
│                         │  │                          │
│  • Chat History         │  │  • Gemini 3 Pro API      │
│  • User Sessions        │  │  • Embeddings            │
│  • Vector Embeddings    │  │                          │
└─────────────────────────┘  └──────────────────────────┘
              │
              ▼
┌─────────────────────────┐
│   Google Secret Manager │
│   • API Keys            │
│   • DB Credentials      │
│   • Service Accounts    │
└─────────────────────────┘
```

---

## 📁 Project Structure

```
chatbot-backend/
├── .github/
│   └── workflows/
│       └── deploy.yml                 # CI/CD pipeline
├── src/
│   ├── config/
│   │   ├── database.ts               # DB connection config
│   │   ├── gemini.ts                 # Vertex AI config
│   │   └── secrets.ts                # Secret Manager integration
│   ├── controllers/
│   │   ├── chat.controller.ts        # Chat endpoints
│   │   ├── health.controller.ts      # Health checks
│   │   └── session.controller.ts     # Session management
│   ├── services/
│   │   ├── chat.service.ts           # Chat orchestration
│   │   ├── gemini.service.ts         # Gemini AI integration
│   │   ├── memory.service.ts         # Vector memory (pgvector)
│   │   └── session.service.ts        # Session management
│   ├── repositories/
│   │   ├── chat.repository.ts        # Chat data access
│   │   ├── session.repository.ts     # Session data access
│   │   └── vector.repository.ts      # Vector operations
│   ├── models/
│   │   ├── chat.model.ts             # Chat message schema
│   │   ├── session.model.ts          # Session schema
│   │   └── types.ts                  # TypeScript interfaces
│   ├── middleware/
│   │   ├── auth.middleware.ts        # Authentication
│   │   ├── error.middleware.ts       # Error handling
│   │   ├── validation.middleware.ts  # Request validation
│   │   └── rate-limit.middleware.ts  # Rate limiting
│   ├── routes/
│   │   ├── chat.routes.ts            # Chat routes
│   │   ├── health.routes.ts          # Health routes
│   │   └── index.ts                  # Route aggregator
│   ├── utils/
│   │   ├── logger.ts                 # Winston logger
│   │   ├── validators.ts             # Input validators
│   │   └── errors.ts                 # Custom error classes
│   ├── database/
│   │   ├── migrations/               # SQL migrations
│   │   │   ├── 001_initial_schema.sql
│   │   │   └── 002_add_pgvector.sql
│   │   └── seeds/                    # Seed data (optional)
│   ├── app.ts                        # Express app setup
│   └── server.ts                     # Server entry point
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example                      # Environment template
├── .dockerignore
├── .gitignore
├── Dockerfile                        # Production container
├── docker-compose.yml                # Local development
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 Technology Stack Details

### Core Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js 20 LTS | JavaScript runtime |
| **Language** | TypeScript 5.x | Type safety |
| **Framework** | Express.js 4.x | Web server framework |
| **AI Engine** | Gemini 3 Pro (Vertex AI) | Conversational AI |
| **Database** | PostgreSQL 15+ | Relational database |
| **Vector Store** | pgvector | Semantic search & memory |
| **ORM** | Prisma or pg (node-postgres) | Database access |
| **Validation** | Zod | Runtime type validation |
| **Logging** | Winston | Structured logging |
| **Testing** | Jest + Supertest | Unit & integration tests |

### Cloud Infrastructure

| Service | Purpose |
|---------|---------|
| **Google Cloud Run** | Serverless container hosting |
| **Cloud SQL (PostgreSQL)** | Managed database |
| **Vertex AI** | Gemini API access |
| **Secret Manager** | Secrets & credentials |
| **Cloud Build** | Container builds (optional) |
| **Artifact Registry** | Docker image storage |

---

## 🔐 Security Architecture

### Secret Management Strategy

**Option 1: Google Secret Manager (Recommended for Production)**

```typescript
// src/config/secrets.ts
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export class SecretManager {
  private client: SecretManagerServiceClient;
  
  async getSecret(secretName: string): Promise<string> {
    const [version] = await this.client.accessSecretVersion({
      name: `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`
    });
    return version.payload?.data?.toString() || '';
  }
}
```

**Secrets to Store:**
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Vertex AI credentials
- `JWT_SECRET` - Session token signing
- `API_KEY` - Client authentication (if needed)

**Option 2: Environment Variables (.env for local dev)**

```bash
# .env.example
NODE_ENV=development
PORT=8080

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chatbot
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Gemini / Vertex AI
GOOGLE_CLOUD_PROJECT=your-project-id
VERTEX_AI_LOCATION=us-central1
GEMINI_MODEL=gemini-3-pro

# Security
JWT_SECRET=your-jwt-secret
API_KEY=your-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Authentication & Authorization

```typescript
// src/middleware/auth.middleware.ts
export const authenticateRequest = async (req, res, next) => {
  // Option 1: API Key
  const apiKey = req.headers['x-api-key'];
  
  // Option 2: JWT Token
  const token = req.headers.authorization?.split(' ')[1];
  
  // Option 3: Session-based
  const sessionId = req.cookies.sessionId;
  
  // Validate and attach user context
};
```

---

## 🗄️ Database Schema Design

### PostgreSQL Schema with pgvector

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users/Sessions Table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  INDEX idx_session_token (session_token),
  INDEX idx_user_id (user_id)
);

-- Chat Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at)
);

-- Vector Embeddings for Semantic Search
CREATE TABLE message_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  embedding vector(768),  -- Gemini embedding dimension
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_message_id (message_id)
);

-- Create vector similarity search index
CREATE INDEX ON message_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Conversation Context (for multi-turn memory)
CREATE TABLE conversation_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  context_summary TEXT,
  message_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id)
);
```

### Prisma Schema (Alternative ORM Approach)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [vector]
}

model Session {
  id           String   @id @default(uuid())
  userId       String?  @map("user_id")
  sessionToken String   @unique @map("session_token")
  metadata     Json     @default("{}")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  expiresAt    DateTime? @map("expires_at")
  
  messages     Message[]
  context      ConversationContext?
  
  @@index([sessionToken])
  @@index([userId])
  @@map("sessions")
}

model Message {
  id         String   @id @default(uuid())
  sessionId  String   @map("session_id")
  role       String
  content    String
  tokensUsed Int?     @map("tokens_used")
  metadata   Json     @default("{}")
  createdAt  DateTime @default(now()) @map("created_at")
  
  session    Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  embedding  MessageEmbedding?
  
  @@index([sessionId])
  @@index([createdAt])
  @@map("messages")
}

model MessageEmbedding {
  id        String   @id @default(uuid())
  messageId String   @unique @map("message_id")
  embedding Unsupported("vector(768)")
  createdAt DateTime @default(now()) @map("created_at")
  
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  
  @@map("message_embeddings")
}

model ConversationContext {
  id             String   @id @default(uuid())
  sessionId      String   @unique @map("session_id")
  contextSummary String?  @map("context_summary")
  messageCount   Int      @default(0) @map("message_count")
  lastUpdated    DateTime @default(now()) @map("last_updated")
  
  session        Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  @@map("conversation_context")
}
```

---

## 🤖 Gemini Integration Architecture

### Service Layer Design

```typescript
// src/services/gemini.service.ts
import { VertexAI } from '@google-cloud/vertexai';

export class GeminiService {
  private vertexAI: VertexAI;
  private model: GenerativeModel;
  
  constructor() {
    this.vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.VERTEX_AI_LOCATION
    });
    
    this.model = this.vertexAI.getGenerativeModel({
      model: 'gemini-3-pro',
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    });
  }
  
  async generateResponse(
    messages: ChatMessage[],
    context?: string
  ): Promise<GeminiResponse> {
    // Convert chat history to Gemini format
    // Include vector-retrieved context
    // Stream or batch response
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    // Generate embeddings for semantic search
  }
}
```

### Memory-Augmented Generation (RAG Pattern)

```typescript
// src/services/memory.service.ts
export class MemoryService {
  async retrieveRelevantContext(
    sessionId: string,
    query: string,
    limit: number = 5
  ): Promise<Message[]> {
    // 1. Generate embedding for current query
    const queryEmbedding = await geminiService.generateEmbedding(query);
    
    // 2. Perform vector similarity search
    const relevantMessages = await vectorRepository.findSimilar(
      queryEmbedding,
      sessionId,
      limit
    );
    
    // 3. Return context for prompt augmentation
    return relevantMessages;
  }
  
  async storeMessageWithEmbedding(message: Message): Promise<void> {
    // Store message and generate embedding asynchronously
  }
}
```

---

## 🐳 Docker Configuration

### Production Dockerfile

```dockerfile
# Multi-stage build for optimized image size
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]
```

### docker-compose.yml (Local Development)

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://chatbot:chatbot@postgres:5432/chatbot
      - PORT=8080
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./src:/app/src
    command: npm run dev

  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_USER: chatbot
      POSTGRES_PASSWORD: chatbot
      POSTGRES_DB: chatbot
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/database/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chatbot"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

## 🚀 CI/CD Pipeline (GitHub Actions)

### .github/workflows/deploy.yml

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: us-central1
  SERVICE_NAME: chatbot-backend
  REGISTRY: us-central1-docker.pkg.dev

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Build TypeScript
        run: npm run build

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    permissions:
      contents: read
      id-token: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
      
      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev
      
      - name: Build Docker image
        run: |
          docker build -t ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/chatbot/${{ env.SERVICE_NAME }}:${{ github.sha }} .
          docker tag ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/chatbot/${{ env.SERVICE_NAME }}:${{ github.sha }} \
                     ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/chatbot/${{ env.SERVICE_NAME }}:latest
      
      - name: Push Docker image
        run: |
          docker push ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/chatbot/${{ env.SERVICE_NAME }}:${{ github.sha }}
          docker push ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/chatbot/${{ env.SERVICE_NAME }}:latest
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE_NAME }} \
            --image ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/chatbot/${{ env.SERVICE_NAME }}:${{ github.sha }} \
            --region ${{ env.REGION }} \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars "NODE_ENV=production" \
            --set-secrets "DATABASE_URL=DATABASE_URL:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest" \
            --min-instances 0 \
            --max-instances 10 \
            --memory 512Mi \
            --cpu 1 \
            --timeout 300 \
            --concurrency 80 \
            --service-account chatbot-backend@${{ env.PROJECT_ID }}.iam.gserviceaccount.com
      
      - name: Run database migrations
        run: |
          # Execute migrations via Cloud Run job or Cloud SQL proxy
          echo "Migrations would run here"
```

---

## 🔌 MCP Server Integration

### Required MCP Servers for Antigravity

To automate resource provisioning and management, install these MCP servers:

#### 1. **Google Cloud MCP Server**
```bash
# Install Google Cloud MCP
npm install -g @modelcontextprotocol/server-google-cloud
```

**Capabilities:**
- Provision Cloud Run services
- Create Cloud SQL instances
- Configure Secret Manager
- Set up IAM roles and service accounts
- Enable Vertex AI API

**Usage in Antigravity:**
```typescript
// Example MCP commands
- "Create a Cloud Run service named chatbot-backend"
- "Provision Cloud SQL PostgreSQL instance with pgvector"
- "Set up Secret Manager secrets for DATABASE_URL and GEMINI_API_KEY"
- "Enable Vertex AI API in project"
```

#### 2. **PostgreSQL MCP Server**
```bash
# Install PostgreSQL MCP
npm install -g @modelcontextprotocol/server-postgres
```

**Capabilities:**
- Execute database migrations
- Run SQL queries
- Manage database schema
- Create indexes and extensions

**Usage in Antigravity:**
```typescript
- "Run migration 001_initial_schema.sql"
- "Enable pgvector extension"
- "Create vector similarity index"
```

#### 3. **GitHub MCP Server**
```bash
# Install GitHub MCP
npm install -g @modelcontextprotocol/server-github
```

**Capabilities:**
- Create repositories
- Set up GitHub Actions workflows
- Manage secrets
- Configure branch protection

**Usage in Antigravity:**
```typescript
- "Create GitHub repository chatbot-backend"
- "Add GitHub secrets: GCP_PROJECT_ID, WIF_PROVIDER, WIF_SERVICE_ACCOUNT"
- "Set up deploy.yml workflow"
```

#### 4. **Docker MCP Server** (Optional)
```bash
# Install Docker MCP
npm install -g @modelcontextprotocol/server-docker
```

**Capabilities:**
- Build Docker images
- Test containers locally
- Push to registries

---

## 📊 Implementation Phases

### **Phase 1: Project Setup & Foundation** (Week 1)

**Objectives:**
- Initialize Node.js/TypeScript project
- Set up Express server with middleware
- Configure Docker and docker-compose
- Establish project structure and tooling

**Tasks:**
1. ✅ Initialize npm project with TypeScript
2. ✅ Install core dependencies (Express, TypeScript, Winston, etc.)
3. ✅ Configure tsconfig.json and ESLint
4. ✅ Create modular folder structure
5. ✅ Set up Express app with:
   - Error handling middleware
   - Request validation (Zod)
   - Logging (Winston)
   - CORS configuration
   - Rate limiting
6. ✅ Create Dockerfile and docker-compose.yml
7. ✅ Set up health check endpoint (`/health`)
8. ✅ Configure environment variables (.env.example)
9. ✅ Initialize Git repository
10. ✅ Write initial README.md

**Deliverables:**
- Working Express server running in Docker
- Health check endpoint responding
- Structured logging operational
- Local development environment ready

**Validation:**
```bash
docker-compose up
curl http://localhost:8080/health
# Expected: {"status": "ok", "timestamp": "..."}
```

---

### **Phase 2: Gemini AI Integration** (Week 2)

**Objectives:**
- Integrate Vertex AI SDK
- Implement Gemini 3 Pro chat functionality
- Create service layer for AI operations
- Build chat controller and routes

**Tasks:**
1. ✅ Install Vertex AI SDK (`@google-cloud/vertexai`)
2. ✅ Configure Google Cloud authentication
3. ✅ Create `GeminiService` class:
   - Initialize Vertex AI client
   - Implement `generateResponse()` method
   - Implement `generateEmbedding()` method
   - Handle streaming responses (optional)
4. ✅ Create `ChatService` orchestration layer
5. ✅ Build `ChatController`:
   - POST `/api/chat` - Send message
   - GET `/api/chat/:sessionId` - Get chat history
6. ✅ Implement request/response validation
7. ✅ Add error handling for API failures
8. ✅ Write unit tests for GeminiService
9. ✅ Test integration with Gemini API
10. ✅ Document API endpoints (OpenAPI/Swagger)

**Deliverables:**
- Functional chat endpoint
- Gemini responses working
- API documentation
- Unit tests passing

**Validation:**
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-123", "message": "Hello, how are you?"}'
# Expected: {"response": "...", "sessionId": "test-123"}
```

---

### **Phase 3: Database & Memory Layer** (Week 3)

**Objectives:**
- Set up PostgreSQL with pgvector
- Implement database schema and migrations
- Build repository layer for data access
- Integrate vector-based memory retrieval

**Tasks:**
1. ✅ Set up PostgreSQL with pgvector in docker-compose
2. ✅ Create database migration files:
   - `001_initial_schema.sql` (sessions, messages)
   - `002_add_pgvector.sql` (embeddings, indexes)
3. ✅ Choose ORM strategy (Prisma vs raw pg):
   - If Prisma: Create schema.prisma
   - If pg: Create connection pool
4. ✅ Implement repositories:
   - `SessionRepository` - CRUD for sessions
   - `ChatRepository` - Message storage/retrieval
   - `VectorRepository` - Embedding operations
5. ✅ Create `MemoryService`:
   - Store messages with embeddings
   - Retrieve relevant context via vector search
   - Implement RAG pattern
6. ✅ Integrate memory into `ChatService`
7. ✅ Add session management endpoints:
   - POST `/api/sessions` - Create session
   - GET `/api/sessions/:id` - Get session
   - DELETE `/api/sessions/:id` - Delete session
8. ✅ Write integration tests for database layer
9. ✅ Optimize vector search performance
10. ✅ Add database connection health checks

**Deliverables:**
- Working PostgreSQL database with pgvector
- All migrations applied
- Memory-augmented chat responses
- Session management functional

**Validation:**
```bash
# Test vector search
curl -X POST http://localhost:8080/api/chat \
  -d '{"sessionId": "test", "message": "What did we discuss earlier?"}'
# Expected: Response includes context from previous messages
```

---

### **Phase 4: Cloud Run Deployment & Production** (Week 4)

**Objectives:**
- Deploy to Google Cloud Run
- Configure Cloud SQL and Secret Manager
- Set up CI/CD pipeline
- Implement monitoring and observability

**Tasks:**
1. ✅ Create Google Cloud project
2. ✅ Enable required APIs:
   - Cloud Run API
   - Cloud SQL Admin API
   - Vertex AI API
   - Secret Manager API
   - Artifact Registry API
3. ✅ Provision Cloud SQL PostgreSQL instance:
   - Enable pgvector extension
   - Configure private IP (VPC connector)
   - Set up automated backups
4. ✅ Run database migrations on Cloud SQL
5. ✅ Create secrets in Secret Manager:
   - DATABASE_URL
   - GEMINI_API_KEY
   - JWT_SECRET
6. ✅ Create service account with permissions:
   - Cloud SQL Client
   - Secret Manager Secret Accessor
   - Vertex AI User
7. ✅ Build and push Docker image to Artifact Registry
8. ✅ Deploy to Cloud Run:
   - Configure environment variables
   - Attach secrets
   - Set up Cloud SQL connection
   - Configure autoscaling (min: 0, max: 10)
9. ✅ Set up GitHub Actions workflow:
   - Workload Identity Federation
   - Automated testing
   - Docker build and push
   - Cloud Run deployment
10. ✅ Configure monitoring:
    - Cloud Logging integration
    - Error reporting
    - Uptime checks
    - Custom metrics (token usage, response time)
11. ✅ Set up custom domain (optional)
12. ✅ Load testing and performance optimization
13. ✅ Security audit:
    - HTTPS enforcement
    - CORS configuration
    - Rate limiting
    - Input validation
14. ✅ Documentation:
    - Deployment guide
    - API documentation
    - Troubleshooting guide

**Deliverables:**
- Production chatbot running on Cloud Run
- Automated CI/CD pipeline
- Monitoring and logging configured
- Complete documentation

**Validation:**
```bash
# Test production endpoint
curl -X POST https://chatbot-backend-xxxxx.run.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"sessionId": "prod-test", "message": "Hello production!"}'

# Check health
curl https://chatbot-backend-xxxxx.run.app/health
```

---

## 📈 Performance & Scalability Considerations

### Cloud Run Configuration

```yaml
Resources:
  CPU: 1 vCPU
  Memory: 512 Mi (adjust based on load)
  
Autoscaling:
  Min Instances: 0 (cost optimization)
  Max Instances: 10 (adjust based on traffic)
  Concurrency: 80 requests per instance
  
Timeout: 300 seconds (for long-running AI requests)
```

### Database Connection Pooling

```typescript
// src/config/database.ts
export const poolConfig = {
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

### Caching Strategy

```typescript
// Optional: Redis for session caching
- Cache frequently accessed sessions
- Store rate limit counters
- Cache Gemini responses for identical queries
```

### Cost Optimization

1. **Cloud Run**: Pay-per-use, scale to zero
2. **Cloud SQL**: Use shared-core instance for dev/staging
3. **Vertex AI**: Monitor token usage, implement request batching
4. **Secrets**: Minimal cost, cache in memory after retrieval

---

## 🧪 Testing Strategy

### Test Pyramid

```
        /\
       /E2E\         - Full API flow tests
      /------\
     /  INT   \      - Service integration tests
    /----------\
   /    UNIT    \    - Pure function tests
  /--------------\
```

### Test Files

```typescript
// tests/unit/services/gemini.service.test.ts
describe('GeminiService', () => {
  it('should generate response from Gemini API', async () => {
    // Mock Vertex AI client
    // Test response generation
  });
});

// tests/integration/chat.integration.test.ts
describe('Chat API', () => {
  it('should create session and send message', async () => {
    // Test full flow with test database
  });
});

// tests/e2e/chat-flow.e2e.test.ts
describe('Chat E2E Flow', () => {
  it('should maintain conversation context', async () => {
    // Test multi-turn conversation
  });
});
```

---

## 📝 API Endpoints Summary

### Chat Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message and get AI response |
| GET | `/api/chat/:sessionId` | Get chat history for session |
| DELETE | `/api/chat/:sessionId` | Clear chat history |

### Session Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Create new session |
| GET | `/api/sessions/:id` | Get session details |
| DELETE | `/api/sessions/:id` | Delete session |

### Utility Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics (optional) |

---

## 🔍 Monitoring & Observability

### Logging Structure

```typescript
// Winston logger configuration
logger.info('Chat request received', {
  sessionId: 'xxx',
  messageLength: 50,
  timestamp: new Date().toISOString()
});

logger.error('Gemini API error', {
  error: error.message,
  stack: error.stack,
  sessionId: 'xxx'
});
```

### Key Metrics to Track

1. **Request Metrics**:
   - Request count
   - Response time (p50, p95, p99)
   - Error rate

2. **AI Metrics**:
   - Gemini API latency
   - Token usage per request
   - Embedding generation time

3. **Database Metrics**:
   - Query execution time
   - Connection pool utilization
   - Vector search performance

4. **Business Metrics**:
   - Active sessions
   - Messages per session
   - User retention

---

## 🚨 Error Handling Strategy

### Error Types

```typescript
// src/utils/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class GeminiAPIError extends AppError {
  constructor(message: string) {
    super(502, `Gemini API Error: ${message}`);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(500, `Database Error: ${message}`);
  }
}
```

### Global Error Handler

```typescript
// src/middleware/error.middleware.ts
export const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }
  
  // Unknown errors
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
};
```

---

## 📚 Additional Resources

### Documentation to Create

1. **README.md** - Project overview and quick start
2. **DEPLOYMENT.md** - Detailed deployment instructions
3. **API.md** - Complete API documentation
4. **CONTRIBUTING.md** - Development guidelines
5. **ARCHITECTURE.md** - This document (expanded)

### Recommended Tools

- **Postman/Insomnia**: API testing
- **pgAdmin**: Database management
- **Cloud Console**: GCP resource management
- **Grafana**: Advanced monitoring (optional)

---

## ✅ Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, e2e)
- [ ] Environment variables configured in Secret Manager
- [ ] Database migrations applied to Cloud SQL
- [ ] Service account permissions verified
- [ ] API endpoints documented
- [ ] Error handling tested
- [ ] Rate limiting configured
- [ ] CORS settings verified
- [ ] Logging and monitoring active
- [ ] Security audit completed
- [ ] Load testing performed
- [ ] Backup strategy implemented
- [ ] Rollback plan documented

---

## 🎯 Success Criteria

### Technical Success
- ✅ API response time < 2 seconds (p95)
- ✅ 99.9% uptime
- ✅ Zero data loss
- ✅ Successful autoscaling under load
- ✅ All security best practices implemented

### Business Success
- ✅ Coherent multi-turn conversations
- ✅ Relevant context retrieval from memory
- ✅ Cost-efficient operation (< $X per 1000 requests)
- ✅ Easy to maintain and extend

---

## 📞 Next Steps

**Awaiting your feedback on:**

1. **Database Choice**: Cloud SQL vs Supabase preference?
2. **ORM Strategy**: Prisma vs raw node-postgres?
3. **Authentication**: API key, JWT, or session-based?
4. **Streaming**: Should Gemini responses stream or batch?
5. **Additional Features**: 
   - Multi-language support?
   - File upload handling?
   - Voice input/output?
6. **Budget Constraints**: Any cost limitations to consider?

**Ready to proceed with Phase 1 upon your approval!**

---

*This blueprint provides a comprehensive foundation for building a production-ready AI chatbot backend. Each phase is designed to be iterative and testable, ensuring a robust and scalable solution.*
