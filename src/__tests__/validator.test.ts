import { EnvValidator, ValidationError } from "../validator";
import { env, defineSchema } from "../builder";

describe("EnvValidator", () => {
  const mockEnv = {
    PORT: "3000",
    API_URL: "https://api.example.com",
    DEBUG: "true",
    EMAIL: "test@example.com",
    CONFIG: '{"key":"value"}',
  };

  describe("Schema Builder Pattern", () => {
    it("should validate using schema builder", () => {
      const schema = defineSchema({
        PORT: env.number({
          required: true,
          validator: (value) => value >= 1000 && value <= 9999,
        }),
        API_URL: env.url({ required: true }),
      });
      const result = EnvValidator.validate(schema, mockEnv);
      expect(result.PORT).toBe(3000);
      expect(result.API_URL).toBe("https://api.example.com");
    });
  });

  describe("Legacy Pattern", () => {
    it("should validate required fields", () => {
      const schema = defineSchema({
        PORT: env.number({ required: true }),
      });

      expect(() => EnvValidator.validate(schema, {})).toThrow(ValidationError);
      const result = EnvValidator.validate(schema, mockEnv);
      expect(result.PORT).toBe(3000);
    });

    it("should handle default values", () => {
      const schema = defineSchema({
        PORT: env.number({ default: 8080 }),
      });

      const result = EnvValidator.validate(schema, {});
      expect(result.PORT).toBe(8080);
    });

    it("should validate types correctly", () => {
      const schema = defineSchema({
        PORT: env.number({}),
        API_URL: env.url({}),
        DEBUG: env.boolean({}),
        EMAIL: env.email({}),
        CONFIG: env.json({}),
      });

      const result = EnvValidator.validate(schema, mockEnv);
      expect(result.PORT).toBe(3000);
      expect(result.API_URL).toBe("https://api.example.com");
      expect(result.DEBUG).toBe(true);
      expect(result.EMAIL).toBe("test@example.com");
      expect(result.CONFIG).toEqual({ key: "value" });
    });

    it("should support custom validators", () => {
      const schema = defineSchema({
        PORT: env.number({
          validator: (value) => value >= 1000 && value <= 9999,
        }),
      });

      expect(() => EnvValidator.validate(schema, { PORT: "500" })).toThrow(
        ValidationError,
      );
      const result = EnvValidator.validate(schema, { PORT: "3000" });
      expect(result.PORT).toBe(3000);
    });

    it("should collect all validation errors", () => {
      const schema = defineSchema({
        PORT: env.number({ required: true }),
        API_URL: env.url({ required: true }),
        EMAIL: env.email({ required: true }),
      });

      try {
        EnvValidator.validate(schema, {});
        fail("Should have thrown ValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).errors).toHaveLength(3);
      }
    });
  });
});
