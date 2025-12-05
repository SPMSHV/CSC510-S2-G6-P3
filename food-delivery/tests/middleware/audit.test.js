import {
  setupTestDB,
  closeTestDB,
} from "../helpers/testUtils.js";
import AuditLog from "../../models/AuditLog.js";
import { auditLog, auditMiddleware } from "../../middleware/audit.js";
import { jest } from '@jest/globals';

describe("Audit Logging", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await AuditLog.deleteMany({});
  });

  describe("auditLog function", () => {
    it("should create an audit log entry", async () => {
      await auditLog("TEST_ACTION", {
        userId: "64b000000000000000000000",
        orderId: "64b000000000000000000001",
        testData: "test value"
      });

      const log = await AuditLog.findOne({ action: "TEST_ACTION" });
      expect(log).toBeTruthy();
      expect(log.userId.toString()).toBe("64b000000000000000000000");
      expect(log.orderId.toString()).toBe("64b000000000000000000001");
      expect(log.details.testData).toBe("test value");
    });

    it("should sanitize password fields", async () => {
      await auditLog("TEST_ACTION", {
        userId: "64b000000000000000000000",
        password: "secret123",
        passwordHash: "$2b$10$hashed",
        cardNumber: "1234567890123456",
        cvv: "123",
        token: "jwt-token",
        secret: "my-secret"
      });

      const log = await AuditLog.findOne({ action: "TEST_ACTION" });
      expect(log.details.password).toBe("[REDACTED]");
      expect(log.details.passwordHash).toBe("[REDACTED]");
      expect(log.details.cardNumber).toBe("[REDACTED]");
      expect(log.details.cvv).toBe("[REDACTED]");
      expect(log.details.token).toBe("[REDACTED]");
      expect(log.details.secret).toBe("[REDACTED]");
    });

    it("should sanitize nested password fields", async () => {
      await auditLog("TEST_ACTION", {
        userId: "64b000000000000000000000",
        user: {
          email: "test@example.com",
          password: "secret123",
          nested: {
            passwordHash: "$2b$10$hashed"
          }
        }
      });

      const log = await AuditLog.findOne({ action: "TEST_ACTION" });
      expect(log.details.user.password).toBe("[REDACTED]");
      expect(log.details.user.nested.passwordHash).toBe("[REDACTED]");
      expect(log.details.user.email).toBe("test@example.com"); // Not sensitive
    });

    it("should handle case-insensitive sensitive field detection", async () => {
      await auditLog("TEST_ACTION", {
        userId: "64b000000000000000000000",
        PASSWORD: "secret123",
        Password: "secret456",
        userPassword: "secret789"
      });

      const log = await AuditLog.findOne({ action: "TEST_ACTION" });
      expect(log.details.PASSWORD).toBe("[REDACTED]");
      expect(log.details.Password).toBe("[REDACTED]");
      expect(log.details.userPassword).toBe("[REDACTED]");
    });

    it("should extract IP address from request object", async () => {
      const mockReq = {
        ip: "192.168.1.1",
        get: (header) => header === "user-agent" ? "Mozilla/5.0" : null
      };

      await auditLog("TEST_ACTION", { userId: "64b000000000000000000000" }, mockReq);

      const log = await AuditLog.findOne({ action: "TEST_ACTION" });
      expect(log.ipAddress).toBe("192.168.1.1");
      expect(log.userAgent).toBe("Mozilla/5.0");
    });

    it("should handle missing request object", async () => {
      await auditLog("TEST_ACTION", { userId: "64b000000000000000000000" });

      const log = await AuditLog.findOne({ action: "TEST_ACTION" });
      expect(log.ipAddress).toBeNull();
      expect(log.userAgent).toBeNull();
    });

    it("should not fail when audit logging throws error", async () => {
      // Mock AuditLog.create to throw error
      const originalCreate = AuditLog.create;
      const mockCreate = jest.fn().mockRejectedValueOnce(new Error("DB error"));
      AuditLog.create = mockCreate;

      // Should not throw
      await expect(auditLog("TEST_ACTION", { userId: "test" })).resolves.not.toThrow();

      // Restore original
      AuditLog.create = originalCreate;
      
      // Verify mock was called
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe("auditMiddleware", () => {
    it("should create audit log after response is sent", async () => {
      const mockReq = {
        method: "POST",
        path: "/api/test",
        session: { customerId: "64b000000000000000000000" },
        body: { test: "data" },
        params: { id: "123" },
        query: { filter: "active" }
      };

      let sendCalled = false;
      const originalSend = function(data) {
        sendCalled = true;
        return data;
      };

      const mockRes = {
        send: originalSend
      };

      const middleware = auditMiddleware("TEST_MIDDLEWARE_ACTION");
      const next = jest.fn();

      await middleware(mockReq, mockRes, next);
      expect(next).toHaveBeenCalled();

      // Call send to trigger audit log
      mockRes.send("test response");

      // Wait a bit for async audit log
      await new Promise(resolve => setTimeout(resolve, 200));

      const log = await AuditLog.findOne({ action: "TEST_MIDDLEWARE_ACTION" });
      expect(log).toBeTruthy();
      expect(log.details.method).toBe("POST");
      expect(log.details.path).toBe("/api/test");
      expect(log.details.userId).toBe("64b000000000000000000000");
    });
  });
});

