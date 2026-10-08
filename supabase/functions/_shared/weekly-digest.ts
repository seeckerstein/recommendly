export interface DigestRecommendation {
  id: string;
  category_name: string;
  title: string | null;
  comment: string;
  owner_name: string;
}

export function groupDigestRecommendations(items: DigestRecommendation[]) {
  const groups = new Map<string, DigestRecommendation[]>();
  for (const item of items) {
    const group = groups.get(item.category_name) ?? [];
    group.push(item);
    groups.set(item.category_name, group);
  }
  return [...groups.entries()].filter(
    ([, recommendations]) => recommendations.length > 0,
  );
}

export function shouldSendWeeklyDigest(
  enabled: boolean,
  items: DigestRecommendation[],
) {
  return enabled && items.length > 0;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

export function renderWeeklyDigest(
  items: DigestRecommendation[],
  appUrl: string,
) {
  const groups = groupDigestRecommendations(items);
  const sections = groups
    .map(
      ([category, recommendations]) =>
        `<section style="margin:24px 0"><h2 style="font-size:18px;margin:0 0 10px">${escapeHtml(category)}</h2><ul style="padding-left:20px;margin:0">${recommendations
          .map((item) => {
            const title = item.title?.trim() || "Recommendation";
            const description = item.comment.trim();
            return `<li style="margin:0 0 14px"><strong>${escapeHtml(title)}</strong>${description ? `<p style="margin:4px 0;color:#555">${escapeHtml(description)}</p>` : ""}<p style="margin:4px 0;color:#777;font-size:13px">Recommended by ${escapeHtml(item.owner_name)}</p></li>`;
          })
          .join("")}</ul></section>`,
    )
    .join("");
  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:600px;margin:0 auto;padding:24px"><h1 style="font-size:24px;margin:0 0 8px">Your weekly recommendations</h1><p style="color:#555">Recommendations you can currently access on YOU'D LIKE.</p>${sections}<p style="margin-top:28px"><a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#222;color:#fff;text-decoration:none">Browse recommendations</a></p></div>`;
}
