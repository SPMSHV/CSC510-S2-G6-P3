import {
  setupTestDB,
  closeTestDB,
  newAgent,
  createRestaurant,
} from "../helpers/testUtils.js";
import Restaurant from "../../models/Restaurant.js";
import MenuItem from "../../models/MenuItem.js";

describe("Search & Filter Enhancements", () => {
  let agent;

  beforeAll(async () => {
    await setupTestDB();
    agent = await newAgent();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("GET /api/restaurants with filters", () => {
    it("should filter restaurants by cuisine", async () => {
      await createRestaurant({ name: "Italian Place", cuisine: "Italian" });
      await createRestaurant({ name: "Chinese Place", cuisine: "Chinese" });

      const res = await agent
        .get("/api/restaurants?cuisine=Italian")
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      res.body.forEach((restaurant) => {
        expect(restaurant.cuisine.toLowerCase()).toContain("italian");
      });
    });

    it("should filter restaurants by minimum rating", async () => {
      await createRestaurant({ name: "High Rated", cuisine: "Italian", rating: 4.8 });
      await createRestaurant({ name: "Low Rated", cuisine: "Chinese", rating: 3.2 });

      const res = await agent
        .get("/api/restaurants?minRating=4.5")
        .expect(200);

      res.body.forEach((restaurant) => {
        expect(restaurant.rating).toBeGreaterThanOrEqual(4.5);
      });
    });

    it("should search restaurants by name", async () => {
      await createRestaurant({ name: "Pizza Palace", cuisine: "Italian" });
      await createRestaurant({ name: "Burger King", cuisine: "American" });

      const res = await agent
        .get("/api/restaurants?q=Pizza")
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.some((r) => r.name.toLowerCase().includes("pizza"))).toBe(true);
    });

    it("should sort restaurants by delivery fee", async () => {
      await createRestaurant({ name: "Expensive", cuisine: "Italian", deliveryFee: 5 });
      await createRestaurant({ name: "Cheap", cuisine: "Chinese", deliveryFee: 1 });

      const res = await agent
        .get("/api/restaurants?sortBy=deliveryFee")
        .expect(200);

      // Check that results are sorted (first should have lower delivery fee)
      if (res.body.length >= 2) {
        expect(res.body[0].deliveryFee).toBeLessThanOrEqual(res.body[1].deliveryFee);
      }
    });
  });

  describe("GET /api/restaurants/search/menu", () => {
    it("should search menu items across restaurants", async () => {
      const restaurant1 = await createRestaurant({ name: "Restaurant 1", cuisine: "Italian" });
      const restaurant2 = await createRestaurant({ name: "Restaurant 2", cuisine: "Chinese" });

      await MenuItem.create({
        restaurantId: restaurant1._id,
        name: "Margherita Pizza",
        price: 12,
        isAvailable: true,
      });

      await MenuItem.create({
        restaurantId: restaurant2._id,
        name: "Pepperoni Pizza",
        price: 15,
        isAvailable: true,
      });

      const res = await agent
        .get("/api/restaurants/search/menu?q=Pizza")
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      res.body.forEach((item) => {
        expect(item.name.toLowerCase()).toContain("pizza");
      });
    });

    it("should filter menu items by price range", async () => {
      const restaurant = await createRestaurant();

      await MenuItem.create({
        restaurantId: restaurant._id,
        name: "Cheap Burger",
        price: 5,
        isAvailable: true,
      });

      await MenuItem.create({
        restaurantId: restaurant._id,
        name: "Expensive Burger",
        price: 25,
        isAvailable: true,
      });

      const res = await agent
        .get("/api/restaurants/search/menu?q=Burger&minPrice=10&maxPrice=20")
        .expect(200);

      res.body.forEach((item) => {
        expect(item.price).toBeGreaterThanOrEqual(10);
        expect(item.price).toBeLessThanOrEqual(20);
      });
    });

    it("should filter menu items by restaurant", async () => {
      const restaurant1 = await createRestaurant();
      const restaurant2 = await createRestaurant();

      await MenuItem.create({
        restaurantId: restaurant1._id,
        name: "Item 1",
        price: 10,
        isAvailable: true,
      });

      await MenuItem.create({
        restaurantId: restaurant2._id,
        name: "Item 2",
        price: 15,
        isAvailable: true,
      });

      const res = await agent
        .get(`/api/restaurants/search/menu?q=Item&restaurantId=${restaurant1._id.toString()}`)
        .expect(200);

      res.body.forEach((item) => {
        expect(item.restaurantId._id.toString()).toBe(restaurant1._id.toString());
      });
    });

    it("should require search query", async () => {
      await agent
        .get("/api/restaurants/search/menu")
        .expect(400);
    });
  });
});

