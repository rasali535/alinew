# Chatbot Backend

Production-ready AI chatbot backend powered by Google's Gemini 3 Pro via Vertex AI, built with Node.js, TypeScript, and Express.

## 🚀 Features

- **AI-Powered Conversations**: Gemini 3 Pro integration via Vertex AI SDK
- **Session Management**: Multi-turn conversation support with context retention
- **Type-Safe**: Full TypeScript implementation with strict type checking
- **Production-Ready**: Comprehensive error handling, logging, and monitoring
- **Secure**: API key authentication, rate limiting, and security headers
- **Scalable**: Designed for Google Cloud Run deployment

## 📋 Prerequisites

- Node.js 20+ and npm 10+
- Google Cloud Project with Vertex AI API enabled
- Google Cloud credentials (for local development)

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   cd chatbot-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up Google Cloud credentials**

   ```bash
   # Option 1: Use gcloud CLI
   gcloud auth application-default login
   
   # Option 2: Use service account key
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

The server will start on `http://localhost:8080` with hot-reload enabled.

### Production Build

```bash
npm run build
npm start
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## 📡 API Endpoints

### Health Check

```bash
GET /health
```

### Chat Endpoints

**Send Message**

```bash
POST /api/chat
Headers: X-API-Key: your-api-key
Body: {
  "sessionId": "uuid-v4",
  "message": "Hello, how are you?",
  "userId": "optional-user-id"
}
```

**Get Chat History**

```bash
GET /api/chat/:sessionId
Headers: X-API-Key: your-api-key
```

**Clear Chat History**

```bash
DELETE /api/chat/:sessionId
Headers: X-API-Key: your-api-key
```

### Session Endpoints

**Create Session**

```bash
POST /api/sessions
Headers: X-API-Key: your-api-key
Body: {
  "userId": "optional-user-id",
  "metadata": {}
}
```

**Get Session**

```bash
GET /api/sessions/:sessionId
Headers: X-API-Key: your-api-key
```

**Delete Session**

```bash
DELETE /api/sessions/:sessionId
Headers: X-API-Key: your-api-key
```

## 🧪 Testing

### Example cURL Request

```bash
# Create a session
SESSION_ID=$(curl -X POST http://localhost:8080/api/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"userId":"test-user"}' | jq -r '.sessionId')

# Send a message
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"message\":\"Tell me a joke\"}"
```

## 🏗️ Project Structure

```
chatbot-backend/
├── src/
│   ├── config/           # Configuration management
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   ├── services/         # Business logic (Gemini integration)
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utilities (logger, errors)
│   ├── app.ts            # Express app setup
│   └── server.ts         # Server entry point
├── dist/                 # Compiled JavaScript (generated)
├── .env                  # Environment variables (not in git)
├── .env.example          # Environment template
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## 🔐 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing control
- **Rate Limiting**: Prevent abuse (100 requests/minute)
- **API Key Authentication**: Secure endpoint access
- **Input Validation**: Zod schema validation
- **Error Handling**: Safe error messages (no leak in production)

## 🐛 Error Handling

The API uses standard HTTP status codes and returns errors in this format:

```json
{
  "status": "error",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common Error Codes:**

- `VALIDATION_ERROR` (400): Invalid request data
- `AUTHENTICATION_ERROR` (401): Missing or invalid API key
- `NOT_FOUND` (404): Resource not found
- `TIMEOUT_ERROR` (408): Request timeout
- `SAFETY_FILTER_TRIGGERED` (422): Content blocked by Gemini safety filters
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `GEMINI_API_ERROR` (502): Gemini API failure
- `INTERNAL_ERROR` (500): Server error

## 📊 Logging

Structured JSON logging with Winston:

- **Development**: Human-readable console output
- **Production**: JSON format for log aggregation

Log levels: `error`, `warn`, `info`, `http`, `debug`

## 🚀 Deployment

### Google Cloud Run

See the Architecture Blueprint for detailed deployment instructions.

Quick deploy:

```bash
# Build Docker image
docker build -t chatbot-backend .

# Tag for Artifact Registry
docker tag chatbot-backend gcr.io/YOUR_PROJECT/chatbot-backend

# Push to registry
docker push gcr.io/YOUR_PROJECT/chatbot-backend

# Deploy to Cloud Run
gcloud run deploy chatbot-backend \
  --image gcr.io/YOUR_PROJECT/chatbot-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## 🔧 Configuration

Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 8080 |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID | - |
| `VERTEX_AI_LOCATION` | Vertex AI region | us-central1 |
| `GEMINI_MODEL` | Gemini model name | gemini-1.5-pro |
| `API_KEY` | API authentication key | - |
| `GEMINI_TEMPERATURE` | Response randomness (0-1) | 0.7 |
| `GEMINI_MAX_OUTPUT_TOKENS` | Max response length | 2048 |

## 📝 Next Steps (Phase 2 & 3)

- [ ] PostgreSQL database integration
- [ ] pgvector for semantic search and memory
- [ ] Persistent session storage
- [ ] Vector-based context retrieval (RAG)
- [ ] Database migrations
- [ ] Comprehensive test suite
- [ ] Docker and docker-compose setup
- [ ] CI/CD pipeline (GitHub Actions)

## 📄 License

MIT

## 🤝 Contributing

This is a production project. Please follow TypeScript best practices and maintain test coverage.

---

**Built with ❤️ using Node.js, TypeScript, Express, and Google Gemini AI**
