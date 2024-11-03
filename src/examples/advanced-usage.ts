import { defineSchema, env } from "../builder";
import { EnvValidator, ValidationError } from "../validator";

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

// Define custom environment configurations for different environments
const commonConfig = {
  NODE_ENV: env.string({
    required: true,
    validator: (value) =>
      ["development", "staging", "production"].includes(value),
  }),
  PORT: env.number({
    default: 3000,
    validator: portValidator,
  }),
  LOG_LEVEL: env.string({
    default: "info",
    validator: (value) => ["error", "warn", "info", "debug"].includes(value),
  }),
};

// Database configuration with connection pool settings
const databaseConfig = {
  DATABASE_URL: env.url({
    required: true,
    validator: urlValidator,
  }),
  DB_POOL_SIZE: env.number({
    default: 20,
    validator: (value) => value >= 5 && value <= 100,
  }),
  DB_IDLE_TIMEOUT: env.number({
    default: 10000,
    validator: (value) => value >= 1000,
  }),
};

// Redis configuration for caching
const redisConfig = {
  REDIS_URL: env.url({
    required: true,
  }),
  REDIS_PASSWORD: env.string({
    required: true,
  }),
  CACHE_TTL: env.number({
    default: 3600,
    validator: (value) => value > 0,
  }),
};

// Email service configuration
const emailConfig = {
  SMTP_HOST: env.string({ required: true }),
  SMTP_PORT: env.number({
    default: 587,
    validator: portValidator,
  }),
  SMTP_USER: env.email({ required: true }),
  SMTP_PASS: env.string({ required: true }),
};

// Feature flags configuration
const featureFlags = {
  FEATURES: env.json({
    default: '{"newUI":false,"beta":false}',
    validator: (value) => {
      return (
        typeof value === "object" &&
        "newUI" in value &&
        "beta" in value &&
        typeof value.newUI === "boolean" &&
        typeof value.beta === "boolean"
      );
    },
  }),
};

// Combine all configurations
const schema = defineSchema({
  ...commonConfig,
  ...databaseConfig,
  ...redisConfig,
  ...emailConfig,
  ...featureFlags,
});

try {
  const env = EnvValidator.validate(schema);

  // TypeScript knows all the correct types
  const {
    NODE_ENV,
    PORT,
    DATABASE_URL,
    DB_POOL_SIZE,
    REDIS_URL,
    FEATURES,
    SMTP_PORT,
  } = env;

  // Configuration object with typed values
  const config = {
    isProduction: NODE_ENV === "production",
    server: {
      port: PORT,
      logLevel: env.LOG_LEVEL,
    },
    database: {
      url: DATABASE_URL,
      poolSize: DB_POOL_SIZE,
      idleTimeout: env.DB_IDLE_TIMEOUT,
    },
    redis: {
      url: REDIS_URL,
      ttl: env.CACHE_TTL,
    },
    email: {
      host: env.SMTP_HOST,
      port: SMTP_PORT,
      user: env.SMTP_USER,
    },
    features: FEATURES,
  };

  console.log("Configuration loaded:", config);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Environment validation failed:");
    error.errors.forEach((err) => console.error(`  - ${err}`));
  }
  process.exit(1);
}
