import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { emailOtp } from "./auth/emailOtp";
import { pinProvider } from "./pinProvider";

/**
 * LAMSA verifies an email once, then uses a six-digit PIN for everyday access.
 * Anonymous sessions remain available only so studios created before this flow
 * can be claimed by a newly verified account.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [emailOtp, Anonymous, pinProvider],
});
