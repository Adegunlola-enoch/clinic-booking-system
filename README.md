# CarePoint — Clinic Appointment Booking System

A full-stack clinic appointment booking application built to make scheduling appointments simpler, more reliable, and more accessible.

CarePoint allows patients to view available appointment slots, book consultations, retrieve booking details, and manage existing appointments through a straightforward web interface. Behind the interface is a REST API designed with authentication, booking validation, concurrency protection, idempotency, pagination, and rate limiting.

This project was developed as a practical demonstration of backend engineering, API design, database management, and full-stack application development.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Application Architecture](#application-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Booking Workflow](#booking-workflow)
- [Database Design](#database-design)
- [Security and Reliability](#security-and-reliability)
- [Deployment](#deployment)
- [Future Improvements](#future-improvements)
- [Author](#author)

## Overview

Managing clinic appointments requires more than simply displaying available dates and collecting patient information. A reliable booking system must also prevent duplicate reservations, handle simultaneous requests, validate submitted information, and maintain accurate appointment records.

CarePoint addresses these requirements through a full-stack implementation consisting of:

- A web application where patients can view and book appointment slots.
- A REST API that handles appointment operations and business rules.
- A PostgreSQL database for persistent storage.
- A server-side API proxy that securely communicates with the backend.

The system is designed around the principle that an appointment slot should not be confirmed for more than one patient at a time.

## Key Features

### Patient-facing application

- View available clinic appointment slots.
- Browse appointments by healthcare provider.
- Book an available appointment.
- Receive booking confirmation and a unique booking reference.
- View appointment information, including provider, date, time, and booking status.
- Interact with a responsive web interface.

### Backend API

- Retrieve appointment slots.
- Filter appointment slots by provider.
- Create new bookings.
- Retrieve booking details using a booking ID.
- View booking history using a patient's email address.
- Cancel existing bookings.
- Automatically update slot availability when a booking is cancelled.

### Reliability and API controls

- API key authentication for protected requests.
- Input validation and appropriate HTTP error responses.
- Prevention of duplicate confirmed bookings.
- Database-level protection against simultaneous booking conflicts.
- Idempotency support for safe retries.
- Cursor-based pagination for booking history.
- Rate limiting on booking attempts.

## Application Architecture

CarePoint uses a separated frontend and backend architecture.

```text
                 PATIENT
                    |
                    v
          NEXT.JS WEB APPLICATION
                    |
                    v
          NEXT.JS API PROXY ROUTES
                    |
             X-API-KEY HEADER
                    |
                    v
           EXPRESS REST API
                    |
                    v
          PRISMA ORM / ADAPTER
                    |
                    v
             POSTGRESQL
```

**Frontend:** The Next.js application provides the patient-facing interface and handles user interactions.

**API proxy:** Next.js server-side routes forward requests to the backend. The API key is stored in server-side environment variables rather than exposed in browser code.

**Backend:** The Express API validates requests, enforces booking rules, and manages appointment operations.

**Database:** PostgreSQL stores appointment slots, bookings, idempotency records, and booking attempts.

## Technology Stack

| Area | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| PostgreSQL integration | `pg`, Prisma PostgreSQL adapter |
| API communication | REST, JSON |
| Authentication | API key authentication |
| Development tools | Git, GitHub, npm |

## Project Structure

```text
clinic-booking-system/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   │
│   ├── src/
│   │   ├── lib/
│   │   │   └── prisma.ts
│   │   ├── middleware/
│   │   │   └── apiKey.ts
│   │   ├── routes/
│   │   │   ├── bookings.ts
│   │   │   └── slots.ts
│   │   └── server.ts
│   │
│   ├── .env
│   ├── package.json
│   ├── prisma7.config.ts
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── api/
│   │       │   ├── bookings/
│   │       │   │   └── route.ts
│   │       │   └── slots/
│   │       │       └── route.ts
│   │       ├── globals.css
│   │       ├── layout.tsx
│   │       └── page.tsx
│   │
│   ├── .env.local
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
└── README.md
```

*Environment files are shown for illustration only. They should remain local and must not be committed to version control.*

## Getting Started

Follow these instructions to run CarePoint locally.

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) — version 22 or a compatible supported version.
- npm — included with Node.js.
- [Git](https://git-scm.com/).
- A PostgreSQL database, either locally hosted or through a provider such as [Neon](https://neon.com/).

### 1. Clone the repository

```bash
git clone https://github.com/Adegunlola-enoch/clinic-booking-system.git
```

Navigate into the project:

```bash
cd clinic-booking-system
```

### 2. Configure the backend

Navigate into the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=4000
API_KEY=your_secure_api_key
DATABASE_URL=your_postgresql_connection_string
```

Replace the placeholder values with your own configuration. Never commit actual credentials or database connection strings.

### 3. Configure the database

Ensure your PostgreSQL database is available and that `DATABASE_URL` points to it.

Apply the existing Prisma migrations:

```bash
npx prisma migrate deploy
```

Generate the Prisma Client:

```bash
npx prisma generate
```

### 4. Start the backend

For development:

```bash
npm run dev
```

The backend should be available at:

```text
http://localhost:4000
```

### 5. Configure the frontend

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the `frontend` directory:

```env
API_BASE_URL=http://localhost:4000
API_KEY=your_secure_api_key
```

Use the same API key configured in the backend.

**Important:** Keep `API_KEY` server-side. Do not rename it with a `NEXT_PUBLIC_` prefix or expose it in client-side code.

### 6. Start the frontend

```bash
npm run dev
```

Open the application in your browser:

```text
http://localhost:3000
```

You should now be able to browse available appointment slots and make bookings through the interface.

## API Reference

The backend exposes REST endpoints for managing appointment slots and bookings.

All endpoints require a valid API key supplied through the `X-API-Key` request header.

### Authentication Header

```http
X-API-Key: your_secure_api_key
```

Requests without a valid API key are rejected with an HTTP `401 Unauthorized` response.

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/slots` | Retrieve appointment slots |
| POST | `/reset` | Reset and recreate appointment slot data |
| POST | `/bookings` | Create an appointment booking |
| GET | `/bookings/:id` | Retrieve a booking by ID |
| GET | `/bookings` | Retrieve booking history |
| DELETE | `/bookings/:id` | Cancel a booking |

### 1. Retrieve available slots

```http
GET /slots
```

Optional provider filter:

```http
GET /slots?provider=Dr%20Ada
```

Returns appointment slots with their availability status.

### 2. Create a booking

```http
POST /bookings
```

Example request:

```json
{
  "slot_id": "s-frontend-demo",
  "name": "John Dan",
  "email": "john@gmail.com"
}
```

A successful request returns HTTP `201 Created` with the booking details.

The endpoint supports an optional `Idempotency-Key` header to safely handle retries.

Example:

```http
Idempotency-Key: unique-request-key-123
```

### 3. Retrieve a booking

```http
GET /bookings/{bookingId}
```

Returns the details of a specific booking.

### 4. Retrieve booking history

```http
GET /bookings?email=john@gmail.com
```

Optional pagination parameters:

```http
GET /bookings?email=john@gmail.com&limit=10
```

Subsequent requests can use the cursor returned by the previous response:

```http
GET /bookings?email=john@gmail.com&limit=10&cursor=booking_id
```

The maximum permitted page size is 50.

### 5. Cancel a booking

```http
DELETE /bookings/{bookingId}
```

A successful cancellation changes the booking status to `cancelled` and makes the appointment slot available again.

Repeated cancellation attempts are rejected rather than silently creating additional changes.

### 6. Reset appointment slots

```http
POST /reset
```

This endpoint resets existing bookings and slots before creating replacement slot data.

**Warning:** This is an administrative or assessment utility, not an ordinary patient operation. It deletes existing booking and slot records. Use it only in a controlled development or testing environment.

## Booking Workflow

The application follows a straightforward appointment lifecycle:

1. A patient opens the CarePoint application.
2. The frontend requests available appointment slots.
3. The patient selects a suitable provider and appointment time.
4. The patient enters their name and email address.
5. The frontend sends the booking request through its server-side API route.
6. The backend validates the submitted information and checks slot availability.
7. The database confirms the booking while enforcing the one-confirmed-booking-per-slot constraint.
8. The application displays the booking confirmation and reference.
9. The patient can retrieve or cancel the booking through the available API operations.

## Database Design

The application uses PostgreSQL with Prisma for database access and schema management.

The main database models are:

| Model | Purpose |
|---|---|
| `Slot` | Stores appointment slots, providers, and start/end times. |
| `Booking` | Stores patient booking information and appointment status. |
| `IdempotencyRecord` | Tracks idempotent booking requests and their responses. |
| `BookingAttempt` | Records booking attempts for rate limiting. |

### Booking status

Bookings support two states:

- `confirmed`
- `cancelled`

A cancelled booking does not occupy its appointment slot.

A partial unique database index ensures that only one confirmed booking can exist for a particular slot, including when multiple booking requests arrive at nearly the same time.

## Security and Reliability

Reliability was treated as an important part of the implementation rather than an afterthought.

The backend includes the following safeguards:

**API key authentication:** Protected endpoints require a valid API key.

**Input validation:** Requests are checked before booking operations are processed.

**Duplicate booking prevention:** Database constraints prevent multiple confirmed bookings for the same slot.

**Concurrency protection:** Simultaneous booking requests are handled safely, ensuring that conflicting requests cannot both confirm the same appointment.

**Idempotency:** Repeated requests with the same idempotency key and request body can return the original result rather than creating duplicate bookings. Reusing a key with a different request body is rejected.

**Cursor-based pagination:** Booking history can be retrieved in manageable pages.

**Rate limiting:** Booking attempts are limited to five attempts per email address within a one-minute window.

**Server-side secret handling:** The frontend API proxy keeps the backend API key out of browser-side application code.

## Deployment

The project is structured for separate frontend and backend deployment.

### Backend — Render

The backend can be deployed as a Node.js web service on [Render](https://render.com/).

Suggested configuration:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |

Configure the required environment variables in the Render dashboard:

```env
DATABASE_URL=your_postgresql_connection_string
API_KEY=your_secure_api_key
NODE_ENV=production
```

Apply database migrations as part of the deployment process using:

```bash
npx prisma migrate deploy
```

### Frontend — Vercel

The frontend can be deployed on [Vercel](https://vercel.com/).

Suggested configuration:

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Next.js |
| Build Command | `npm run build` |

Configure these environment variables in Vercel:

```env
API_BASE_URL=https://your-render-service.onrender.com
API_KEY=your_secure_api_key
```

Use the deployed backend URL and the same API key configured on Render.

Do not expose the API key through a public environment variable.

*Deployment instructions describe the intended hosting configuration; actual deployment URLs and production availability should be verified after deployment.*

## Future Improvements

CarePoint provides a foundation that can be extended with additional clinic-management capabilities.

Potential improvements include:

- Patient registration and secure account authentication.
- Doctor and administrator dashboards.
- Appointment rescheduling.
- Email and SMS appointment notifications.
- Automated appointment reminders.
- Calendar integration.
- Multiple clinic locations and departments.
- More detailed appointment and patient management.
- Automated integration and end-to-end testing.
- Audit logs and enhanced operational monitoring.

## Author

**Adegunlola Enoch Oluwaseyi**

Mobile Application Developer | AI-Powered Product Engineering

- GitHub: [Adegunlola-enoch](https://github.com/Adegunlola-enoch)
- Portfolio: [Portfolio](https://shey-dev-portfolio.vercel.app)
- LinkedIn: [LinkedIn Profile](https://www.linkedin.com/in/adegunlola-enoch/)

---

*CarePoint was built as a practical full-stack engineering project, with a focus on REST API development, database integrity, concurrency handling, secure request processing, and a functional patient-facing experience.*