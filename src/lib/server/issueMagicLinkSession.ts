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
 * Issues access + refresh tokens by exchanging a one-time magic link for the given auth email.
 * Same pattern as phone OTP verify (login path for existing users).
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
    type: "magiclink",
    email,
  });

  if (linkRes.statusCode < 200 || linkRes.statusCode >= 300) {
    console.error("generate_link:", linkRes.statusCode, linkRes.body);
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

  const verifyRes = await authServiceRolePost(supabaseUrl, serviceKey, "/auth/v1/verify", {
    type: "email",
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
