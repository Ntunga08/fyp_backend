# EduTrack - Teacher Attendance & Lesson Management System

A comprehensive school management system for tracking teacher attendance, managing timetables, handling leave requests, and monitoring lesson delivery with face verification capabilities.

## 🌟 Features

- **Multi-School Support**: Manage multiple schools from a single platform
- **Role-Based Access**: Admin, Principal, and Teacher roles with appropriate permissions
- **Teacher Attendance**: GPS-based check-in with geofencing
- **Timetable Management**: Create and manage class schedules
- **Leave Management**: Request, approve, and track teacher leave
- **Lesson Tracking**: Monitor conducted, missed, and substituted lessons
- **Substitute Teacher Assignment**: Automatically assign substitutes for absent teachers
- **Holiday Management**: School-specific holiday calendars
- **Notifications**: Real-time notifications for important events
- **Face Verification**: Biometric verification for attendance (in development)
- **Reports**: Comprehensive attendance and lesson reports

## 🏗️ Project Structure

```
edutrack/
├── backend/              # Node.js + Express + Prisma backend
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Auth & validation
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Helper functions
│   ├── prisma/           # Database schema & migrations
│   ├── docker-compose.yml
│   └── dockerfile
├── fyp_frontend/         # React + TypeScript frontend (in development)
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Docker** and **Docker Compose** (recommended)
- OR **Node.js 20+**, **PostgreSQL 14+**, and **pnpm**

### Option 1: Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd edutrack
   ```

2. **Navigate to backend**
   ```bash
   cd backend
   ```

3. **Start the application**
   ```bash
   docker-compose up -d --build
   ```

4. **Wait for services to start** (about 15-20 seconds)

5. **Seed the database with Tanzania sample data**
   ```bash
   docker-compose exec backend pnpm exec tsx seed-tanzania.ts
   ```

6. **Access the application**
   - API: http://localhost:3000
   - pgAdmin: http://localhost:5050
   - Prisma Studio: Run `docker-compose exec backend pnpm exec prisma studio`

### Option 2: Local Development

See [backend/README.md](backend/README.md) for detailed local setup instructions.
