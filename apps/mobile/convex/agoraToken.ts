"use node";
/**
 * Agora RTC token generation — runs in Node.js (uses crypto + zlib via agora-token).
 */
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const generate = internalAction({
  args: { channelName: v.string(), uid: v.number() },
  handler: async (_ctx, { channelName, uid }) => {
    const appId          = process.env.AGORA_APP_ID!;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE!;
    const { RtcTokenBuilder, RtcRole } = require("agora-token");
    const expireSeconds = 3600;
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId, appCertificate, channelName, uid,
      RtcRole.PUBLISHER, expireSeconds, expireSeconds,
    );
    return token as string;
  },
});
