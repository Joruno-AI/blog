export const RSS_LAST_BUILD_DATE_TOKEN = "__RSS_LAST_BUILD_DATE__";

export function renderRssTemplate(template: string, generatedAt = new Date()) {
  if (Number.isNaN(generatedAt.valueOf())) {
    throw new RangeError("generatedAt must be a valid date");
  }
  const first = template.indexOf(RSS_LAST_BUILD_DATE_TOKEN);
  const last = template.lastIndexOf(RSS_LAST_BUILD_DATE_TOKEN);
  if (first < 0 || first !== last) {
    throw new Error("RSS template must contain exactly one lastBuildDate token");
  }
  return template.replace(RSS_LAST_BUILD_DATE_TOKEN, generatedAt.toUTCString());
}
