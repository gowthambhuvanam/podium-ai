# Podium

**Podium is a real-time platform where you debate live against AI, and the AI does far more than just argue back.**

Pick a topic, pick a side, and debate. You are not facing one AI. You are facing five, each with a distinct job, all running at the same time, with full analysis before, during, and after every debate.

**Live demo: https://podiumdebate.vercel.app**

---

## What it does

### Five AI roles, each with a distinct job

| Role | What it does |
|------|--------------|
| **Participant** | Argues the opposing side and behaves like a real person. Greets you first and only starts arguing once the debate gets going. |
| **Coach** | Watches how you phrased your own point and shows you how to say it better. Never feeds you arguments, only improves your delivery. |
| **Devil's Advocate** | A lifeline, not a chat bot. Each side gets three hearts. When you are losing, spend one to get counter-arguments to fight back. |
| **Interrogator** | Asks sharp Socratic questions to expose weak reasoning. |
| **Judge** | Stays silent the whole time, then delivers a full verdict: who won, why, and the strongest argument you never made. |

### Analysis before, during, and after

- **Before:** AI sharpens your topic into a clear proposition, predicts how the room will lean, and gives you a private briefing with key arguments, expected counterarguments, and stats you can use.
- **During:** real-time fallacy detection, a live momentum meter showing who is winning the room, coaching, and the lifeline system.
- **After:** a full verdict and a per-debater performance breakdown covering your strongest point, your biggest weakness, and the counterargument you missed.

### Three modes plus spectators

- **Solo** against the AI
- **1v1** between two humans
- **Group** debates up to ten people
- **Spectator** role with no limit, so anyone can join purely to watch a debate unfold live

### More

- **Voice input** so you can speak your arguments instead of typing
- **Topic suggestions** by category for when you do not know what to debate
- Accounts, debate history, and a credit system

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router) on Vercel |
| Backend | Node.js + Express + Socket.io on Railway (persistent WebSocket server) |
| Database and auth | Supabase (PostgreSQL) |
| AI | Groq running Llama 4 Scout for live responses and Llama 3.3 70B for the final verdict |

---

## Architecture

```
Browser (Next.js on Vercel)
        |
        |-- REST API --------> Express server (Railway)
        |-- WebSocket -------> Socket.io server (Railway)
                                       |
                       ----------------+----------------
                       |               |               |
                 AI Agent Pool   Room Manager     Supabase
                 (5 roles)       (state, hearts)  (Postgres, auth)
                       |
                     Groq (LLM)
```

The real-time debate rooms, the multi-agent orchestration, and the streaming responses all run on a persistent Socket.io server. Supabase handles data and auth. Groq runs the models.

---

## Running it locally

### Prerequisites

- Node.js 20 or newer
- A free [Supabase](https://supabase.com) project
- A free [Groq](https://console.groq.com) API key

### 1. Clone the repo

```bash
git clone https://github.com/gowthambhuvanam/podium-ai.git
cd podium-ai
```

### 2. Backend

```bash
cd server
npm install
```

Create `server/.env`:

```
PORT=4000
CLIENT_URL=http://localhost:3000
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the database schema (in the Supabase SQL editor) to create the tables, then start the server:

```bash
npm run dev
```

The backend runs on `http://localhost:4000`.

### 3. Frontend

In a second terminal:

```bash
cd client
npm install
```

Create `client/.env.local`:

```
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## Project structure

```
podium-ai/
├── client/                 # Next.js frontend
│   ├── app/                # Pages: landing, auth, dashboard, create, debate room
│   ├── components/         # Shared components (logo, etc.)
│   └── lib/                # Socket, Supabase, and API clients
└── server/                 # Node + Socket.io backend
    └── src/
        ├── ai/             # LLM client, agent orchestrator, the 5 role agents
        ├── socket/         # WebSocket room manager and event handlers
        ├── routes/         # REST endpoints (debates, auth, credits)
        └── db/             # Supabase client
```

---

## Roadmap

- **Face-to-face video debates** in the style of Google Meet, so participants can debate live on camera, not just in text
- **Supervisor role** built on the spectator foundation, so a teacher can watch two student groups debate and grade them
- Team and organization accounts for schools and universities

---

## License

This project is licensed under the [MIT License](LICENSE).
