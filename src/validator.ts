import type { EnvVarConfig, ValidatedEnv, EnvVarType } from "./types";

export class ValidationError extends Error {
  constructor(
    public readonly errors: string[],
    message: string = "Environment validation failed",
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Environment variable validator
 * Validates and transforms environment variables according to the schema
 */
export class EnvValidator {
  /**
   * Parses and validates a single environment variable value
   */
  private static parseValue(
    value: string | undefined,
    config: EnvVarConfig<EnvVarType>,
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
   */
  static validate<T extends Record<string, EnvVarConfig<EnvVarType>>>(
    schema: T,
    env: NodeJS.ProcessEnv = process.env,
  ): ValidatedEnv<T> {
    const errors: string[] = [];
    const result: Record<string, any> = {};

    for (const [key, config] of Object.entries(schema) as [
      string,
      EnvVarConfig<EnvVarType>,
    ][]) {
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
