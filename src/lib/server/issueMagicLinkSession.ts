import { authServiceRolePost } from "@/lib/postgrestServer";

function authErrorMessage(body: string): string {
  try {
    const j = body ? (JSON.parse(body) as { msg?: string; message?: string; error_description?: string }) : {};
    return j.msg || j.message || j.error_description || body || "Auth request failed";
  } catch {
    return body || "Auth request failed";
  }
}

/**
 * Issues access + refresh tokens for an EXISTING auth user identified by email.
 *
 * IMPORTANT — why we use `type: "recovery"` instead of `type: "magiclink"`:
 *   GoTrue's `generate_link` with `type=magiclink` will SILENTLY CREATE a new
 *   auth user when the email doesn't exist (whenever "Allow new user signups"
 *   is on at the project level). That turned a benign caller bug — passing
 *   the wrong synthetic-email format into a phone-OTP login — into a
 *   duplicate-user bug: a fresh row would be created and the user would be
 *   signed into it, orphaning their real account. See the U26049 incident
 *   (26/04/2026) for a real-world example.
 *
 *   `type=recovery` returns a 422 user_not_found if the email doesn't exist,
 *   so we fail loudly instead of silently corrupting the database. The
 *   subsequent `/auth/v1/verify` exchange returns a normal session (the
 *   "recovery" naming is historical — gotrue does not require a password
 *   change to consume the token). For our flow this is purely a session
 *   issuance; the user is logged into the SAME account they already had.
 *
 *   Callers that want to create-or-login should call `/auth/v1/admin/users`
 *   themselves first (we already do this in the OTP-signup flow) and then
 *   issue a session through this helper. That way auth-row creation is
 *   always an explicit, intentional act.
 */
export async function issueMagicLinkSession(
  supabaseUrl: string,
  serviceKey: string,
  email: string
): Promise<
  | {
      ok: true;
      access_token: string;
      refresh_token: string;
      expires_in?: number;
      expires_at?: number;
      token_type?: string;
    }
  | { ok: false; error: string; status: number }
> {
  const linkRes = await authServiceRolePost(supabaseUrl, serviceKey, "/auth/v1/admin/generate_link", {
    type: "recovery",
    email,
  });

  if (linkRes.statusCode < 200 || linkRes.statusCode >= 300) {
    // user_not_found → surface a friendly login-style error instead of a 500.
    // Anything else is logged so we can investigate.
    const lowerBody = linkRes.body.toLowerCase();
    const isNotFound =
      linkRes.statusCode === 422 ||
      linkRes.statusCode === 404 ||
      lowerBody.includes("user not found") ||
      lowerBody.includes("user_not_found");
    if (isNotFound) {
      console.warn("generate_link(recovery) user_not_found:", email, linkRes.body);
      return {
        ok: false,
        error: "No account found for this sign-in. Please create an account first.",
        status: 404,
      };
    }
    console.error("generate_link(recovery):", linkRes.statusCode, linkRes.body);
    return {
      ok: false,
      error: authErrorMessage(linkRes.body) || "Could not complete sign-in",
      status: linkRes.statusCode,
    };
  }

  let hashedToken: string | undefined;
  try {
    const linkJson = JSON.parse(linkRes.body) as {
      properties?: { hashed_token?: string };
      hashed_token?: string;
    };
    hashedToken = linkJson.properties?.hashed_token ?? linkJson.hashed_token;
  } catch {
    /* ignore */
  }

  if (!hashedToken) {
    console.error("generate_link: missing hashed_token", linkRes.body);
    return { ok: false, error: "Could not complete sign-in", status: 500 };
  }

  // gotrue's /auth/v1/verify accepts type='recovery' with token_hash and
  // returns a normal session — exactly what we want.
  const verifyRes = await authServiceRolePost(supabaseUrl, serviceKey, "/auth/v1/verify", {
    type: "recovery",
    token_hash: hashedToken,
    gotrue_meta_security: {},
  });

  if (verifyRes.statusCode < 200 || verifyRes.statusCode >= 300) {
    console.error("verify:", verifyRes.statusCode, verifyRes.body);
    return {
      ok: false,
      error: authErrorMessage(verifyRes.body) || "Could not establish session",
      status: verifyRes.statusCode,
    };
  }

  let session: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    expires_at?: number;
    token_type?: string;
  };
  try {
    const verifyJson = JSON.parse(verifyRes.body) as {
      session?: typeof session;
      access_token?: string;
    };
    session = verifyJson.session ?? verifyJson;
  } catch {
    return { ok: false, error: "Could not establish session", status: 500 };
  }

  if (!session?.access_token || !session.refresh_token) {
    console.error("verify: no session in body", verifyRes.body);
    return { ok: false, error: "Could not establish session", status: 500 };
  }

  return {
    ok: true,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
  };
}
