# Grailtopia - Application Overview

Test it out: https://grail-topia.com

Grailtopia is a production-grade, full-stack web application deployed on AWS EC2 and managed through a fully automated CI/CD pipeline using GitHub Actions. The system is containerized with Docker Compose and includes a React frontend, TypeScript/Express backend, and MySQL database running behind an Nginx reverse proxy with automatic HTTPS.

---

## Services

### 1. Frontend (React 18 + Nginx)
- Built with **React 18**, React Router, and React Hook Form.  
- Uses the **Context API** and secure cookies for authentication state.  
- Styled with a **custom CSS variable theme system** for consistency across devices.  
- Served in production through **Nginx**, which also handles static asset delivery and routing.

---

### 2. Backend API (Node.js + Express + TypeScript)
- Fully typed backend using **TypeScript 5**.  
- Layered architecture: controllers, services, DAOs, and models.  
- REST API routes for authentication, collection management, Discogs integration, and internal services.  
- Validates and sanitizes all incoming data; uses **parameterized SQL queries** for security.

---

### 3. Database (MySQL 8.0)
- Normalized relational schema including:
  - Users  
  - Collections  
  - Records  
  - Follows  
  - Discogs OAuth tokens  
- Indexed for fast queries and relational consistency.

---

### 4. Reverse Proxy & HTTPS (Nginx + Let's Encrypt)
- Nginx routes all traffic to frontend and backend services.  
- Handles **SSL termination** and automatically renews **Let's Encrypt certificates**.  
- Provides reliable routing, caching, and production stability.

---

## Authentication & Authorization

### JWT Authentication
- User sessions authenticated with **JSON Web Tokens**.  
- JWTs include user identity and role information.  
- Validated on every protected API route.  
- Secure cookies used for session persistence on the frontend.

---

## OAuth 1.0a (Discogs Integration)
Grailtopia implements a complete OAuth 1.0a workflow to integrate with the Discogs API:

1. Generate request tokens and sign all OAuth requests.  
2. Redirect users to Discogs for authentication.  
3. Exchange verifier for an access token.  
4. Store tokens securely in MySQL.  
5. Access Discogs endpoints for:
   - Collection syncing  
   - Wantlist syncing  
   - Marketplace pricing  
   - Release & artist metadata  

This enables real-time vinyl metadata, values, and user-specific collection data.

---

## Infrastructure & CI/CD

### Docker & Docker Compose
All services run in containers:
- Frontend (Nginx + React build)  
- Backend API  
- MySQL database  

Docker Compose manages networking, environment variables, service dependencies, and health checks.

---

### GitHub Actions CI/CD
Every push to `main` triggers a full automated pipeline:

1. Run **Jest unit and integration tests**.  
2. Build Docker images for each service.  
3. SSH into the EC2 host.  
4. Pull updated images.  
5. Restart Docker Compose stack.  
6. Perform service health checks before confirming deployment.

Deployments consistently complete in under two minutes.

---

## Testing
- Automated test suite powered by **Jest + ts-jest**.  
- Includes:
  - Unit tests  
  - API integration tests  
  - Database operation tests  
- CI pipeline blocks deployment on any failing tests.
