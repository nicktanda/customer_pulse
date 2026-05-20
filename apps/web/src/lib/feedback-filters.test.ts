import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { buildFeedbackConditions } from "./feedback-filters";

const dialect = new PgDialect();

function renderSql(condition: SQL): string {
  return dialect.sqlToQuery(condition).sql;
}

describe("buildFeedbackConditions", () => {
  it("defaults to Inbox items with incomplete automation", () => {
    const query = renderSql(buildFeedbackConditions(123, {}));

    expect(query).toContain('"feedbacks"."project_id" = $1');
    expect(query).toContain('"feedbacks"."ai_processed_at" is null');
    expect(query).toContain('"feedbacks"."insight_processed_at" is null');
  });

  it("does not add the Inbox automation condition for all feedback", () => {
    const query = renderSql(buildFeedbackConditions(123, { view: "all" }));

    expect(query).toContain('"feedbacks"."project_id" = $1');
    expect(query).not.toContain('"feedbacks"."ai_processed_at" is null');
    expect(query).not.toContain('"feedbacks"."insight_processed_at" is null');
  });
});
