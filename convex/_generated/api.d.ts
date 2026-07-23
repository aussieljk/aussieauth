/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apps from "../apps.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as lib_accountNumber from "../lib/accountNumber.js";
import type * as lib_apple from "../lib/apple.js";
import type * as lib_apps from "../lib/apps.js";
import type * as lib_demo from "../lib/demo.js";
import type * as lib_linking from "../lib/linking.js";
import type * as lib_methods from "../lib/methods.js";
import type * as lib_notify from "../lib/notify.js";
import type * as lib_registration from "../lib/registration.js";
import type * as lib_solana from "../lib/solana.js";
import type * as lib_status from "../lib/status.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apps: typeof apps;
  auth: typeof auth;
  http: typeof http;
  "lib/accountNumber": typeof lib_accountNumber;
  "lib/apple": typeof lib_apple;
  "lib/apps": typeof lib_apps;
  "lib/demo": typeof lib_demo;
  "lib/linking": typeof lib_linking;
  "lib/methods": typeof lib_methods;
  "lib/notify": typeof lib_notify;
  "lib/registration": typeof lib_registration;
  "lib/solana": typeof lib_solana;
  "lib/status": typeof lib_status;
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

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};
