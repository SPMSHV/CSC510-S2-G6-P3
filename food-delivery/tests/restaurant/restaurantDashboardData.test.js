import {
  setupTestDB,
  closeTestDB,
  newAgent,
  createRestaurant,
} from "../helpers/testUtils.js";
import RestaurantAdmin from "../../models/RestaurantAdmin.js";
import Restaurant from "../../models/Restaurant.js";
import bcrypt from "bcrypt";

describe("Restaurant Dashboard Data Endpoint", () => {
  let agent;

  beforeAll(async () => {
    await setupTestDB();
    agent = await newAgent();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("GET /api/restaurant-dashboard/data", () => {
    it("should return restaurantId in dashboard data", async () => {
      // Create restaurant and admin
      const restaurant = await createRestaurant();
      const passwordHash = await bcrypt.hash("testpass123", 10);
      
      const admin = await RestaurantAdmin.create({
        email: "test@restaurant.com",
        passwordHash,
        restaurantId: restaurant._id
      });

      // Login as restaurant admin
      await agent
        .post("/api/restaurant-auth/login")
        .send({
          email: "test@restaurant.com",
          password: "testpass123"
        })
        .expect(200);

      // Get dashboard data
      const res = await agent
        .get("/api/restaurant-dashboard/data")
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.restaurantId).toBeDefined();
      expect(res.body.restaurantId).toBe(restaurant._id.toString());
      expect(res.body.restaurantName).toBeDefined();
      expect(res.body.menuItems).toBeDefined();
      expect(res.body.orders).toBeDefined();
    });

    it("should return 401 when not logged in", async () => {
      // Create a new agent without session
      const unauthAgent = await newAgent();
      await unauthAgent
        .get("/api/restaurant-dashboard/data")
        .expect(401);
    });
  });
});

