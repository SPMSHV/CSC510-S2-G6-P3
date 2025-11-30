# Quick Start Guide - proj3

This guide will help you run and test all the new milestones implemented in proj3.

## Prerequisites

- Node.js 18+ installed
- MongoDB running locally (or MongoDB Atlas connection string)
- npm or yarn package manager

## Step 1: Setup Food Delivery Backend

```bash
cd proj3/food-delivery
```

### Install Dependencies
```bash
npm install
```

### Configure Environment
Create a `.env` file (copy from `.env.sample` if it exists, or create new):

```bash
# Create .env file
cat > .env << EOF
SESSION_SECRET=your-super-secret-session-key-change-this
MONGODB_URI=mongodb://127.0.0.1:27017/food_delivery_app
PORT=3000
CHALLENGE_JWT_SECRET=your-challenge-jwt-secret-change-this
JUDGE0_UI_URL=http://localhost:4000
EOF
```

### Seed the Database
```bash
# Seed restaurants, menus, and users
npm run seed

# Seed chess puzzles (NEW!)
npm run seed:chess

# (Optional) Seed admin users
npm run seed:admins
```

### Start the Backend Server
```bash
npm run dev
# or
npm start
```

The server should start on **http://localhost:3000**

You should see:
```
✅ Connected to MongoDB
🚀 Server running on http://localhost:3000
✅ /api/orders route registered
```

## Step 2: Setup Judge0 Frontend (React App)

Open a **new terminal window**:

```bash
cd proj3/judge0-frontend
```

### Install Dependencies
```bash
npm install
```

### Start the React App
```bash
npm start
```

The React app should start on **http://localhost:4000**

## Step 3: Test the Application

### 1. Test Basic Functionality

1. **Open browser**: http://localhost:3000
2. **Register a customer**:
   - Click "Customer Register"
   - Fill in name, email, password, address
   - Register and login

3. **Browse restaurants and place an order**:
   - Browse restaurants
   - Add items to cart
   - Place an order

### 2. Test Milestone 1: Adaptive Challenge Difficulty

1. **Place an order** (as a new user)
2. **Start a challenge** (when order is "out_for_delivery")
   - Go to "My Orders"
   - Click "Try a coding challenge"
   - Notice: For new users, difficulty should be "easy"

3. **Test adaptive difficulty**:
   - Place multiple orders (3+)
   - Complete some challenges
   - New challenges should automatically adjust difficulty

**API Test**:
```bash
# Start challenge without specifying difficulty (uses adaptive)
curl -X POST http://localhost:3000/api/challenges/start \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"orderId": "YOUR_ORDER_ID"}'
```

### 3. Test Milestone 2: Chess Engine Integration

1. **Start a chess challenge**:
   ```bash
   curl -X POST http://localhost:3000/api/challenges/start \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{"orderId": "YOUR_ORDER_ID", "challengeType": "chess"}'
   ```

2. **Get a chess puzzle**:
   ```bash
   curl http://localhost:3000/api/chess/puzzle/easy
   ```

3. **Verify a chess move**:
   ```bash
   curl -X POST http://localhost:3000/api/chess/verify \
     -H "Content-Type: application/json" \
     -d '{"puzzleId": "PUZZLE_ID", "moves": ["e2e4", "e7e5"]}'
   ```

### 4. Test Milestone 3: Geolocation Tracking

1. **Login as a driver**:
   - Go to http://localhost:3000/driver-login.html
   - Register/login as driver
   - Toggle "Online" status
   - Location should update automatically (check browser console)

2. **Update driver location manually**:
   ```bash
   curl -X POST http://localhost:3000/api/driver/location \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{"lat": 35.7796, "lng": -78.6382}'
   ```

3. **Track an order**:
   - As customer, place an order
   - Assign driver to order
   - Go to "My Orders"
   - Click "View Tracking" on an active order
   - Should show driver location and ETA

**API Test**:
```bash
curl http://localhost:3000/api/orders/ORDER_ID/tracking \
  -b cookies.txt
```

### 5. Test Milestone 4: UI/UX Enhancements

- **Check responsiveness**: Resize browser window, test on mobile view
- **Check performance**: Network tab should show compressed responses
- **Check consistency**: All buttons and styles should be consistent

### 6. Test Milestone 5: Payment & Security

1. **Verify payment**:
   ```bash
   curl -X POST http://localhost:3000/api/payments/verify/ORDER_ID \
     -b cookies.txt
   ```

2. **Request a refund**:
   ```bash
   curl -X POST http://localhost:3000/api/refunds/request \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{"orderId": "ORDER_ID", "reason": "Wrong item delivered"}'
   ```

3. **Check refund status**:
   ```bash
   curl http://localhost:3000/api/refunds \
     -b cookies.txt
   ```

4. **Check audit logs** (in MongoDB):
   ```bash
   # Connect to MongoDB
   mongosh mongodb://127.0.0.1:27017/food_delivery_app
   
   # View audit logs
   db.auditlogs.find().sort({createdAt: -1}).limit(10).pretty()
   ```

5. **Check secure logs** (file):
   ```bash
   # View log file
   cat proj3/food-delivery/logs/app.log | tail -20
   ```

## Step 4: Run Tests

### Run All Tests
```bash
cd proj3/food-delivery
npm test
```

### Run Specific Test Suites
```bash
# Test adaptive difficulty
npm test -- tests/challenges/adaptiveDifficulty.test.js

# Test existing functionality
npm test -- tests/customer/
npm test -- tests/restaurant/
npm test -- tests/driver/
```

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod` or check MongoDB service
- Check MONGODB_URI in `.env` file
- For Windows: MongoDB might be running as a service

### Port Already in Use
- Change PORT in `.env` file
- Or kill the process using the port:
  ```bash
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  ```

### Dependencies Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Chess Puzzles Not Loading
```bash
# Re-seed chess puzzles
cd proj3/food-delivery
npm run seed:chess
```

## Quick Verification Checklist

- [ ] Backend server starts on port 3000
- [ ] Frontend React app starts on port 4000
- [ ] Can register and login as customer
- [ ] Can place an order
- [ ] Can start a coding challenge (adaptive difficulty works)
- [ ] Can start a chess challenge
- [ ] Driver can update location
- [ ] Order tracking shows ETA
- [ ] Payment verification works
- [ ] Refund request works
- [ ] All tests pass

## Next Steps

1. Explore the UI at http://localhost:3000
2. Test all user flows (customer, restaurant, driver)
3. Check the CHANGELOG.md for detailed feature list
4. Review README.md for architecture overview

Enjoy testing BiteCode! 🍽️💻

