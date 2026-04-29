declare module "next-pwa" {
  import type { NextConfig } from "next";

  type NextPwaOptions = {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    [key: string]: unknown;
  };

  export default function withPWA(options?: NextPwaOptions): (config: NextConfig) => NextConfig;
}
