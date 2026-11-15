import "server-only";
import { X_CLIENT_ID } from "./x-oauth";

/**
 * Guest mode: until X OAuth keys are configured, players enter with a chosen name instead of
 * signing in with X. Turns itself off the moment X_CLIENT_ID is set (or force it off with
 * GUEST_MODE=off). Guest names aren't verified, so don't snapshot a real allowlist from guest accounts.
 */
export const guestMode = () => process.env.GUEST_MODE !== "off" && (!X_CLIENT_ID || process.env.GUEST_MODE === "on");
