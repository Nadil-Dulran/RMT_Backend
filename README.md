# Roommate Expense Tracker - Backend

A REST API built with Node.js, Express, TypeScript, and MySQL for the Roommate Expense Tracker mobile app.

Status: Active development.

This backend currently provides:

- JWT-based authentication (register and login)
- Protected user and profile endpoints
- Protected dashboard endpoint
- Group CRUD and member management
- Expense CRUD with split logic (equal, exact, percentage)

---

## Related Repository

| Layer | Repository |
|---|---|
| Frontend | https://github.com/Nadil-Dulran/RoommateExpenseTracker |
| Backend (this repo) | https://github.com/Nadil-Dulran/RMT_Backend |

---

## Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20+ recommended | Runtime |
| TypeScript | 5.9.x | Typed backend development |
| Express | 5.2.x | HTTP API framework |
| MySQL | 8+ recommended | Relational database |
| mysql2 | 3.18.x | DB driver + pooled connections |
| jsonwebtoken | 9.x | JWT token generation/validation |
| bcrypt | 6.x | Password hashing |
| cors | 2.8.x | Cross-origin API access |
| dotenv | 17.x | Environment variable loading |
| ts-node-dev | 2.x | Development server with auto-reload |

---

## Project Structure

```
RMT_Backend/
├── package.json
├── tsconfig.json
├── README.md
└── src/
		├── app.ts                         # Express app + route registration
		├── server.ts                      # Server bootstrap + DB connection test
		├── config/
		│   └── db.ts                      # MySQL pool configuration
		├── controllers/
		│   ├── authController.ts
		│   ├── profileController.ts
		│   ├── groupsController.ts
		│   └── expensesController.ts
		├── middleware/
		│   └── authMiddleware.ts          # JWT auth middleware
		├── routes/
		│   ├── authRoutes.ts
		│   ├── userRoutes.ts
		│   ├── profileRoutes.ts
		│   ├── groupsRoutes.ts
		│   └── expensesRoutes.ts
		├── services/
		│   ├── profileService.ts
		│   ├── groupsService.ts
		│   └── expensesService.ts
		├── models/                        # Currently empty
		└── utils/                         # Reserved for future utilities
```

---

## Prerequisites

Install and configure:

- Node.js (v20 or later recommended)
- MySQL server
- npm

---

## Environment Variables

Create a .env file in the project root with values like:

```
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=roommate_expense_tracker

JWT_SECRET=replace_with_a_strong_secret
```

Notes:

- PORT defaults to 3000 if not set.
- JWT_SECRET is required for login token generation and token verification.

---

## Installation and Run (VS Code / macOS)

1. Install dependencies

```
npm install
```

2. Start MySQL and ensure your target database exists

3. Start backend in development mode

```
npm run dev
```

Expected startup logs include:

- MySQL Connected
- Server running on port 3000

---
