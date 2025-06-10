# 🏓 ft_transcendence - Pong Game Platform

A modern, full-stack implementation of the classic Pong game with multiplayer capabilities, tournaments, and advanced authentication.

## 🚀 Features

### ✅ **Authentication System**
- **Email/Password** authentication with secure password hashing
- **GitHub OAuth** integration 
- **JWT tokens** with automatic expiration
- **User profiles** with statistics and avatars
- **Security logging** for all authentication events
- **GDPR compliance** features

### 🎮 **Game Features**
- **Classic Pong** gameplay with modern graphics
- **Real-time multiplayer** support
- **Tournament system** with bracket management
- **User statistics** and leaderboards
- **Match history** tracking

### 🛡️ **Security**
- Password hashing with bcrypt
- JWT token validation
- SQL injection protection
- XSS attack prevention
- Security event logging

## 🔧 **Tech Stack**

### Backend
- **Fastify** (Node.js framework)
- **TypeScript** for type safety
- **SQLite** database with custom ORM
- **JWT** for authentication
- **bcrypt** for password hashing

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for fast development
- **Context API** for state management

### DevOps
- **Docker** & **Docker Compose**
- **Hot reload** for development
- **Environment configuration**
- **Automated database migrations**

## 🚀 **Quick Start**

### Prerequisites
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ft_transcendence
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Configure GitHub OAuth** (optional)
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Create a new OAuth App:
     - Application name: `ft_transcendence_auth`
     - Homepage URL: `http://localhost:3000`
     - Authorization callback URL: `http://localhost:8000/api/auth/github/callback`
   - Add your credentials to `.env`:
     ```bash
     GITHUB_CLIENT_ID=your_github_client_id
     GITHUB_CLIENT_SECRET=your_github_client_secret
     ```

4. **Start the project**
   ```bash
   make dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## 📋 **Available Commands**

```bash
# Development
make dev                    # Start development environment
make stop                   # Stop all containers
make logs                   # Show logs
make logs-backend          # Show backend logs only
make logs-frontend         # Show frontend logs only

# Database
make db-reset              # Reset database
make db-migrate            # Run migrations
make db-migrate-github     # Run GitHub OAuth migration
make db-seed               # Seed database with test data
make db-stats              # Show database statistics

# Docker
make build                 # Rebuild images
make clean                 # Clean containers and images
make shell-backend         # Open backend container shell
make shell-frontend        # Open frontend container shell
```

## 🗄️ **Database Schema**

### Users Table
- Authentication (email, password_hash)
- OAuth integration (google_id, github_id)
- User profiles (display_name, avatar_url)
- Game statistics (total_wins, total_losses, total_games)
- GDPR compliance (data_consent)

### Additional Tables
- **tournaments** - Tournament management
- **matches** - Game match records
- **security_logs** - Authentication events
- **jwt_tokens** - Token management

## 🔐 **Environment Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `BACKEND_PORT` | Backend port | `8000` |
| `FRONTEND_PORT` | Frontend port | `3000` |
| `JWT_SECRET` | JWT signing secret | `your_super_secret_jwt_key_change_this_in_production` |
| `JWT_EXPIRES_IN` | JWT expiration time | `24h` |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | - |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | - |

## 📁 **Project Structure**

```
ft_transcendence/
├── backend/                 # Fastify backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── database/       # Database layer
│   │   ├── repositories/   # Data access layer
│   │   ├── middleware/     # Custom middleware
│   │   ├── types/          # TypeScript definitions
│   │   └── scripts/        # Database scripts
│   └── Dockerfile
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   └── services/       # API services
│   └── Dockerfile
├── docs/                   # Documentation
├── db/                     # Database files
├── docker-compose.yml      # Container orchestration
├── Makefile               # Development commands
└── README.md              # This file
```

## 🎮 **Usage**

### Authentication
1. **Register** with email/password or GitHub OAuth
2. **Login** using your preferred method
3. **Update profile** with display name and avatar

### Playing Pong
1. Access the game from the dashboard
2. Use keyboard controls:
   - Player 1: `W` (up) and `S` (down)
   - Player 2: `↑` (up) and `↓` (down)
3. First to 3 points wins!

### Tournaments
- Create or join tournaments
- Compete against other players
- Track your progress in brackets

## 🛠️ **Development**

### Adding New Features
1. Backend: Add routes in `backend/src/routes/`
2. Frontend: Add components in `frontend/src/components/`
3. Database: Update schema and create migrations

### Database Migrations
```bash
# Create a new migration script
touch backend/src/scripts/migrate-feature.ts

# Run the migration
make shell-backend
npm run db:migrate:feature
```

### Testing
```bash
# Backend
make shell-backend
npm test

# Frontend
make shell-frontend
npm test
```

## 📚 **Documentation**

- [GitHub OAuth Setup](docs/GITHUB_SETUP.md)
- [Authentication System](docs/GITHUB_AUTH_SUMMARY.md)
- [Test Component](docs/auth-test-component.tsx)

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 **License**

This project is part of the 42 School curriculum.

## 🎯 **42 Project Requirements**

This project implements the mandatory requirements for ft_transcendence:
- ✅ Single-page application
- ✅ Pong game implementation
- ✅ User management and authentication
- ✅ Tournament system
- ✅ Security measures
- ✅ Docker containerization

### Modules Implemented
- 🔧 **Backend Framework**: Fastify with Node.js
- 🎨 **Frontend Framework**: Tailwind CSS
- 🗄️ **Database**: SQLite
- 🔐 **Authentication**: Standard user management + GitHub OAuth
- 🌐 **Remote Players**: WebSocket implementation ready

---

**🎮 Happy gaming! 🏓**