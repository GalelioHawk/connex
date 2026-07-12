/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _helpers from "../_helpers.js";
import type * as agoraToken from "../agoraToken.js";
import type * as alerts from "../alerts.js";
import type * as auth from "../auth.js";
import type * as calls from "../calls.js";
import type * as chat from "../chat.js";
import type * as crons from "../crons.js";
import type * as edu from "../edu.js";
import type * as eduHelp from "../eduHelp.js";
import type * as eduNotes from "../eduNotes.js";
import type * as eduSeed from "../eduSeed.js";
import type * as eduTutors from "../eduTutors.js";
import type * as feed from "../feed.js";
import type * as push from "../push.js";
import type * as sos from "../sos.js";
import type * as sos_internal from "../sos_internal.js";
import type * as status from "../status.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _helpers: typeof _helpers;
  agoraToken: typeof agoraToken;
  alerts: typeof alerts;
  auth: typeof auth;
  calls: typeof calls;
  chat: typeof chat;
  crons: typeof crons;
  edu: typeof edu;
  eduHelp: typeof eduHelp;
  eduNotes: typeof eduNotes;
  eduSeed: typeof eduSeed;
  eduTutors: typeof eduTutors;
  feed: typeof feed;
  push: typeof push;
  sos: typeof sos;
  sos_internal: typeof sos_internal;
  status: typeof status;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
