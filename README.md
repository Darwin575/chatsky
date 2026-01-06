# Chatsky - Anonymous Real-Time Chat

Chatsky is a modern, anonymous real-time chat application built for instant communication without the friction of registration. Jump into a globally shared chat room ("The Void") and start conversing immediately.

## 🚀 Features

- **Anonymous Authentication**: One-click entry using device-based anonymous tokens.
- **Real-Time Messaging**: Instant message delivery powered by Socket.IO.
- **Rich Media**: Share images directly in the chat.
- **Replies & Context**: Reply to specific messages (text or images) with visual context previews.
- **Live User Tracking**: See how many users are currently active in the void.
- **Immersive UI**: sleek, dark-mode design with glassmorphism effects and smooth Framer Motion animations.
- **Responsive Design**: Fully optimized for mobile and desktop experiences.
- **Countdown Events**: Special visual countdown timers for scheduled events.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State/Socket**: Socket.IO Client

### Backend
- **Framework**: [NestJS](https://nestjs.com/)
- **WebSocket**: Socket.IO Gateway
- **Database Logic**: [TypeORM](https://typeorm.io/)
- **Database**: PostgreSQL (via Docker)
- **Caching/State**: Redis (via Docker)

## 📦 Installation

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose

### 1. Clone the Repository
```bash
git clone https://github.com/Darwin575/chatsky.git
cd chatsky
```

### 2. Start Infrastructure (DB & Redis)
Use Docker Compose to spin up the PostgreSQL database and Redis instance.
```bash
docker-compose up -d
```

### 3. Backend Setup
Navigate to the backend directory, install dependencies, and start the server.
```bash
cd backend
npm install
# Run migrations (if applicable) or ensure DB sync is on (dev mode)
npm run start:dev
```
The backend will run on `http://localhost:3002`.

### 4. Frontend Setup
Open a new terminal, navigate to the frontend directory, and start the Next.js app.
```bash
cd frontend
npm install
npm run dev
```
The application will be live at `http://localhost:3000`.

## 🔧 Environment Variables

### Backend (`backend/.env`)
Create a `.env` file in the `backend` folder:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=chatsky
JWT_SECRET=supersecretkey
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Frontend (`frontend/.env.local`)
Create a `.env.local` file in the `frontend` folder (optional if defaults work):
```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📄 License
MIT
