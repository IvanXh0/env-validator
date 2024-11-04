import fs from "fs/promises";
import { EnvValidator } from "./validator";
import type { EnvVarConfig, EnvVarType } from "./types";

interface ValidationResult {
  missing: string[]; // Variables that are required but missing
  invalid: string[]; // Variables that failed validation
  valid: string[]; // Variables that passed validation
}

export class EnvFileHandler {
  /**
   * Reads and parses a .env file into key-value pairs.
   * Handles quoted values and ignores comments.
   * @param filePath - Path to the .env file
   * @returns Object containing environment variables
   */
  static async parse(filePath: string): Promise<Record<string, string>> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const env: Record<string, string> = {};

      content.split("\n").forEach((line) => {
        // Skip empty lines and comments
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith("#")) {
          return;
        }

        // Parse key-value pairs
        const matches = trimmedLine.match(/^([^=]+)=(.*)$/);
        if (!matches) return;

        const key = matches[1].trim();
        let value = matches[2].trim();

        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        env[key] = value;
      });

      return env;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {};
      }
      throw error;
    }
  }

  /**
   * Generates a documented .env.example file from the provided schema.
   * Includes type information, requirements, defaults, and descriptions.
   * @param schema - Environment variable schema
   * @param outputPath - Output path for the example file
   */
  static async generateExample<
    T extends Record<string, EnvVarConfig<EnvVarType>>,
  >(schema: T, outputPath: string = ".env.example"): Promise<void> {
    const lines: string[] = [
      "# Generated Environment Variables",
      `# Generated on ${new Date().toISOString()}`,
      "",
    ];

    for (const [key, config] of Object.entries(schema)) {
      if (config?.description) {
        lines.push(`# ${config.description}`);
      }

      lines.push(`# Type: ${config.type}`);
      if (config.required) {
        lines.push("# Required: true");
      }
      if (config.default !== undefined) {
        lines.push(`# Default: ${config.default}`);
      }
      if (config.validator) {
        lines.push("# Note: Has custom validation");
      }

      // Add example value
      const exampleValue = this.getExampleValue(config);
      lines.push(`${key}=${exampleValue}`);
      lines.push("");
    }

    await fs.writeFile(outputPath, lines.join("\n"));
  }

  /**
   * Validates environment variables against the schema.
   * Reports missing required variables and invalid values.
   * @param schema - Environment variable schema
   * @param envPath - Path to the .env file
   * @returns Validation results showing missing, invalid, and valid variables
   */
  static async validate<T extends Record<string, EnvVarConfig<EnvVarType>>>(
    schema: T,
    envPath: string = ".env",
  ): Promise<ValidationResult> {
    const envContent = await this.parse(envPath);
    const result: ValidationResult = {
      missing: [],
      invalid: [],
      valid: [],
    };

    for (const [key, config] of Object.entries(schema)) {
      // Check for missing required variables
      if (!envContent[key]) {
        if (config.required && config.default === undefined) {
          result.missing.push(key);
        }
        continue;
      }

      // Validate value format
      try {
        EnvValidator.validate({ [key]: config }, { [key]: envContent[key] });
        result.valid.push(key);
      } catch {
        result.invalid.push(key);
      }
    }

    return result;
  }

  /**
   * Synchronizes environment variables across multiple .env files.
   * Preserves existing values while ensuring all required variables are present.
   * @param schema - Environment variable schema
   * @param sourceEnv - Source .env file path
   * @param targetEnvs - Array of target .env file paths
   */
  static async sync<T extends Record<string, EnvVarConfig<EnvVarType>>>(
    schema: T,
    sourceEnv: string = ".env",
    targetEnvs: string[] = [
      ".env.development",
      ".env.staging",
      ".env.production",
    ],
  ): Promise<void> {
    const sourceContent = await this.parse(sourceEnv);

    for (const targetEnv of targetEnvs) {
      const targetContent = await this.parse(targetEnv);
      const updatedContent: string[] = [
        "# Environment Variables",
        `# Synced from ${sourceEnv} on ${new Date().toISOString()}`,
        "",
      ];

      for (const [key, config] of Object.entries(schema)) {
        const value =
          targetContent[key] ||
          sourceContent[key] ||
          this.getExampleValue(config);
        updatedContent.push(`${key}=${value}`);
      }

      await fs.writeFile(targetEnv, updatedContent.join("\n"));
    }
  }

  /**
   * Generates an example value for an environment variable based on its type.
   * Uses default if provided, otherwise generates a type-appropriate example.
   * @param config - Environment variable configuration
   * @returns Example value as string
   */
  private static getExampleValue<T extends EnvVarType>(
    config: EnvVarConfig<T>,
  ): string {
    if (config.default !== undefined) {
      return String(config.default);
    }

    switch (config.type) {
      case "string":
        return "example_value";
      case "number":
        return "3000";
      case "boolean":
        return "true";
      case "url":
        return "https://example.com";
      case "email":
        return "user@example.com";
      case "json":
        return '{"key": "value"}';
      default:
        return "";
    }
  }
}
