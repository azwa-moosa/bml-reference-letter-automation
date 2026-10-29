// Plain JavaScript so Next.js doesn't have to compile the config at every start.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

/** @type {import("next").NextConfig} */
const config = {
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "Content-Security-Policy", value: csp }, { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" }, { key: "Referrer-Policy", value: "same-origin" },
    ] }];
  },
};
export default config;
