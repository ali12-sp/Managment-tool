# 🚀 OpsBoard - Collaborative Task Management Tool

A modern, full-stack collaborative task management application inspired by Trello and Asana. Built with a focus on team collaboration, real-time updates, and ease of use.

## ✨ Features

### Core Features
- ✅ **Team Workspaces (Organizations)** - Create and manage group projects
- ✅ **Project Boards** - Organize tasks by projects
- ✅ **Task Management** - Create, assign, and track tasks with due dates
- ✅ **Task Statuses** - TODO, In Progress, Done
- ✅ **Task Comments** - Communicate within tasks
- ✅ **Team Collaboration** - Assign tasks to team members
- ✅ **Role-Based Access** - Owner, Admin, Member roles
- ✅ **Real-Time Notifications** - Live updates using Server-Sent Events (SSE)

### Additional Features
- 🔐 **Secure Authentication** - JWT-based auth with refresh tokens
- 💳 **Billing Integration** - Stripe subscription management
- 📊 **Dashboard** - Overview of projects and tasks
- 🎨 **Modern UI** - Built with Tailwind CSS and React

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, bcrypt, rate limiting
- **Real-time**: Server-Sent Events (SSE)
- **Payment**: Stripe integration
- **Validation**: Zod

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **State**: React Hooks

### Deployment
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose (local), Railway (production)
- **Package Manager**: pnpm

## 📋 Prerequisites

Before you begin, ensure you have installed:
- Node.js 20+ ([nodejs.org](https://nodejs.org))
- pnpm 10+ (`npm install -g pnpm`)
- PostgreSQL 16+ ([postgresql.org](https://www.postgresql.org))
- Docker & Docker Compose (optional, for containerized setup)

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/ali12-sp/Managment-tool.git
cd opsboard
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Set Up Environment Variables

#### Backend API
```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opsboard
PORT=4000
JWT_ACCESS_SECRET=your-super-secret-key-at-least-30-chars
JWT_REFRESH_SECRET=your-refresh-secret-at-least-30-chars
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=7
APP_URL=http://localhost:3000
```

#### Frontend Web
```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NODE_ENV=development
```

### 4. Set Up Database

#### Option A: Using Docker Compose (Recommended)
```bash
docker-compose up -d
```

#### Option B: Local PostgreSQL
```bash
# Create database
createdb opsboard

# Run migrations
cd apps/api
pnpm prisma migrate deploy
```

### 5. Start Development Servers

#### Terminal 1 - Backend API
```bash
cd apps/api
pnpm run dev
# Server runs on http://localhost:4000
```

#### Terminal 2 - Frontend Web
```bash
cd apps/web
pnpm run dev
# App runs on http://localhost:3000
```

## 📖 Usage

1. **Open** `http://localhost:3000` in your browser
2. **Register** a new account or login
3. **Create** a workspace (organization)
4. **Add** team members
5. **Create** projects
6. **Manage** tasks and collaborate with your team!

## 🔐 API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

### Organizations
- `POST /orgs` - Create organization
- `GET /orgs/mine` - Get user's organizations
- `GET /orgs/members` - Get organization members

### Projects
- `GET /projects` - List projects
- `POST /projects` - Create project
- `GET /projects/:projectId` - Get project details

### Tasks
- `GET /tasks` - List tasks
- `POST /tasks` - Create task
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `GET /tasks/:id/details` - Get task details with comments

### Task Comments
- `POST /tasks/:id/comments` - Add comment to task
- `GET /tasks/:id/comments` - Get task comments

### Notifications
- `GET /notifications` - Get real-time event stream
- `POST /notifications/read-all` - Mark all as read

## 📦 Project Structure

```
taskflow/
├── apps/
│   ├── api/                    # Express backend
│   │   ├── src/
│   │   │   └── index.ts       # Main API server
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # Database schema
│   │   │   └── migrations/    # Database migrations
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── tsconfig.json
│   │
│   └── web/                    # Next.js frontend
│       ├── app/
│       │   ├── (dashboard)/   # Protected dashboard routes
│       │   ├── auth/          # Auth pages
│       │   ├── billing/       # Billing pages
│       │   └── page.tsx       # Home page
│       ├── components/        # React components
│       ├── package.json
│       ├── Dockerfile
│       └── tsconfig.json
│
├── infra/                      # Infrastructure configs
├── docker-compose.yml          # Local development setup
├── pnpm-workspace.yaml         # pnpm monorepo config
├── RAILWAY_DEPLOYMENT.md       # Production deployment guide
└── README.md                   # This file
```

## 🚢 Deployment

### Quick Deployment to Railway

Follow the **[Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)** for step-by-step instructions.

**Quick Summary:**
1. Create Railway project and link GitHub repo
2. Add PostgreSQL service
3. Add API service (with env vars)
4. Add Web service (with env vars)
5. Deploy and monitor

**⏱️ Estimated time: 10-15 minutes**

## 🧪 Testing

Run tests (when implemented):
```bash
pnpm test
```

## 🐛 Troubleshooting

### Database connection fails
- Ensure PostgreSQL is running: `psql -U postgres -d opsboard`
- Check `DATABASE_URL` in `.env` file
- Verify migrations: `pnpm prisma migrate status`

### Frontend can't connect to API
- Verify API is running on `http://localhost:4000`
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for CORS or network errors

### Docker issues
- Ensure Docker daemon is running
- Rebuild: `docker-compose up --build`
- Clean up: `docker-compose down -v`

## 📝 Environment Variables

See `apps/api/.env.example` and `apps/web/.env.example` for all available options.

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Commit: `git commit -m "Add feature"`
4. Push: `git push origin feature/your-feature`
5. Submit a Pull Request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 👨‍💻 Author

**Ali12-sp** - [GitHub](https://github.com/ali12-sp)

## 📞 Support

For issues and questions:
1. Check existing issues: [GitHub Issues](https://github.com/ali12-sp/Managment-tool/issues)
2. Create a new issue with detailed description
3. Reference error logs and environment details

---

## 🎯 Roadmap

- [ ] WebSocket support for real-time collaboration
- [ ] Drag-and-drop task board
- [ ] File attachments for tasks
- [ ] Advanced filtering and search
- [ ] Email notifications
- [ ] Mobile app
- [ ] Team activity feed
- [ ] Task templates

---

⭐ **If you like OpsBoard, please star the repository!**

Made with ❤️ by Ali - Deployed with Railway 🚀
