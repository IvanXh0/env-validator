import type { EnvVarConfig, EnvVarType } from "./types";

export const env = {
  string: (options: Omit<EnvVarConfig<"string">, "type"> = {}) => ({
    type: "string" as const,
    ...options,
  }),

  number: (options: Omit<EnvVarConfig<"number">, "type"> = {}) => ({
    type: "number" as const,
    ...options,
  }),

  boolean: (options: Omit<EnvVarConfig<"boolean">, "type"> = {}) => ({
    type: "boolean" as const,
    ...options,
  }),

  url: (options: Omit<EnvVarConfig<"url">, "type"> = {}) => ({
    type: "url" as const,
    ...options,
  }),

  email: (options: Omit<EnvVarConfig<"email">, "type"> = {}) => ({
    type: "email" as const,
    ...options,
  }),

  json: (options: Omit<EnvVarConfig<"json">, "type"> = {}) => ({
    type: "json" as const,
    ...options,
  }),
} as const;

export function defineSchema<
  T extends Record<string, EnvVarConfig<EnvVarType>>,
>(schema: T): T {
  return schema;
}
