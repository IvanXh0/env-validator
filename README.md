# @xho/env-validator

A zero-dependency, type-safe environment variable validator for Node.js applications with full TypeScript support.

## Features

- 🎯 Full TypeScript support with type inference
- 🔒 Runtime validation of environment variables
- ✨ Built-in validators for common types (`number`, `boolean`, `url`, `email`, `json`)
- 🎨 Custom validation functions
- 📝 Environment file handling (.env files)
- 🔄 Environment synchronization across different configurations
- 💪 Zero dependencies
- 🔍 Detailed error messages

## Installation

```bash
npm install @xho/env-validator
```

## Quick Start

### Basic Usage

```typescript
import { EnvValidator } from "@xho/env-validator";

const schema = {
  NODE_ENV: {
    type: "string" as const,
    required: true,
    validator: (value: string) =>
      ["development", "production", "test"].includes(value),
    description: "Application environment (development/staging/production)",
  },
  PORT: {
    type: "number" as const,
    default: 3000,
    validator: (value: number) => value >= 1000 && value <= 65535,
  },
  DATABASE_URL: {
    type: "url" as const,
    required: true,
  },
  DEBUG: {
    type: "boolean" as const,
    default: false,
  },
} as const;

try {
  const env = EnvValidator.validate(schema);

  // TypeScript knows the correct types:
  env.PORT.toFixed(2); // ✓ PORT is number
  env.DEBUG && console.log(); // ✓ DEBUG is boolean

  console.log("Environment validated successfully:", env);
} catch (error) {
  if (error instanceof Error) {
    console.error("Validation failed:", error.message);
  }
  process.exit(1);
}
```

### Schema Builder Pattern (Recommended)

```typescript
import { env, defineSchema, EnvValidator } from "@xho/env-validator";

// Define reusable validators
const portValidator = (value: number) => value >= 1000 && value <= 65535;
const urlValidator = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:"; // Ensure HTTPS
  } catch {
    return false;
  }
};

// Define configuration sections
const databaseConfig = {
  DATABASE_URL: env.url({
    required: true,
    validator: urlValidator,
  }),
  DB_POOL_SIZE: env.number({
    default: 20,
    validator: (value) => value >= 5 && value <= 100,
  }),
};

const appConfig = {
  NODE_ENV: env.string({
    required: true,
    validator: (value) => ["development", "production"].includes(value),
    description: "Application environment (development/staging/production)",
  }),
  PORT: env.number({
    default: 3000,
    validator: portValidator,
  }),
};

// Combine configurations
const schema = defineSchema({
  ...appConfig,
  ...databaseConfig,
});

const env = EnvValidator.validate(schema);
// env.PORT is typed as number
// env.DATABASE_URL is typed as string
// env.DB_POOL_SIZE is typed as number
```

### Environment File Handling

```typescript
import { env, defineSchema, EnvFileHandler } from "@xho/env-validator";

const schema = defineSchema({
  NODE_ENV: env.string({
    default: "development",
    description: "Current environment (development/staging/production)",
  }),
  PORT: env.number({
    default: 3000,
    description: "Port number for the server",
  }),
  DATABASE_URL: env.url({
    required: true,
    description: "PostgreSQL connection string",
  }),
});

// Generate a documented .env.example file
await EnvFileHandler.generateExample(schema);

// Validate existing .env file
const validation = await EnvFileHandler.validate(schema);
if (validation.missing.length > 0) {
  console.error("Missing required variables:", validation.missing);
}
if (validation.invalid.length > 0) {
  console.error("Invalid variables:", validation.invalid);
}

// Sync environments
await EnvFileHandler.sync(schema, ".env", [
  ".env.development",
  ".env.staging",
  ".env.production",
]);
```

Generated `.env.example` will look like:

```env
# Generated Environment Variables
# Generated on 2024-11-04T18:30:00.000Z

# Current environment (development/staging/production)
# Type: string
# Default: development
NODE_ENV=development

# Port number for the server
# Type: number
# Default: 3000
PORT=3000

# PostgreSQL connection string
# Type: url
# Required: true
DATABASE_URL=https://example.com
```

## API Reference

### Supported Types

- `string`: Basic string validation
- `number`: Numeric values with NaN checking
- `boolean`: Accepts 'true', 'false', '1', '0'
- `url`: Valid URL format checking
- `email`: Basic email format validation
- `json`: Valid JSON string that gets parsed

### Configuration Options

```typescript
interface EnvVarConfig<T = any> {
  // The type of environment variable
  type: "string" | "number" | "boolean" | "url" | "email" | "json";

  // Whether the variable is required (default: false)
  required?: boolean;

  // Default value if not provided
  default?: T;

  // Optional custom validation function
  validator?: (value: T) => boolean;

  // Description for documentation purposes
  description?: string;
}
```

### Validation Errors

When validation fails, the validator throws a `ValidationError` with detailed error messages:

```typescript
try {
  const env = EnvValidator.validate(schema);
} catch (error) {
  if (error instanceof ValidationError) {
    // Array of all validation errors
    console.error(error.errors);
  }
}
```

## Examples

### Basic Usage

```typescript
const schema = {
  PORT: { type: "number", required: true },
  API_URL: { type: "url", required: true },
  DEBUG: { type: "boolean", default: false },
} as const;

const env = EnvValidator.validate(schema);
```

### Custom Validation

```typescript
const schema = {
  PORT: {
    type: "number",
    required: true,
    validator: (value) => value >= 1000 && value <= 65535,
  },
  API_KEY: {
    type: "string",
    required: true,
    validator: (value) => value.startsWith("pk_"),
  },
} as const;
```

### With Default Values

```typescript
const schema = {
  NODE_ENV: {
    type: "string",
    default: "development",
    validator: (value) => ["development", "production", "test"].includes(value),
  },
  LOG_LEVEL: {
    type: "string",
    default: "info",
    validator: (value) => ["error", "warn", "info", "debug"].includes(value),
  },
} as const;
```

### JSON Configuration

```typescript
const schema = {
  SERVER_CONFIG: {
    type: "json",
    required: true,
    validator: (value) => {
      // Validate the parsed JSON structure
      return value.hasOwnProperty("host") && value.hasOwnProperty("port");
    },
  },
} as const;

// Can be used with: process.env.SERVER_CONFIG = '{"host":"localhost","port":3000}'
```

## Error Handling

The validator provides detailed error messages when validation fails:

```typescript
try {
  const env = EnvValidator.validate({
    PORT: { type: "number", required: true },
    API_URL: { type: "url", required: true },
  });
} catch (error) {
  if (error instanceof ValidationError) {
    // Prints each validation error:
    // PORT: Required value is missing
    // API_URL: Invalid URL
    error.errors.forEach((err) => console.error(err));
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC
