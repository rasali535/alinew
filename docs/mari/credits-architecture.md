# Mari AI — Credits & Usage Architecture

## 1. Customer-Facing Abstraction
To avoid overwhelming customers with raw LLM token counts and model pricing matrices, Mari provides a clean, unified credit meter:
- **Community Plan**: 1,000 / 10,000 Credits
- **Standard Plan**: 10,000 / 50,000 Credits
- **Enterprise Plan**: Unlimited Credits

## 2. Internal Cost & Compute Accounting
Behind the customer meter, Mari tracks:
- Input / output model tokens across providers (DeepSeek, Claude, Qwen, Gemini).
- Tool execution compute cycles (image generation, video generation, vector queries).
- API request frequencies and latency distributions.

## 3. Standalone API Ready Endpoints
- `POST /api/mari/context`
- `POST /api/mari/briefing`
- `POST /api/mari/chat`
- `POST /api/mari/actions`
