import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/envcheck")({
  server: {
    handlers: {
      GET: () =>
        Response.json({ hasKey: Boolean(process.env["LOVABLE_API_KEY"]) }),
    },
  },
});
