import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  outputFileTracingIncludes: { "/*": ["./supabase/certs/*.crt"] },
};
export default nextConfig;
