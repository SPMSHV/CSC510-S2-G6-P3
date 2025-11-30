import request from "supertest";
import app from "../../server.js";

describe("Driver orders – pending vs delivered", () => {
  test("POST /api/driver/orders/delivered/:id is guarded", async () => {
    const res = await request(app).post(
      "/api/driver/orders/delivered/64b000000000000000000000"
    );

    // From your logs, this is 401 when not logged in, which is correct guard behavior
    expect(res.status).toBe(401);
    expect(res.body).toBeDefined();
  });
});
