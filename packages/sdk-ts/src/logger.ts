/** Debug gate: set ``SECRYN_SDK_DEBUG=1`` to enable info/debug/audit output. */
const isDebug = process.env["SECRYN_SDK_DEBUG"] === "1";

/**
 * Namespaced logger for the Secryn SDK.
 *
 * ``error`` and ``warn`` always write to the console.
 * ``info``, ``debug``, and ``audit`` are gated behind the
 * ``SECRYN_SDK_DEBUG`` environment variable (set to ``"1"`` to enable).
 *
 * All messages are prefixed with ``[secryn]`` for grep-friendly output.
 */
export const logger = {
  error(message: string, meta?: unknown): void {
    console.error(`[secryn] ERROR ${message}`, meta ?? "");
  },
  warn(message: string, meta?: unknown): void {
    console.warn(`[secryn] WARN ${message}`, meta ?? "");
  },
  info(message: string, meta?: unknown): void {
    if (isDebug) console.info(`[secryn] INFO ${message}`, meta ?? "");
  },
  debug(message: string, meta?: unknown): void {
    if (isDebug) console.debug(`[secryn] DEBUG ${message}`, meta ?? "");
  },
  /**
   * Emit a structured audit log entry.
   *
   * Format: ``[secryn] [AUDIT] <action> actor=<actor> resource=<resource>``.
   * Gated behind ``SECRYN_SDK_DEBUG`` like ``info`` and ``debug``.
   *
   * @param action  - CRUD verb or custom action identifier (e.g. ``"login"``).
   * @param actor   - Identifier of the principal (user ID, API key prefix).
   * @param resource - Optional resource path or ID affected by the action.
   * @param meta    - Optional unstructured context (serialized inline).
   */
  audit(action: string, actor: string, resource?: string, meta?: unknown): void {
    if (isDebug) {
      console.info(
        `[secryn] [AUDIT] ${action} actor=${actor} resource=${resource ?? "-"}`,
        meta ?? "",
      );
    }
  },
};
