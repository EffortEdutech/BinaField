// Spike endpoint (ADR-0003 spikes 2 and 3). Receives bytes, returns their SHA-256 and size. Stores nothing.
export async function POST(request: Request) {
  const buf = await request.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return Response.json({ sha256, size: buf.byteLength });
}
