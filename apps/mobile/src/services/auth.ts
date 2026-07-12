/**
 * Auth service — thin wrapper around Convex actions.
 * All calls go to Convex, no HTTP backend needed.
 */
import { convex } from "./convex";
import { api } from "../../convex/_generated/api";

export const authService = {
  async register(phone: string, password: string, name: string) {
    return convex.action(api.auth.register, { phone, password, name });
  },

  async login(phone: string, password: string) {
    return convex.action(api.auth.login, { phone, password });
  },

  async logout(sessionId: string) {
    return convex.action(api.auth.logout, { sessionId: sessionId as any });
  },

  async saveExpoPushToken(sessionId: string, expoPushToken: string) {
    return convex.mutation(api.users.updateProfile, {
      sessionId: sessionId as any,
      expoPushToken,
    });
  },
};
