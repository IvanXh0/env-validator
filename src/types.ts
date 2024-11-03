/** Supported environment variable types */
export type EnvVarType =
  | "string"
  | "number"
  | "boolean"
  | "url"
  | "email"
  | "json";

/** Configuration options for environment variables */
export interface EnvVarConfig<T = any> {
  /** Type of the environment variable */
  type: EnvVarType;
  /** Whether the variable is required. Defaults to false */
  required?: boolean;
  /** Default value if not provided */
  default?: T;
  /** Custom validation function */
  validator?: (value: T) => boolean;
}

/** Schema definition for environment variables */
export type EnvSchema = Record<string, EnvVarConfig>;

/** Inferred type from schema */
export type ValidatedEnv<T extends EnvSchema> = {
  [K in keyof T]: InferEnvType<T[K]>;
};

type InferEnvType<T extends EnvVarConfig> = T extends { type: "number" }
  ? number
  : T extends { type: "boolean" }
    ? boolean
    : T extends { type: "json" }
      ? any
      : string;
