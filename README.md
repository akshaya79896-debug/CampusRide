# 🚗 CampusRide — Multi-College Student Ride-Sharing Platform

CampusRide is a full-stack, multi-college student ride-sharing and seat-sharing web application built with **Node.js, Express, MySQL 8, and Vanilla HTML5/CSS3/JavaScript**.

Students travelling to and from colleges (such as Anurag University, Osmania University, JNTU, and other Hyderabad campuses) can offer available seats in their vehicles (Bike, Car, Auto), search for peers travelling along the same route, request seats, split commute costs, and build a trusted campus community through verified accounts and ratings.

---

## 🌟 Key Features

1. **Role-Based Authentication & Security**:
   - Secure student registration & login with password hashing via `bcryptjs`.
   - JWT token-based authentication (`jsonwebtoken`) with automatic session handling.
   - Public registration defaults to `STUDENT`; protected `ADMIN` console.
   - Complete input validation and sanitization.

2. **Offer a Ride**:
   - Choose vehicle type (**Bike**, **Car**, **Auto**).
   - Enter pickup point, destination college, travel date, departure time, available seats, fare (₹), vehicle details, and notes.
   - Real-time seat inventory tracking.

3. **Discover & Search Rides**:
   - Flexible, case-insensitive partial route search (e.g. `Uppal` ➔ `Anurag University`).
   - Filters for date, vehicle type, maximum fare, and available seats.
   - Instant seat request modal dialog.

4. **Transactional Seat Booking with Concurrency Control**:
   - Students cannot book seats on their own rides.
   - Prevents duplicate pending requests.
   - **MySQL Transaction + Row-Level Locking (`FOR UPDATE`)**: Prevents overselling and race conditions when multiple students request seats simultaneously.
   - Driver accepts or declines requests. Accepting decreases available seats safely; declining does not reduce seats.

5. **Student Dashboard & Ride Management**:
   - Personalized student welcome, stats counter, upcoming offered rides, and booking history.
   - Manage incoming passenger requests with one-click **Accept** and **Reject** buttons.
   - Cancel rides or cancel bookings with automatic seat restoration and passenger alerts.

6. **Database-Backed Notifications & Ratings**:
   - Real-time alerts for booking requests, acceptances, rejections, and cancellations.
   - 5-star rating and review system for completed rides.

7. **Admin Console**:
   - Platform metrics, student user directory, ride moderation, and community report resolution.

---

## 📁 Project Architecture

```
CampusRide/
├── backend/
│   ├── config/
│   │   └── db.js                 # MySQL connection pool
│   ├── controllers/
│   │   ├── adminController.js    # Moderation & stats
│   │   ├── authController.js     # Register, login, profile, password
│   │   ├── notificationController.js
│   │   ├── ratingController.js   # Peer ratings & reviews
│   │   ├── requestController.js  # Transactional seat booking (FOR UPDATE)
│   │   └── rideController.js     # Route listings & search
│   ├── middleware/
│   │   ├── admin.js              # Admin role guard
│   │   ├── auth.js               # JWT verification & optionalAuth
│   │   └── errorHandler.js       # Centralized error handler
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── ratingRoutes.js
│   │   ├── requestRoutes.js
│   │   └── rideRoutes.js
│   ├── utils/
│   │   ├── migrate.js            # Safe database migration runner
│   │   └── seed.js               # Demonstration data seeder
│   ├── .env.example              # Configuration template
│   ├── package.json              # Backend dependencies & npm scripts
│   ├── server.js                 # Express server & static asset host
│   └── test.js                   # 20-point automated end-to-end test suite
├── frontend/
│   ├── css/
│   │   └── style.css             # Modern startup design system & responsive layout
│   ├── js/
│   │   ├── api.js                # Fetch API wrapper with JWT injection
│   │   ├── auth.js               # Session & token storage
│   │   ├── config.js             # Configurable API URL for local & production
│   │   └── ui.js                 # Reusable modals, toasts, navbars, badges
│   ├── admin.html                # Admin dashboard & moderation
│   ├── dashboard.html            # Student dashboard & quick stats
│   ├── index.html                # Modern landing page & search
│   ├── login.html                # Login page with demo autofill
│   ├── my-rides.html             # Driver & passenger rides manager
│   ├── notifications.html        # Real-time alert center
│   ├── offer-ride.html           # Ride creation form
│   ├── profile.html              # Profile settings & student reviews
│   ├── register.html             # Registration page
│   ├── ride-details.html         # Deep ride details & booking actions
│   └── rides.html                # Discover & filter rides
├── database/
│   ├── migration.sql             # SQL DDL migration (preserves existing users)
│   └── seed.sql                  # Demo routes and admin account
├── vercel.json                   # Vercel deployment configuration
├── netlify.toml                  # Netlify deployment configuration
├── render.yaml                   # Render deployment configuration
├── .gitignore                    # Protects secrets & node_modules
└── README.md
```

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Fetch API
- **Backend**: Node.js v22+, Express.js v5
- **Database**: MySQL 8 (`mysql2/promise` connection pool)
- **Authentication**: `bcryptjs` (salt rounds 10), `jsonwebtoken` (JWT)
- **Utilities**: `dotenv`, `cors`

---

## 🚀 Local Setup & Execution (Windows 11 PowerShell)

### Step 1: Open the Project
Open Windows PowerShell and navigate to the project directory:
```powershell
cd C:\Users\HP\Desktop\project\CampusRide
```

### Step 2: Verify Dependencies
The backend dependencies are already installed. If ever needed, run:
```powershell
cd backend
npm install
```

### Step 3: Configure Environment Variables
Verify your `backend/.env` file exists with your database credentials:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=campusride
JWT_SECRET=your_secret_jwt_key_here
CLIENT_URL=http://localhost:5000
```
*(Never share or commit this `.env` file to Git)*

### Step 4: Run Safe Database Migration
Execute the automated migration runner (this will **preserve** all your existing `users` table records and safely verify all other tables):
```powershell
cd C:\Users\HP\Desktop\project\CampusRide\backend
npm run migrate
```
*(Optional) To seed realistic sample campus rides and an admin account:*
```powershell
npm run seed
```

### Step 5: Run Automated Verification Tests
Run the 20-point test suite to verify health, authentication, concurrency locking, and bookings:
```powershell
npm test
```

### Step 6: Start the Server
Start the CampusRide application:
```powershell
npm start
```
Or with auto-reload during development:
```powershell
npm run dev
```

The server will display:
```
CampusRide server running on port 5000
Local address: http://localhost:5000
Database connected successfully (MySQL 8 - campusride).
```

### Step 7: Open the Application in Your Browser
The backend automatically serves the complete frontend application:
- **Homepage**: [http://localhost:5000/](http://localhost:5000/)
- **Student Login**: [http://localhost:5000/login.html](http://localhost:5000/login.html)
- **Student Registration**: [http://localhost:5000/register.html](http://localhost:5000/register.html)
- **Discover Rides**: [http://localhost:5000/rides.html](http://localhost:5000/rides.html)
- **Offer a Ride**: [http://localhost:5000/offer-ride.html](http://localhost:5000/offer-ride.html)
- **Student Dashboard**: [http://localhost:5000/dashboard.html](http://localhost:5000/dashboard.html)
- **My Rides & Bookings**: [http://localhost:5000/my-rides.html](http://localhost:5000/my-rides.html)
- **Admin Console**: [http://localhost:5000/admin.html](http://localhost:5000/admin.html)

*(Note: If you prefer using VS Code Live Server at `http://127.0.0.1:5500`, CORS is pre-configured to communicate with the backend on port 5000 seamlessly).*

---

## 🔑 Demo Login Credentials

For quick evaluation and testing:

| Role | Email | Password |
|---|---|---|
| **Platform Administrator** | `admin@campusride.com` | `Admin@123` |
| **Student 1 (Driver)** | `akshaya@gmail.com` | (Your existing password) |
| **Student 2 (Passenger)** | `rahul@gmail.com` | (Your existing password) |
| **Student 3** | `teststudent@gmail.com` | `Password@123` |

*(You can also click the quick demo autofill buttons on `login.html` or register a new student account at any time).*

---

## 📮 API Endpoints & Postman Testing Guide

Import base URL: `http://localhost:5000/api`

### 1. Authentication (`/api/auth`)
- `POST /api/auth/register`
  - Body (JSON): `{"name":"Akshaya","email":"akshaya2@gmail.com","password":"Password@123","phone":"9876543210","college":"Anurag University"}`
  - Returns: `201 Created`, token, user profile.
- `POST /api/auth/login`
  - Body (JSON): `{"email":"admin@campusride.com","password":"Admin@123"}`
  - Returns: `200 OK`, JWT token, user info.
- `GET /api/auth/me` *(Protected: `Authorization: Bearer <token>`)*
  - Returns: Profile and ride statistics.
- `PUT /api/auth/profile` *(Protected)*
  - Body (JSON): `{"name":"Akshaya S.","phone":"9876543210","college":"Anurag University"}`

### 2. Rides (`/api/rides`)
- `GET /api/rides?source=Uppal&destination=Anurag`
  - Query parameters: `source`, `destination`, `date`, `vehicle_type`, `max_fare`.
  - Returns: Array of matching open rides with driver info and ratings.
- `GET /api/rides/:id`
  - Returns: Detailed ride info and passenger roster.
- `POST /api/rides` *(Protected)*
  - Body (JSON):
    ```json
    {
      "source": "Uppal Metro Station",
      "destination": "Anurag University, Ghatkesar",
      "travel_date": "2026-10-12",
      "departure_time": "08:30:00",
      "vehicle_type": "Car",
      "vehicle_details": "Honda City Silver (TS09EX1234)",
      "total_seats": 3,
      "available_seats": 3,
      "fare": 50,
      "notes": "Daily morning carpool. AC on."
    }
    ```
- `PATCH /api/rides/:id/cancel` *(Protected, Driver only)*
- `PATCH /api/rides/:id/complete` *(Protected, Driver only)*
- `GET /api/rides/user/offered` *(Protected)*

### 3. Seat Requests (`/api/requests`)
- `POST /api/requests` *(Protected)*
  - Body (JSON): `{"ride_id": 1, "seats_requested": 1, "pickup_point": "Uppal Metro Gate 2", "notes": "Waiting with backpack"}`
- `GET /api/requests/my` *(Protected)*
  - Returns: Requests submitted by current passenger.
- `GET /api/requests/ride/:rideId` *(Protected, Driver only)*
  - Returns: List of requests received for this ride.
- `PATCH /api/requests/:id/accept` *(Protected, Driver only)*
  - **Executes MySQL Transaction + Row-Level Locking (`FOR UPDATE`)**
  - Confirms seat, decrements available seats safely.
- `PATCH /api/requests/:id/reject` *(Protected, Driver only)*
- `PATCH /api/requests/:id/cancel` *(Protected, Passenger only)*
  - Cancels request. If previously accepted, restores seat count.

### 4. Notifications (`/api/notifications`)
- `GET /api/notifications` *(Protected)*
- `PATCH /api/notifications/read-all` *(Protected)*
- `PATCH /api/notifications/:id/read` *(Protected)*

### 5. Ratings & Reviews (`/api/ratings`)
- `POST /api/ratings` *(Protected)*
  - Body (JSON): `{"ride_id": 1, "reviewee_id": 2, "rating": 5, "review": "Great driving and punctual!"}`
- `GET /api/ratings/user/:userId`

### 6. Admin (`/api/admin`)
- `GET /api/admin/stats` *(Protected: ADMIN only)*
- `GET /api/admin/users` *(Protected: ADMIN only)*
- `GET /api/admin/rides` *(Protected: ADMIN only)*
- `DELETE /api/admin/rides/:id` *(Protected: ADMIN only)*
- `GET /api/admin/reports` *(Protected: ADMIN only)*
- `POST /api/admin/report` *(Protected: Any Student)*

---

## 🔧 Troubleshooting Common Issues

1. **Database connection fails (`ECONNREFUSED`)**:
   - Ensure MySQL service is running (`Get-Service MySQL*` in PowerShell or via `services.msc`).
   - Check `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `backend/.env`.
2. **Port 5000 already in use (`EADDRINUSE`)**:
   - Find and kill the process:
     ```powershell
     netstat -ano | findstr :5000
     Stop-Process -Id <PID> -Force
     ```
   - Or change `PORT=5001` in `.env`.
3. **Session Expired**:
   - JWT tokens are configured for 24 hours. Log in again via `login.html`.

---

## 🌐 Production Deployment Guide

### Architecture:
- **Frontend**: Deployed to **Netlify** or **Vercel**
- **Backend**: Deployed to **Render**, **Railway**, or **AWS EC2**
- **Database**: Cloud MySQL (e.g. **Aiven**, **PlanetScale**, **TiDB Cloud**, or **Railway MySQL**)

### Steps:

#### 1. Push Code to GitHub
1. Create a new private or public repository on GitHub named `CampusRide`.
2. Push your project:
   ```powershell
   git init
   git add .
   git commit -m "Initial CampusRide deployment release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/CampusRide.git
   git push -u origin main
   ```
   *(Note: `.env` is ignored by `.gitignore` and will never be uploaded).*

#### 2. Create Cloud MySQL Database
1. Create a MySQL 8 database on a cloud provider (e.g. Aiven, Railway, or PlanetScale).
2. Open MySQL Workbench or use the cloud console.
3. Run `database/migration.sql` and `database/seed.sql` on the cloud database.

#### 3. Deploy Backend to Render
1. Sign in to [Render](https://render.com).
2. Click **New +** ➔ **Web Service** ➔ Connect your GitHub repository.
3. Configure settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   - `PORT`: `5000`
   - `DB_HOST`: `<cloud-mysql-host>`
   - `DB_USER`: `<cloud-mysql-user>`
   - `DB_PASSWORD`: `<cloud-mysql-password>`
   - `DB_NAME`: `campusride`
   - `JWT_SECRET`: `<a-long-random-string>`
   - `CLIENT_URL`: `https://your-frontend.vercel.app`
5. Click **Create Web Service**. Note your backend URL (e.g. `https://campusride-api.onrender.com`).

#### 4. Deploy Frontend to Vercel or Netlify
1. Sign in to [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
2. Connect your GitHub repository.
3. Set the publish directory to `frontend`.
4. In `frontend/js/config.js`, set `window.CAMPUSRIDE_API_URL = "https://campusride-api.onrender.com/api";` or set it via script injection.
5. Deploy! Your live student ride-sharing application is online.

---

## 🎓 Academic Demonstration Highlights

If presenting this project:
1. **Explain the Concurrency Model**: Show `backend/controllers/requestController.js` and describe how MySQL transactions with `SELECT ... FOR UPDATE` guarantee that seats are never oversold even under simultaneous requests.
2. **Demonstrate Both Perspectives**:
   - Open two browser windows (e.g., standard window and Incognito window).
   - Log in as Driver in Window 1 and Passenger in Window 2.
   - Post a ride in Window 1, search and request it in Window 2.
   - Watch the instant notification and accept the request in Window 1.
   - Show the seat counter decrementing and the booking updating to `ACCEPTED` in Window 2.
3. **Show Admin Moderation**: Log in as `admin@campusride.com` to demonstrate platform supervision and review reports.

