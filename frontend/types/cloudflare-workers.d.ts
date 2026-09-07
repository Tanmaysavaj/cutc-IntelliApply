/**
 * Minimal ambient declaration for the `cloudflare:workers` built-in module.
 *
 * The runtime provides this module, but nothing in the project declares it, so
 * every import of it was a TS2307 error (see `db/index.ts`, which has had this
 * error since it was added). Installing `@cloudflare/workers-types` would also
 * work; this avoids the extra dependency for the one symbol actually used.
 *
 * `env` is typed loosely on purpose: plain vars and secrets arrive as strings,
 * while bindings such as D1, KV and R2 arrive as objects.
 */
declare module "cloudflare:workers" {
  export const env: Record<string, any>;
}
