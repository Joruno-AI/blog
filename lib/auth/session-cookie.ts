export async function verifySignedSessionToken(value: string, secret: string) {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Cookie parsers may already have decoded the value.
  }
  const signaturePosition = decoded.lastIndexOf(".");
  if (signaturePosition < 1) return null;
  const token = decoded.slice(0, signaturePosition);
  const signatureText = decoded.slice(signaturePosition + 1);
  if (signatureText.length !== 44 || !signatureText.endsWith("=")) return null;

  try {
    const signatureString = atob(signatureText);
    const signature = Uint8Array.from(signatureString, (character) =>
      character.charCodeAt(0)
    );
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(token)
    );
    return valid ? token : null;
  } catch {
    return null;
  }
}
