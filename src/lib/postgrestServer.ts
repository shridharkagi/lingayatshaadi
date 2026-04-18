/**
 * Server-only PostgREST calls with IPv4-first DNS (avoids undici fetch + broken IPv6).
 */
import dns from "node:dns";
import https from "node:https";
import { URL } from "node:url";

/**
 * IPv4-first DNS for HTTPS. Node 20+ passes options.all === true to custom lookup; the callback
 * must use the array form `cb(null, [{ address, family }])` or Node throws ERR_INVALID_IP_ADDRESS.
 */
function ipv4Lookup(
  hostname: string,
  options:
    | dns.LookupOptions
    | number
    | undefined
    | ((err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void),
  callback?: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void
): void {
  let cb = callback;
  let opts: dns.LookupOptions = {};
  if (typeof options === "function") {
    cb = options;
  } else if (typeof options === "number") {
    opts = { family: options };
  } else if (options) {
    opts = options;
  }
  if (!cb) return;

  /** Node's typings require extra args even for `cb(err)`; narrow at call sites. */
  const done = cb as (
    err: NodeJS.ErrnoException | null,
    address?: string | dns.LookupAddress[],
    family?: number
  ) => void;

  const wantsAll = opts.all === true;
  dns.lookup(
    hostname,
    { hints: opts.hints, verbatim: opts.verbatim, family: 4 },
    (err, address, family) => {
      if (err) return done(err);
      if (typeof address !== "string") {
        return done(
          Object.assign(new Error("Unexpected DNS result"), { code: "EINVAL" }) as NodeJS.ErrnoException
        );
      }
      if (wantsAll) return done(null, [{ address, family }]);
      return done(null, address, family);
    }
  );
}

function httpsJsonRequest(
  method: string,
  supabaseUrl: string,
  serviceKey: string,
  pathWithQuery: string,
  body?: string,
  extraHeaders?: Record<string, string>
): Promise<{ statusCode: number; body: string }> {
  const base = new URL(supabaseUrl);
  const headers: Record<string, string> = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...extraHeaders,
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = String(Buffer.byteLength(body));
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: base.hostname,
        port: 443,
        path: pathWithQuery,
        method,
        lookup: ipv4Lookup,
        servername: base.hostname,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c as Buffer));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

/** Upsert one row (merge on conflict). Pass snake_case keys matching the table. */
export async function postgrestUpsert(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  onConflictColumn: string,
  row: Record<string, unknown>
): Promise<{ error: string | null }> {
  const path = `/rest/v1/${encodeURIComponent(table)}?on_conflict=${encodeURIComponent(onConflictColumn)}`;
  const payload = JSON.stringify(row);
  try {
    const { statusCode, body } = await httpsJsonRequest("POST", supabaseUrl, serviceKey, path, payload, {
      Prefer: "resolution=merge-duplicates",
    });
    if (statusCode >= 200 && statusCode < 300) return { error: null };
    return { error: body || `PostgREST ${statusCode}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg };
  }
}

/** GET ?column=eq.value&select=cols */
export async function postgrestSelectMaybeOne(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  filterColumn: string,
  filterValue: string,
  selectColumns: string
): Promise<{ row: Record<string, unknown> | null; error: string | null }> {
  const path = `/rest/v1/${encodeURIComponent(table)}?${encodeURIComponent(filterColumn)}=eq.${encodeURIComponent(
    filterValue
  )}&select=${encodeURIComponent(selectColumns)}`;
  try {
    const { statusCode, body } = await httpsJsonRequest("GET", supabaseUrl, serviceKey, path);
    if (statusCode >= 400) return { row: null, error: body || `PostgREST ${statusCode}` };
    const arr = JSON.parse(body) as Record<string, unknown>[];
    return { row: arr[0] ?? null, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { row: null, error: msg };
  }
}

export async function postgrestDeleteEq(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  column: string,
  value: string
): Promise<void> {
  const path = `/rest/v1/${encodeURIComponent(table)}?${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`;
  try {
    await httpsJsonRequest("DELETE", supabaseUrl, serviceKey, path);
  } catch {
    /* best effort */
  }
}

/** GoTrue / Supabase Auth HTTP API with IPv4-first DNS (avoids undici fetch issues). */
export async function authServiceRolePost(
  supabaseUrl: string,
  serviceKey: string,
  path: string,
  payload: Record<string, unknown>
): Promise<{ statusCode: number; body: string }> {
  const base = new URL(supabaseUrl);
  const data = JSON.stringify(payload);
  const headers: Record<string, string> = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "X-Supabase-Api-Version": "2024-01-01",
    "Content-Type": "application/json;charset=UTF-8",
    "Content-Length": String(Buffer.byteLength(data)),
  };
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: base.hostname,
        port: 443,
        path,
        method: "POST",
        lookup: ipv4Lookup,
        servername: base.hostname,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c as Buffer));
        res.on("end", () =>
          resolve({
            statusCode: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          })
        );
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}
