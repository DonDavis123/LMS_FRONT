/**
 * Backward-compatible export.
 *
 * Token storage is infrastructure-level because the API client uses it.
 * New code should import authStorage from "@/infrastructure/auth/tokenStorage".
 */
export { authStorage } from "@/infrastructure/auth/tokenStorage";
