/** @type {import('next').NextConfig} */
const nextConfig = {
  // PDFKit and ExcelJS read files from disk at runtime, so they must not be bundled.
  serverExternalPackages: ["pdfkit", "exceljs"],
  // Make sure the PDF fonts and logo are shipped with standalone/serverless builds.
  outputFileTracingIncludes: {
    "/api/reports/[id]/pdf": ["./assets/fonts/**/*", "./public/logo.png"],
  },
  output: process.env.NEXT_OUTPUT_STANDALONE === "true" ? "standalone" : undefined,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
