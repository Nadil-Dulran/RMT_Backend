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

## NPM Scripts

| Script | Command | Purpose |
|---|---|---|
| dev | ts-node-dev --respawn --transpile-only src/server.ts | Start backend with hot reload |

---

## API Base URL

Local:

- http://localhost:3000

Route prefix used by the mobile app:

- /api

Dashboard route:

- GET /api/dashboard

Health route:

- GET / returns API is running...

---

## Authentication

Protected endpoints require:

- Header Authorization: Bearer <JWT_TOKEN>

Token payload stores user id and expires in 1 day.

---

## Endpoint Reference

### Auth

Base path: /api/auth

1. POST /register

Request body:

```
{
	"name": "Nadil",
	"email": "nadil@example.com",
	"phone": "0771234567",
	"password": "secret123"
}
```

Responses:

- 201: user created
- 400: email already exists

2. POST /login

Request body:

```
{
	"email": "nadil@example.com",
	"password": "secret123"
}
```

Success response:

```
{
	"success": true,
	"token": "...",
	"user": {
		"id": 1,
		"name": "Nadil",
		"email": "nadil@example.com",
		"phone": "0771234567"
	}
}
```

Possible errors:

- 400: user not found
- 400: invalid credentials

### User

Base path: /api/user

1. GET /profile (protected)

Returns a simple protected-route check payload:

```
{
	"message": "Protected route",
	"userId": 1
}
```

### Profile

Base path: /api/profile

1. GET / (protected)

Returns merged profile data from users + user_profile_settings.

2. PATCH / (protected)

Request body:

```
{
	"name": "Nadil Dulran",
	"email": "nadil@example.com",
	"phone": "0771234567",
	"currency": "LKR",
	"avatarBase64": "<base64-string-or-null>"
}
```

Behavior:

- Updates users.name, users.email, users.phone, users.avatar_base64
- Upserts user_profile_settings.currency

### Groups

Base path: /api/groups

1. POST / (protected)

- Creates a group in user_groups
- Automatically adds creator as admin in group_members

2. GET / (protected)

- Returns groups where authenticated user is a member

3. GET /:id (protected)

- Returns a single group by id

4. PATCH /:id (protected)

- Updates name, description, emoji

5. DELETE /:id (protected)

- Deletes group by id

6. POST /:id/members (protected)

Request body:

```
{
	"userId": 2
}
```

7. GET /:id/members (protected)

- Returns users in the group
- Includes avatar-related fields when available

8. DELETE /:id/members/:userId (protected)

- Removes a member from group_members

### Expenses

Base path: /api/expenses

1. POST / (protected)

Create expense with split support.

Request body example:

```
{
	"description": "Electricity Bill",
	"amount": 6000,
	"category": "Utilities",
	"groupId": 1,
	"paidById": 1,
	"date": "2026-03-22",
	"splitType": "equal",
	"splits": [
		{ "userId": 1 },
		{ "userId": 2 }
	]
}
```

Supported split types:

- equal: amount split equally among provided members
- exact: each split must provide amount, total must match expense amount
- percentage: each split must provide percentage, total must be 100

2. GET /?groupId=<id> (protected)

- groupId is required and must be a positive integer
- Returns expense list ordered by expense_date DESC
- Each expense includes its splits

3. PATCH /:id (protected)

- Updates description, amount, category, date
- Replaces all existing splits for the expense

4. DELETE /:id (protected)

- Deletes expense by id

### Settlements

Base path: /api/settlements

1. POST / (protected)

Record a settlement between two users in the same group.

Request body example:

```
{
	"groupId": 1,
	"payerId": 1,
	"receiverId": 2,
	"amount": 1500,
	"method": "CASH",
	"notes": "Paid after dinner",
	"description": "Dinner split",
	"expenseId": 42
}
```

Behavior:

- `description` is used as the primary settlement message when present.
- If `description` is missing, `notes` is used as the fallback message.
- The backend notification payload includes:
  - `description` or `notes`
  - `payerName`
  - `receiverName`
  - `method`
  - `expenseId`

2. GET /?groupId=<id> (protected)

- Returns settlements for the group ordered by newest first
