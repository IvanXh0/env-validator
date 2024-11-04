import fs from "fs/promises";
import { EnvFileHandler } from "../file-handler";
import { defineSchema, env } from "../builder";

jest.mock("fs/promises");
const mockedFs = jest.mocked(fs);

describe("EnvFileHandler", () => {
  const testSchema = defineSchema({
    NODE_ENV: env.string({
      default: "development",
      description: "Current environment",
    }),
    PORT: env.number({
      required: true,
      description: "Server port",
    }),
    API_URL: env.url({
      required: true,
      description: "API endpoint",
    }),
    DEBUG: env.boolean({
      default: false,
      description: "Enable debug mode",
    }),
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("parse", () => {
    it("should parse basic env file content", async () => {
      mockedFs.readFile.mockResolvedValue(
        "PORT=3000\nAPI_URL=https://api.example.com",
      );

      const result = await EnvFileHandler.parse(".env");
      expect(result).toEqual({
        PORT: "3000",
        API_URL: "https://api.example.com",
      });
    });

    it("should handle empty lines and comments", async () => {
      mockedFs.readFile.mockResolvedValue(
        "# This is a comment\n\nPORT=3000\n\n# Another comment\nAPI_URL=https://api.example.com",
      );

      const result = await EnvFileHandler.parse(".env");
      expect(result).toEqual({
        PORT: "3000",
        API_URL: "https://api.example.com",
      });
    });

    it("should handle quoted values", async () => {
      mockedFs.readFile.mockResolvedValue(
        "STRING_VALUE=\"hello world\"\nSINGLE_QUOTE='single quoted'",
      );

      const result = await EnvFileHandler.parse(".env");
      expect(result).toEqual({
        STRING_VALUE: "hello world",
        SINGLE_QUOTE: "single quoted",
      });
    });

    it("should return empty object when file does not exist", async () => {
      mockedFs.readFile.mockRejectedValue({ code: "ENOENT" });

      const result = await EnvFileHandler.parse(".env");
      expect(result).toEqual({});
    });

    it("should throw on other file system errors", async () => {
      mockedFs.readFile.mockRejectedValue(new Error("Permission denied"));

      await expect(EnvFileHandler.parse(".env")).rejects.toThrow(
        "Permission denied",
      );
    });
  });

  describe("generateExample", () => {
    it("should generate example file with correct format", async () => {
      await EnvFileHandler.generateExample(testSchema);

      const writeFileCall = mockedFs.writeFile.mock.calls[0];
      const content = writeFileCall[1] as string;

      expect(content).toContain("# Generated Environment Variables");
      expect(content).toContain("# Type: string");
      expect(content).toContain("NODE_ENV=development");
      expect(content).toContain("# Required: true");
      expect(content).toContain("PORT=3000");
      expect(content).toContain("API_URL=https://example.com");
      expect(content).toContain("DEBUG=false");
    });

    it("should include descriptions when provided", async () => {
      await EnvFileHandler.generateExample(testSchema);

      const content = mockedFs.writeFile.mock.calls[0][1] as string;
      expect(content).toContain("# Current environment");
      expect(content).toContain("# Server port");
    });

    it("should use custom output path", async () => {
      const customPath = ".env.custom";
      await EnvFileHandler.generateExample(testSchema, customPath);

      expect(mockedFs.writeFile.mock.calls[0][0]).toBe(customPath);
    });
  });

  describe("validate", () => {
    it("should validate all variables correctly", async () => {
      mockedFs.readFile.mockResolvedValue(
        "PORT=3000\nAPI_URL=https://api.example.com\nDEBUG=true",
      );

      const result = await EnvFileHandler.validate(testSchema);

      expect(result.valid).toContain("PORT");
      expect(result.valid).toContain("API_URL");
      expect(result.valid).toContain("DEBUG");
      expect(result.missing).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
    });

    it("should detect missing required variables", async () => {
      mockedFs.readFile.mockResolvedValue("DEBUG=true");

      const result = await EnvFileHandler.validate(testSchema);

      expect(result.missing).toContain("PORT");
      expect(result.missing).toContain("API_URL");
    });

    it("should detect invalid values", async () => {
      mockedFs.readFile.mockResolvedValue(
        "PORT=invalid\nAPI_URL=not-a-url\nDEBUG=maybe",
      );

      const result = await EnvFileHandler.validate(testSchema);

      expect(result.invalid).toContain("PORT");
      expect(result.invalid).toContain("API_URL");
      expect(result.invalid).toContain("DEBUG");
    });

    it("should not require variables with defaults", async () => {
      mockedFs.readFile.mockResolvedValue(
        "PORT=3000\nAPI_URL=https://api.example.com",
      );

      const result = await EnvFileHandler.validate(testSchema);

      expect(result.missing).not.toContain("NODE_ENV");
      expect(result.missing).not.toContain("DEBUG");
    });
  });

  describe("sync", () => {
    it("should sync environments while preserving existing values", async () => {
      mockedFs.readFile.mockResolvedValueOnce(
        "PORT=3000\nAPI_URL=https://api.example.com",
      );

      mockedFs.readFile.mockResolvedValueOnce(
        "PORT=8080\nAPI_URL=https://api.example.com",
      );

      await EnvFileHandler.sync(testSchema, ".env", [".env.production"]);

      const writeFileCall = mockedFs.writeFile.mock.calls[0];
      const content = writeFileCall[1] as string;

      expect(content).toContain("PORT=8080");
      expect(content).toContain("API_URL=https://api.example.com");
    });

    it("should use source values when target values are missing", async () => {
      mockedFs.readFile.mockResolvedValueOnce(
        "PORT=3000\nAPI_URL=https://api.example.com",
      );

      mockedFs.readFile.mockResolvedValueOnce(
        "API_URL=https://api.example.com",
      );

      await EnvFileHandler.sync(testSchema, ".env", [".env.production"]);

      const content = mockedFs.writeFile.mock.calls[0][1] as string;
      expect(content).toContain("PORT=3000");
    });

    it("should use example values when both source and target are missing values", async () => {
      // Source and target missing DEBUG
      mockedFs.readFile.mockResolvedValueOnce(
        "PORT=3000\nAPI_URL=https://api.example.com",
      );
      mockedFs.readFile.mockResolvedValueOnce(
        "PORT=3000\nAPI_URL=https://api.example.com",
      );

      await EnvFileHandler.sync(testSchema, ".env", [".env.production"]);

      const content = mockedFs.writeFile.mock.calls[0][1] as string;
      expect(content).toContain("DEBUG=false");
    });

    it("should handle non-existent target files", async () => {
      mockedFs.readFile.mockResolvedValueOnce(
        "PORT=3000\nAPI_URL=https://api.example.com",
      );

      mockedFs.readFile.mockRejectedValueOnce({ code: "ENOENT" });

      await EnvFileHandler.sync(testSchema, ".env", [".env.production"]);

      const writeFileCall = mockedFs.writeFile.mock.calls[0];
      const content = writeFileCall[1] as string;
      expect(content).toContain("PORT=3000");
      expect(content).toContain("API_URL=https://api.example.com");
    });
  });
});
