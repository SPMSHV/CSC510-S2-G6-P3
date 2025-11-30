import { sendOrderStatusEmail, sendOrderConfirmationEmail, sendRefundNotificationEmail } from "../../utils/emailService.js";

describe("Email Service", () => {
  // Store original console.log
  const originalConsoleLog = console.log;
  let logCalls = [];

  beforeEach(() => {
    logCalls = [];
    console.log = (...args) => {
      logCalls.push(args.join(" "));
      originalConsoleLog(...args);
    };
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    logCalls = [];
  });

  describe("sendOrderStatusEmail", () => {
    it("should send order status email", async () => {
      const result = await sendOrderStatusEmail(
        "test@example.com",
        "order123",
        "delivered",
        { total: 25.50 }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("Email sent");
      expect(logCalls.some(call => 
        call.includes("📧 [EMAIL]") && call.includes("test@example.com")
      )).toBe(true);
    });

    it("should handle different order statuses", async () => {
      const statuses = ["placed", "preparing", "ready_for_pickup", "out_for_delivery", "delivered"];

      for (const status of statuses) {
        const result = await sendOrderStatusEmail(
          "test@example.com",
          "order123",
          status,
          { total: 25.50 }
        );

        expect(result.success).toBe(true);
      }
    });
  });

  describe("sendOrderConfirmationEmail", () => {
    it("should send order confirmation email", async () => {
      const result = await sendOrderConfirmationEmail(
        "test@example.com",
        "order123",
        { total: 25.50, items: 3 }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("Confirmation email sent");
      expect(logCalls.some(call => 
        call.includes("Order Confirmation")
      )).toBe(true);
    });
  });

  describe("sendRefundNotificationEmail", () => {
    it("should send refund notification email", async () => {
      const result = await sendRefundNotificationEmail(
        "test@example.com",
        "refund123",
        25.50,
        "Wrong item delivered"
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("Refund notification sent");
      expect(logCalls.some(call => 
        call.includes("Refund notification")
      )).toBe(true);
    });
  });
});

