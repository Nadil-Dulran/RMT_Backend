# Roommate Expense Tracker - Backend

A REST API built with Node.js, Express, TypeScript, and MySQL for the Roommate Expense Tracker mobile app.

Status: Active development.

This backend currently provides:

- JWT-based authentication (register and login)
- Protected user and profile endpoints
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
