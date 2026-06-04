/**
 * Makes every property of {@code T} nullable.
 *
 * @template T - The source type
 * @example
 * Nullable<{ id: number }>; // { id: number | null }
 */
export type Nullable<T> = T | null;

/**
 * Recursively makes every property of {@code T} (and nested objects) optional.
 * Useful for update DTOs where callers send only the fields they want to change.
 *
 * @template T - The source object type
 * @example
 * DeepPartial<{ a: number; b: { c: string } }>;
 * // { a?: number; b?: { c?: string } }
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
