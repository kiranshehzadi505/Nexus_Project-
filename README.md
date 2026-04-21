# NEXUS PLATFORM

## Investor & Entrepreneur Collaboration Platform

---

## WHAT IS THIS?

Nexus is a web app where investors and entrepreneurs can connect, schedule meetings, do video calls, share documents with e-signatures, and make payments.

---

## FEATURES

- Login / Register with JWT
- Investor and Entrepreneur roles
- Schedule meetings with calendar
- Video calling (WebRTC)
- Upload documents
- E-signature on documents
- Deposit and transfer money
- Transaction history

---

## TECH STACK

Frontend: HTML, CSS, JavaScript, Tailwind CSS
Backend: Node.js, Express, Socket.IO
Database: Supabase (PostgreSQL)

---

## HOW TO RUN

### Step 1: Open Two Command Prompts

### Step 2: Start Backend (Terminal 1)

cd "C:\Users\PC\OneDrive\Documents\Desktop\NEXUS_PROJECT !\backend"
npm install
npm start

### Step 3: Start Frontend (Terminal 2)

cd "C:\Users\PC\OneDrive\Documents\Desktop\NEXUS_PROJECT !\frontend"
http-server -p 8080

### Step 4: Open Browser

http://localhost:8080

---

## BACKEND API ENDPOINTS

POST /api/auth/register - Create account
POST /api/auth/login - Login user
GET /api/meetings - Get all meetings
POST /api/meetings - Create meeting
GET /api/documents - Get documents
POST /api/documents/upload - Upload file
POST /api/documents/:id/sign - Sign document
GET /api/payments/balance - Check balance
POST /api/payments/process - Make payment
POST /api/video/create-room - Create video room

---

## DATABASE TABLES (Supabase)

Run these SQL commands:

CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    role TEXT,
    bio TEXT,
    balance DECIMAL DEFAULT 0
);

CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    title TEXT,
    meeting_time TIMESTAMP,
    organizer_id INTEGER,
    participant_id INTEGER,
    status TEXT
);

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title TEXT,
    file_name TEXT,
    file_data TEXT,
    status TEXT
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    amount DECIMAL,
    type TEXT,
    status TEXT
);

---

## ENVIRONMENT VARIABLES (.env file)

PORT=5000
SUPABASE_URL=your_url_here
SUPABASE_ANON_KEY=your_key_here
JWT_SECRET=your_secret_here

---

## TEST ACCOUNTS

Email: test@test.com
Password: 123456
Role: Investor or Entrepreneur

---

## TROUBLESHOOTING

Backend not starting? Check port 5000 is free
Frontend not loading? Try different port: http-server -p 3000
Database error? Check Supabase credentials in .env
Video call not working? Allow camera/microphone permissions

---

## TO STOP SERVERS

Press Ctrl + C in both terminals

---

## FOLDER STRUCTURE

nexus-platform/
├── frontend/
│   └── index.html
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env
│   ├── routes/
│   ├── middleware/
│   └── utils/
└── README.md

