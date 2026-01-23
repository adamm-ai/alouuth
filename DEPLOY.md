# Amini Academy - Bajan-X Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         RENDER CLOUD                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   Frontend      │    │   Backend API   │    │  PostgreSQL │ │
│  │   (Static)      │───▶│   (Node.js)     │───▶│  Database   │ │
│  │   React/Vite    │    │   Express       │    │             │ │
│  └─────────────────┘    └────────┬────────┘    └─────────────┘ │
│                                  │                              │
│                         ┌────────┴────────┐                     │
│                         │  Render Disk    │                     │
│                         │  (500GB Storage)│                     │
│                         │  /uploads       │                     │
│                         └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. A [Render](https://render.com) account
2. PostgreSQL database on Render (or external)

## Quick Deploy

### Option 1: Using render.yaml (Blueprint)

1. Push your code to GitHub/GitLab
2. Go to Render Dashboard → **New** → **Blueprint**
3. Connect your repository
4. Render will automatically create:
   - PostgreSQL database
   - Backend API service
   - Frontend static site
   - 500GB disk for uploads

### Option 2: Manual Setup

#### Step 1: Create PostgreSQL Database

1. Render Dashboard → **New** → **PostgreSQL**
2. Name: `amini-academy-db`
3. Plan: Starter (or higher)
4. Copy the **Internal Database URL**

#### Step 2: Deploy Backend API

1. Render Dashboard → **New** → **Web Service**
2. Connect your repository
3. Settings:
   - **Name**: `amini-academy-api`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. Environment Variables:
   ```
   NODE_ENV=production
   DATABASE_URL=<your-internal-database-url>
   JWT_SECRET=<generate-a-secure-random-string>
   FRONTEND_URL=https://your-frontend-url.onrender.com
   MAX_FILE_SIZE=52428800
   ```

5. Add Disk:
   - **Name**: uploads
   - **Mount Path**: `/opt/render/project/src/uploads`
   - **Size**: 500 GB

#### Step 3: Deploy Frontend

1. Render Dashboard → **New** → **Static Site**
2. Connect your repository
3. Settings:
   - **Name**: `amini-academy`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. Environment Variables:
   ```
   VITE_API_URL=https://amini-academy-api.onrender.com/api
   ```

## Database Setup

After deployment, run migrations and seed data:

```bash
# SSH into your backend service or use Render Shell

# Run migrations
npm run db:migrate

# Seed with Bajan-X curriculum
npm run db:seed
```

## Default Admin Account

After seeding, use these credentials:

- **Email**: `admin@amini.gov.bb`
- **Password**: `Admin@2024!`

⚠️ **Change this password immediately after first login!**

## Environment Variables Reference

### Backend (`server/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret key for JWT tokens | Random 64+ character string |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `production` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://amini-academy.onrender.com` |
| `MAX_FILE_SIZE` | Max upload size in bytes | `52428800` (50MB) |

### Frontend (`.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://amini-academy-api.onrender.com/api` |
| `VITE_USE_MOCK` | Use mock data | `false` |

## File Storage

The system supports two modes for course content:

### 1. External URLs (YouTube/Google Drive)
- Enter YouTube embed URLs for videos
- Enter Google Drive share URLs for documents
- No storage used on Render

### 2. Direct Upload (Render Disk)
- Upload PDFs, PPTs, videos directly
- Files stored on the 500GB Render disk
- Served via `/uploads` endpoint

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Courses
- `GET /api/courses` - List all courses
- `GET /api/courses/:id` - Get course details
- `POST /api/courses` - Create course (Admin)
- `PUT /api/courses/:id` - Update course (Admin)
- `DELETE /api/courses/:id` - Delete course (Admin)

### Progress
- `POST /api/progress/enroll/:courseId` - Enroll in course
- `POST /api/progress/lesson/:lessonId/complete` - Complete lesson
- `GET /api/progress/dashboard` - Get user stats

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/ministry-stats` - Ministry engagement
- `GET /api/admin/users` - List users

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Migration Failures
```bash
# Reset and re-run
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run db:migrate
npm run db:seed
```

### Upload Issues
- Check disk is mounted at correct path
- Verify MAX_FILE_SIZE setting
- Check file permissions

## Support

For issues, contact:
- Technical: support@amini.gov.bb
- Curriculum: training@amini.gov.bb
