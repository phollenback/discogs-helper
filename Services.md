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
