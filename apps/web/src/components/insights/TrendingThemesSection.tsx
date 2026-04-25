/**
 * "Trending Themes" section for the Insights page.
 *
 * This is a React Server Component — it runs on the server and queries the DB
 * directly. It renders:
 *   - A section heading + "Regenerate themes" button
 *   - A 3-column grid of theme cards (each links to ?theme=<id> peek drawer)
 *   - An empty state when no themes exist yet
 *
 * The section appears *below* the insights grid on /app/learn/insights.
 */

import { desc, eq, inArray } from "drizzle-orm";
import { getRequestDb } from "@/lib/db";
import { themes, insightThemes, insights } from "@customer-pulse/db/client";
import { ThemeCards, type ThemeCardRow } from "./ThemeCards";
import { RegenerateThemesButton } from "./RegenerateThemesButton";

/** Base URL path for the insights list, used to build ?theme= hrefs. */
function themeDetailHref(themeId: number, page?: number): string {
  const params = new URLSearchParams();
  if (page && page > 1) params.set("page", String(page));
  params.set("theme", String(themeId));
  return `/app/learn/insights?${params.toString()}`;
}

/**
 * Fetches up to 6 themes (by priority score) and their top 3 linked insight
 * titles, then renders the Trending Themes card grid.
 *
 * @param projectId       The current user's active project.
 * @param currentPage     The active pagination page — passed through so links keep
 *                        the user on the same page when opening the theme drawer.
 * @param selectedThemeId The currently open theme in the peek drawer (highlights the card).
 */
export async function TrendingThemesSection({
  projectId,
  currentPage,
  selectedThemeId = null,
}: {
  projectId: number;
  currentPage?: number;
  selectedThemeId?: number | null;
}) {
  const db = await getRequestDb();

  // Fetch the top 6 themes ranked by AI-computed priority score (0–100).
  const topThemes = await db
    .select({
      id: themes.id,
      name: themes.name,
      description: themes.description,
      priorityScore: themes.priorityScore,
      insightCount: themes.insightCount,
      affectedUsersEstimate: themes.affectedUsersEstimate,
      analyzedAt: themes.analyzedAt,
    })
    .from(themes)
    .where(eq(themes.projectId, projectId))
    .orderBy(desc(themes.priorityScore))
    .limit(6);

  if (topThemes.length === 0) {
    return (
      <section className="mt-5" aria-labelledby="trending-themes-heading">
        <div className="d-flex align-items-center justify-content-between gap-3 mb-3 flex-wrap">
          <h2 className="h5 mb-0" id="trending-themes-heading">
            Trending themes
          </h2>
          <RegenerateThemesButton />
        </div>
        <div className="card border-secondary-subtle">
          <div className="card-body py-4 text-body-secondary small">
            <p className="mb-1 fw-medium">No themes yet for this project.</p>
            <p className="mb-0">
              Themes are AI-generated weekly by grouping your insights into high-level patterns.
              Click <strong>Regenerate themes</strong> to run the analysis now (requires at least
              2 insights), or wait for the next scheduled run.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const themeIds = topThemes.map((t) => t.id);

  // Fetch all insight links for those themes in a single query, then group in JS.
  // We only need the title and theme association — no need to fetch full insight rows.
  const insightLinks = await db
    .select({
      themeId: insightThemes.themeId,
      title: insights.title,
      relevanceScore: insightThemes.relevanceScore,
    })
    .from(insightThemes)
    .innerJoin(insights, eq(insightThemes.insightId, insights.id))
    .where(inArray(insightThemes.themeId, themeIds))
    .orderBy(desc(insightThemes.relevanceScore));

  // Group insight titles by theme (keep top 3 per theme — already ordered by relevance).
  const topTitlesByTheme = new Map<number, string[]>();
  for (const link of insightLinks) {
    const arr = topTitlesByTheme.get(link.themeId) ?? [];
    if (arr.length < 3) arr.push(link.title);
    topTitlesByTheme.set(link.themeId, arr);
  }

  // Shape the data for the client ThemeCards component.
  const rows: ThemeCardRow[] = topThemes.map((t) => ({
    ...t,
    topInsightTitles: topTitlesByTheme.get(t.id) ?? [],
    detailHref: themeDetailHref(t.id, currentPage),
  }));

  return (
    <section className="mt-5" aria-labelledby="trending-themes-heading">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-3 flex-wrap">
        <div>
          <h2 className="h5 mb-0" id="trending-themes-heading">
            Trending themes
          </h2>
          <p className="small text-body-secondary mb-0 mt-1">
            AI-generated clusters grouping your insights into high-level patterns.
          </p>
        </div>
        <RegenerateThemesButton />
      </div>

      {/* row g-3 activates Bootstrap's grid so the col-md-4 cards sit three-per-row */}
      <ul className="row g-3 list-unstyled mb-0">
        <ThemeCards rows={rows} selectedId={selectedThemeId} />
      </ul>
    </section>
  );
}
