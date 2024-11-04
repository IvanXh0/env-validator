/**
 * Maps environment variable types to their TypeScript types.
 */
export type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  url: string;
  email: string;
  json: any;
};

export type EnvVarType = keyof TypeMap;

/**
 * Configuration options for environment variables.
 */
export interface EnvVarConfig<T extends EnvVarType> {
  readonly type: T;
  readonly required?: boolean;
  readonly default?: TypeMap[T];
  readonly validator?: (value: TypeMap[T]) => boolean;
  readonly description?: string;
}

/**
 * Schema definition for environment variables.
 */
export type EnvSchema<T extends Record<string, EnvVarConfig<EnvVarType>>> = T;

/**
 * Validated environment values
 */
export type ValidatedEnv<T> = {
  [K in keyof T]: T[K] extends EnvVarConfig<infer V> ? TypeMap[V] : never;
};
