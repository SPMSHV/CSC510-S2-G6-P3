import {
  setupTestDB,
  closeTestDB,
  registerAndLoginRestaurant,
} from "../helpers/testUtils.js";

let agent;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
});

afterAll(async () => {
  await closeTestDB();
});

describe("Restaurant Login Success", () => {
  it("should log in successfully with valid credentials", async () => {
    const { restaurant, email } = await registerAndLoginRestaurant(agent);
    expect(restaurant._id).toBeDefined();
    expect(email).toMatch(/rest_/);
  });
});
