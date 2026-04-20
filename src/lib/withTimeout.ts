/**
 * Races a promise against a timer so slow or stuck network calls do not
 * leave the UI in an indefinite loading state (common on mobile Safari).
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "Request"
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
