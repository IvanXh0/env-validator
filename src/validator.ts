import type { EnvSchema, EnvVarConfig, ValidatedEnv } from "./types";
/**
 * Error thrown when environment validation fails
 * @example
 * try {
 *   EnvValidator.validate(schema);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.log(error.errors); // Array of validation errors
 *   }
 * }
 */
export class ValidationError extends Error {
  constructor(
    /** Array of validation error messages */
    public readonly errors: string[],
    message: string = "Environment validation failed",
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validates environment variables against a schema
 * @example
 * const schema = {
 *   PORT: { type: 'number', required: true },
 *   API_URL: { type: 'url', required: true }
 * } as const;
 *
 * const env = EnvValidator.validate(schema);
 * // env.PORT is typed as number
 * // env.API_URL is typed as string
 */
export class EnvValidator {
  private static parseValue(
    value: string | undefined,
    config: EnvVarConfig,
  ): any {
    if (value === undefined) {
      if (config.required && config.default === undefined) {
        throw new Error("Required value is missing");
      }
      return config.default;
    }

    switch (config.type) {
      case "number":
        const num = Number(value);
        if (isNaN(num)) throw new Error("Invalid number");
        return num;
      case "boolean":
        if (!["true", "false", "1", "0"].includes(value.toLowerCase())) {
          throw new Error("Invalid boolean");
        }
        return ["true", "1"].includes(value.toLowerCase());
      case "url":
        try {
          new URL(value);
          return value;
        } catch {
          throw new Error("Invalid URL");
        }
      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) throw new Error("Invalid email");
        return value;
      case "json":
        try {
          return JSON.parse(value);
        } catch {
          throw new Error("Invalid JSON");
        }
      default:
        return value;
    }
  }

  /**
   * Validates environment variables against the provided schema
   * @param schema - Environment variable schema
   * @param env - Environment variables object (defaults to process.env)
   * @returns Validated environment variables
   * @throws {ValidationError} If validation fails
   */
  static validate<T extends EnvSchema>(
    schema: T,
    env: NodeJS.ProcessEnv = process.env,
  ): ValidatedEnv<T> {
    const errors: string[] = [];
    const result: Record<string, any> = {};

    for (const [key, config] of Object.entries(schema)) {
      try {
        const value = EnvValidator.parseValue(env[key], config);

        if (config.validator && !config.validator(value)) {
          throw new Error("Custom validation failed");
        }

        result[key] = value;
      } catch (error) {
        errors.push(`${key}: ${(error as Error).message}`);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return result as ValidatedEnv<T>;
  }
}
