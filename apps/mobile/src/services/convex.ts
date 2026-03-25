/**
 * Convex client singleton.
 * Used for one-off mutations/actions from service files.
 * For reactive queries, use the useQuery hook from "convex/react" directly in screens.
 */
import { ConvexReactClient } from "convex/react";

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error(
    "EXPO_PUBLIC_CONVEX_URL is not set. Add it to apps/mobile/.env:\n" +
    "EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud",
  );
}

export const convex = new ConvexReactClient(CONVEX_URL);
