# Run Guide

This guide covers the essential steps to set up and run the project.

## Prerequisites

- Node.js 18+ installed
- MongoDB installed and running
- npm package manager

## Step 1: Start MongoDB

Start MongoDB service:

```bash
# macOS (using Homebrew)
brew services start mongodb-community

# Or start manually
mongod --config /usr/local/etc/mongod.conf
```

MongoDB should be running on `mongodb://127.0.0.1:27017`

## Step 2: Setup Backend

### Navigate to backend directory
```bash
cd food-delivery
```

### Install dependencies
```bash
npm install
```

### Configure environment variables

Create a `.env` file in the `food-delivery` directory:

```bash
SESSION_SECRET=your-super-secret-session-key-change-this
MONGODB_URI=mongodb://127.0.0.1:27017/food_delivery_app
PORT=3000
CHALLENGE_JWT_SECRET=your-challenge-jwt-secret-change-this
JUDGE0_UI_URL=http://localhost:4000
```

### Seed the database
```bash
# Seed restaurants, menus, and users
npm run seed

# Seed chess puzzles
npm run seed:chess
```

### Start the backend server
```bash
npm run dev
```

The backend server will run on **http://localhost:3000**

## Step 3: Setup Frontend

Open a **new terminal window**:

### Navigate to frontend directory
```bash
cd judge0-frontend
```

### Install dependencies
```bash
npm install
```

### Configure environment variables

Create or update `.env` file in the `judge0-frontend` directory:

```bash
PORT=4000
REACT_APP_API_BASE=http://localhost:3000/api
```

### Start the frontend server
```bash
npm start
```

The frontend will run on **http://localhost:4000**

## Access the Application

- **Frontend (React App)**: http://localhost:4000
- **Backend API**: http://localhost:3000/api
- **Food Delivery UI**: http://localhost:3000

## Notes

- Keep both terminal windows open (one for backend, one for frontend)
- Ensure MongoDB is running before starting the backend
- The backend must be running before starting the frontend

