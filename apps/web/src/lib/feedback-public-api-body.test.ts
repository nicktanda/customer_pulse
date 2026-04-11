import { describe, expect, it } from "vitest";
import { publicFeedbackIngestBodySchema } from "./feedback-public-api-body";

/**
 * Contract tests for the public feedback API JSON body.
 * If you change the schema, update the route handler comment and any customer docs.
 */
describe("publicFeedbackIngestBodySchema", () => {
  it("requires content", () => {
    const bad = publicFeedbackIngestBodySchema.safeParse({ title: "x" });
    expect(bad.success).toBe(false);
  });

  it("accepts minimal valid payload", () => {
    const ok = publicFeedbackIngestBodySchema.safeParse({ content: "Hello from API" });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.content).toBe("Hello from API");
    }
  });

  it("accepts optional fields used by integrations", () => {
    const ok = publicFeedbackIngestBodySchema.safeParse({
      content: "c",
      title: "t",
      author_name: "Ada",
      author_email: "ada@example.com",
      category: "bug",
      priority: "p2",
      external_id: "ext-1",
      raw_data: { source: "zendesk" },
    });
    expect(ok.success).toBe(true);
  });

  it("allows numeric category and priority (enum ints)", () => {
    const ok = publicFeedbackIngestBodySchema.safeParse({
      content: "c",
      category: 1,
      priority: 2,
    });
    expect(ok.success).toBe(true);
  });
});
