# Discord Copilot Agent

A powerful, RAG-enabled Discord bot with a modern Web Admin Console. This agent can be configured to respond in specific channels, maintain conversation memory, and answer questions based on your own uploaded knowledge base documents.

## 🚀 Features

- **Smart Conversations**: Uses OpenAI GPT-4o-mini for intelligent responses.
- **RAG Knowledge Base**: Upload PDF/TXT documents to train the bot on your specific data.
- **Admin Console**: Next.js dashboard to manage:
  - System Instructions (Personality)
  - Allowed Discord Channels
  - Conversation Memory
  - Knowledge Base Files
- **Vector Search**: Powered by Supabase `pgvector` for semantic search.

## 🛠 Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons.
- **Backend**: Python 3.12, FastAPI, Uvicorn.
- **AI/LLM**: LangChain, OpenAI Embeddings & Chat Models.
- **Database**: Supabase (PostgreSQL + Vector).
- **Bot Framework**: Discord.py.

## 📂 Project Structure

- `frontend/`: Next.js web application for the Admin Console.
- `discord-bot/`: FastAPI server running the Discord client and RAG processing services.

## ⚡ Getting Started

### Prerequisites
- Supabase project with `pgvector` enabled.
- Discord Bot Token.
- OpenAI API Key.

### 1. Backend Setup (`discord-bot/`)

```bash
cd discord-bot
# Install dependencies (using uv or pip)
uv sync 
# or
pip install -r requirements.txt

# Create .env
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_KEY, DISCORD_TOKEN, OPENAI_API_KEY, ADMIN_KEY

# Run server
python main.py
```

### 2. Frontend Setup (`frontend/`)

```bash
cd frontend
# Install dependencies
pnpm install

# Create .env
cp .env.example .env
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, BACKEND_URL

# Run development server
pnpm run dev
```

## 📝 Recent Updates

- **Production Ready**: Configured `main.py` for correct port binding on Render/Production environments.
- **Unified UI**: Consolidated the "Knowledge Base" file management into a single, clean list with delete capabilities and status tracking.
- **Robustness**: Improved error handling in document processing and upload workflows.
