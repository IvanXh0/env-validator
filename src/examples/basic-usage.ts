import { EnvValidator } from "../validator";

const schema = {
  NODE_ENV: {
    type: "string",
    required: true,
    validator: (value: string) =>
      ["development", "production", "test"].includes(value),
  },
  PORT: {
    type: "number",
    default: 3000,
    validator: (value: number) => value >= 1000 && value <= 65535,
  },
  DATABASE_URL: {
    type: "url",
    required: true,
  },
  DEBUG: {
    type: "boolean",
    default: false,
  },
} as const;

try {
  const env = EnvValidator.validate(schema);
  console.log("Validated environment:", env);
} catch (error) {
  if (error instanceof Error) {
    console.error("Validation failed:", error.message);
  }
  process.exit(1);
}
