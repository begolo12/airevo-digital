import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["node_modules", ".next"],
    // Test tidak boleh menyentuh .data/store.json milik aplikasi.
    env: {
      AIREVO_PERSIST: "0",
      /*
       * Test tidak boleh menyentuh database sungguhan.
       *
       * `.env.local` kini berisi DATABASE_URL ke Neon production. Tanpa
       * pengosongan ini, satu test yang lupa memakai store tiruan bisa
       * menghapus atau menimpa data pengguna yang sebenarnya.
       */
      DATABASE_URL: "",
      DATABASE_URL_UNPOOLED: "",
      NEON_AUTH_BASE_URL: "",
      NEON_AUTH_JWKS_URL: "",
      AWS_ACCESS_KEY_ID: "",
      AWS_SECRET_ACCESS_KEY: "",
      AWS_ENDPOINT_URL_S3: "",
    },
    /*
     * Batas waktu dinaikkan dari 5 detik bawaan.
     *
     * Beberapa test memakai scrypt (hash kata sandi/PIN) yang memang lambat,
     * dan suite ini sering dijalankan bersamaan dengan dev server. Pada beban
     * tinggi, test yang sebenarnya benar bisa melewati 5 detik dan gagal
     * sekilas — kegagalan yang menyesatkan.
     */
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` hanya bermakna di bundler Next; di test cukup kosong.
      "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
      // `revalidatePath` butuh konteks request Next; di test dijadikan no-op.
      "next/cache": path.resolve(__dirname, "./tests/stubs/next-cache.ts"),
    },
  },
});
