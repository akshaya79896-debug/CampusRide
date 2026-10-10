const http = require("http");
require("dotenv").config();

// Helper to make HTTP requests
function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: body });
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(typeof data === "string" ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log("==========================================");
  console.log("STARTING CAMPUSRIDE END-TO-END TEST SUITE");
  console.log("==========================================");

  const PORT = process.env.PORT || 5000;
  const baseUrl = {
    hostname: "127.0.0.1",
    port: PORT
  };

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`PASS: ${message}`);
      passed++;
    } else {
      console.error(`FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Health check
  try {
    const res = await request({
      ...baseUrl,
      path: "/api/health",
      method: "GET"
    });
    assert(res.status === 200 && res.data.status === "healthy", "1. Health check endpoint responds healthy");
  } catch (e) {
    assert(false, `1. Health check failed: ${e.message}`);
  }

  // 2. Student 1 Registration
  const timestamp = Date.now();
  const student1Email = `student_${timestamp}@campus.edu`;
  const studentPassword = "Password@123";
  let token1 = "";
  let user1Id = null;

  try {
    const res = await request(
      {
        ...baseUrl,
        path: "/api/auth/register",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        name: "Test Driver",
        email: student1Email,
        password: studentPassword,
        phone: "9123456789",
        college: "Anurag University"
      }
    );
    assert(res.status === 201 && res.data.success === true, "2. Student 1 registration succeeds with 201");
    token1 = res.data.token;
    user1Id = res.data.user.id;
  } catch (e) {
    assert(false, `2. Registration failed: ${e.message}`);
  }

  // 3. Duplicate registration rejected
  try {
    const res = await request(
      {
        ...baseUrl,
        path: "/api/auth/register",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        name: "Duplicate User",
        email: student1Email,
        password: studentPassword,
        phone: "9123456789"
      }
    );
    assert(res.status === 409, "3. Duplicate registration rejected with 409 Conflict");
  } catch (e) {
    assert(false, `3. Duplicate check failed: ${e.message}`);
  }

  // 4. Login with correct credentials
  try {
    const res = await request(
      {
        ...baseUrl,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        email: student1Email,
        password: studentPassword
      }
    );
    assert(res.status === 200 && !!res.data.token, "4. Login succeeds with valid token and safe user details");
    token1 = res.data.token;
  } catch (e) {
    assert(false, `4. Login failed: ${e.message}`);
  }

  // 5. Login with wrong password
  try {
    const res = await request(
      {
        ...baseUrl,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        email: student1Email,
        password: "WrongPassword"
      }
    );
    assert(res.status === 401, "5. Login fails with 401 on incorrect password");
  } catch (e) {
    assert(false, `5. Wrong password test failed: ${e.message}`);
  }

  // 6. Access /api/auth/me with token
  try {
    const res = await request({
      ...baseUrl,
      path: "/api/auth/me",
      method: "GET",
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(res.status === 200 && res.data.user.email === student1Email, "6. Authenticated /api/auth/me returns profile & stats");
  } catch (e) {
    assert(false, `6. /api/auth/me failed: ${e.message}`);
  }

  // 7. Reject missing or invalid token
  try {
    const resMissing = await request({
      ...baseUrl,
      path: "/api/auth/me",
      method: "GET"
    });
    const resInvalid = await request({
      ...baseUrl,
      path: "/api/auth/me",
      method: "GET",
      headers: { Authorization: "Bearer invalid.fake.token" }
    });
    assert(resMissing.status === 401 && resInvalid.status === 401, "7. Missing and invalid tokens rejected with 401");
  } catch (e) {
    assert(false, `7. Invalid token check failed: ${e.message}`);
  }

  // 8. Student 1 creates/offers a ride
  let rideId = null;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  try {
    const res = await request(
      {
        ...baseUrl,
        path: "/api/rides",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token1}`
        }
      },
      {
        source: "Uppal Circle",
        destination: "Anurag University Gate 1",
        travel_date: tomorrowStr,
        departure_time: "08:45:00",
        vehicle_type: "Car",
        vehicle_details: "Honda City Silver (TS09EX9999)",
        total_seats: 3,
        available_seats: 3,
        fare: 50.00,
        notes: "Carpooling to Anurag University for CS exam. AC on."
      }
    );
    assert(res.status === 201 && res.data.success === true, "8. Student 1 offers a ride successfully");
    rideId = res.data.ride.id;
  } catch (e) {
    assert(false, `8. Create ride failed: ${e.message}`);
  }

  // 9. Search rides (case-insensitive & partial match)
  try {
    const res = await request({
      ...baseUrl,
      path: "/api/rides?source=uppal&destination=anurag",
      method: "GET"
    });
    const found = res.data.rides && res.data.rides.some(r => r.id === rideId);
    assert(res.status === 200 && found, "9. Ride search returns real database results matching 'uppal' -> 'anurag'");
  } catch (e) {
    assert(false, `9. Ride search failed: ${e.message}`);
  }

  // 10. Student 2 registers and logs in
  const student2Email = `passenger_${timestamp}@campus.edu`;
  let token2 = "";
  let user2Id = null;

  try {
    const res = await request(
      {
        ...baseUrl,
        path: "/api/auth/register",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        name: "Test Passenger",
        email: student2Email,
        password: studentPassword,
        phone: "9876543211",
        college: "Anurag University"
      }
    );
    assert(res.status === 201, "10. Student 2 registration succeeds");
    token2 = res.data.token;
    user2Id = res.data.user.id;
  } catch (e) {
    assert(false, `10. Student 2 registration failed: ${e.message}`);
  }

  // 11. Student 1 (driver) tries to request a seat on their own ride -> MUST REJECT
  try {
    const res = await request(
      {
        ...baseUrl,
        path: "/api/requests",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token1}`
        }
      },
      {
        ride_id: rideId,
        seats_requested: 1
      }
    );
    assert(res.status === 400, "11. Driver cannot request a seat on their own ride (400 Bad Request)");
  } catch (e) {
    assert(false, `11. Self-request check failed: ${e.message}`);
  }

  // 12. Student 2 requests a seat on Student 1's ride
  let requestId = null;
  try {
    const res = await request(
      {
        ...baseUrl,
        path: "/api/requests",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token2}`
        }
      },
      {
        ride_id: rideId,
        seats_requested: 1,
        pickup_point: "Uppal Metro Pillar 12",
        notes: "Will be waiting with a blue backpack."
      }
    );
    assert(res.status === 201 && res.data.success === true, "12. Student 2 requests a seat successfully");
    requestId = res.data.requestId;
  } catch (e) {
    assert(false, `12. Request seat failed: ${e.message}`);
  }

  // 13. Duplicate pending request is rejected
  try {
    const res = await request(
      {
        ...baseUrl,
        path: "/api/requests",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token2}`
        }
      },
      {
        ride_id: rideId,
        seats_requested: 1
      }
    );
    assert(res.status === 400, "13. Duplicate pending request rejected with 400");
  } catch (e) {
    assert(false, `13. Duplicate request check failed: ${e.message}`);
  }

  // 14. Unauthorized user (Student 2) tries to accept the request -> MUST REJECT with 403
  try {
    const res = await request({
      ...baseUrl,
      path: `/api/requests/${requestId}/accept`,
      method: "PATCH",
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert(res.status === 403, "14. Non-driver is rejected from accepting request (403 Forbidden)");
  } catch (e) {
    assert(false, `14. Unauthorized accept check failed: ${e.message}`);
  }

  // 15. Driver (Student 1) accepts the request -> TRANSACTION + ROW LOCK
  try {
    const res = await request({
      ...baseUrl,
      path: `/api/requests/${requestId}/accept`,
      method: "PATCH",
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(
      res.status === 200 &&
      res.data.success === true &&
      res.data.updatedAvailableSeats === 2,
      "15. Driver accepts request: seats decrease from 3 to 2 transactionally"
    );
  } catch (e) {
    assert(false, `15. Accept request failed: ${e.message}`);
  }

  // 16. Double acceptance rejected
  try {
    const res = await request({
      ...baseUrl,
      path: `/api/requests/${requestId}/accept`,
      method: "PATCH",
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(res.status === 400, "16. Repeated acceptance of already accepted request is rejected (400)");
  } catch (e) {
    assert(false, `16. Double acceptance check failed: ${e.message}`);
  }

  // 17. Notifications delivered
  try {
    const res = await request({
      ...baseUrl,
      path: "/api/notifications",
      method: "GET",
      headers: { Authorization: `Bearer ${token2}` }
    });
    const hasAcceptedNotif = res.data.notifications && res.data.notifications.some(n => n.type === "REQUEST_ACCEPTED");
    assert(res.status === 200 && hasAcceptedNotif, "17. Passenger receives ACCEPTED notification in database");
  } catch (e) {
    assert(false, `17. Notification check failed: ${e.message}`);
  }

  // 18. Non-admin accessing admin route -> REJECTED (403)
  try {
    const res = await request({
      ...baseUrl,
      path: "/api/admin/stats",
      method: "GET",
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert(res.status === 403, "18. Non-admin access to admin endpoint is rejected (403 Forbidden)");
  } catch (e) {
    assert(false, `18. Admin security check failed: ${e.message}`);
  }

  // 19. Admin logs in and accesses admin stats
  try {
    const loginRes = await request(
      {
        ...baseUrl,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        email: "admin@campusride.com",
        password: "Admin@123"
      }
    );

    if (loginRes.status === 200 && loginRes.data.token) {
      const adminToken = loginRes.data.token;
      const statsRes = await request({
        ...baseUrl,
        path: "/api/admin/stats",
        method: "GET",
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert(
        statsRes.status === 200 && statsRes.data.stats.users.total_users > 0,
        "19. Admin logs in and retrieves platform stats"
      );
    } else {
      assert(false, "19. Admin login failed");
    }
  } catch (e) {
    assert(false, `19. Admin stats test failed: ${e.message}`);
  }

  // 20. Mark ride COMPLETED and submit rating
  try {
    // Complete ride
    await request({
      ...baseUrl,
      path: `/api/rides/${rideId}/complete`,
      method: "PATCH",
      headers: { Authorization: `Bearer ${token1}` }
    });

    // Passenger rates driver
    const rateRes = await request(
      {
        ...baseUrl,
        path: "/api/ratings",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token2}`
        }
      },
      {
        ride_id: rideId,
        reviewee_id: user1Id,
        rating: 5,
        review: "Punctual, safe driving, very comfortable carpool!"
      }
    );
    assert(rateRes.status === 201 && rateRes.data.success === true, "20. Passenger submits 5-star rating for completed ride");
  } catch (e) {
    assert(false, `20. Rating test failed: ${e.message}`);
  }

  console.log("==========================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Start temporary server for testing
const server = require("./server.js");
setTimeout(() => {
  runTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}, 1500);
