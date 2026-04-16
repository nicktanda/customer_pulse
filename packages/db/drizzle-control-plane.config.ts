import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/control-plane-schema.ts",
  out: "./drizzle-control-plane",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.CONTROL_PLANE_DATABASE_URL ?? "postgres://localhost:5432/customer_pulse_control_plane",
  },
});
