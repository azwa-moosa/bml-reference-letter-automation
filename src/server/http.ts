/* Response for a protected image: private, never cached, no MIME sniffing. */
export function imageResponse(data: Uint8Array, mime: string) {
  return new Response(new Uint8Array(data), { headers: { "Content-Type": mime, "Cache-Control": "private, no-store", "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" } });
}
