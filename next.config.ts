import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["basic-ftp", "ssh2", "ssh2-sftp-client"],
};

export default nextConfig;
