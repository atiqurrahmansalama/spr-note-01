/**
 * TaleemOS / SPR Note ERP — Universal Backend Error Parser
 * =========================================================
 * Formats Django REST Framework validation, business logic,
 * and exception payloads into human-readable error descriptions.
 */

export function parseBackendError(errorData: any): string {
  if (!errorData) return "Unknown server error";
  if (typeof errorData === "string") return errorData;

  // Unwrap backend standard exception structures
  const target = errorData.details || errorData.errors || errorData.data || errorData;

  if (typeof target === "string") return target;
  if (target.detail && typeof target.detail === "string") return target.detail;
  if (target.message && typeof target.message === "string") return target.message;
  if (target.error && typeof target.error === "string") return target.error;

  if (typeof target === "object" && target !== null) {
    const entries = Object.entries(target)
      .filter(([key]) => !["success", "status_code", "error_type", "request_id", "timestamp"].includes(key))
      .map(([key, val]) => {
        let msg = "";
        if (Array.isArray(val)) {
          msg = val.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
        } else if (typeof val === "object" && val !== null) {
          msg = JSON.stringify(val);
        } else {
          msg = String(val);
        }
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
        return `${formattedKey}: ${msg}`;
      });

    if (entries.length > 0) return entries.join(" • ");
  }

  return errorData.error_type || errorData.message || JSON.stringify(errorData);
}
