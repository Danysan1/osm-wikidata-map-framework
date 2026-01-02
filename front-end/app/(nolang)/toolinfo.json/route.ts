export const dynamic = "force-static";

import { loadServerI18n } from "@/src/i18n/server";
import { NextResponse } from "next/server";

/**
 * Generates the toolinfo.json file for this OWMF-based project, ready to be used by Hay's Wikimedia-related tool directory.
 * @see https://hay.toolforge.org/directory/
 */
export async function GET() {
  const { t } = await loadServerI18n(),
    title = t("title"),
    description = t("description");

  return NextResponse.json({
    "name": title.toLowerCase().replaceAll(/\s+/g, '_'),
    "title": title,
    "description": description,
    "url": process.env.owmf_home_url,
    "keywords": process.env.owmf_keywords,
    "author": process.env.owmf_contact_name,
    "repository": "https://gitlab.com/openetymologymap/osm-wikidata-map-framework",
  }, { status: 200 });
}
