import { DEFAULT_LANGUAGE, MAIN_NAMESPACE } from "@/src/i18n";
import type { Resource } from "i18next";
import { NextResponse } from "next/server";

/**
 * Generates the toolinfo.json file for this OWMF-based project, ready to be used by Hay's Wikimedia-related tool directory.
 * @see https://hay.toolforge.org/directory/
 */
export function GET() {
  const rawI18nOverride = process.env.owmf_i18n_override ? JSON.parse(process.env.owmf_i18n_override) as unknown : undefined,
    i18nOverride = rawI18nOverride && typeof rawI18nOverride === 'object' ? rawI18nOverride as Resource : undefined,
    i18nStrings = i18nOverride?.[DEFAULT_LANGUAGE]?.[MAIN_NAMESPACE];

  if (typeof i18nStrings !== "object")
    throw new Error(`Missing i18n configuration for the default language (${DEFAULT_LANGUAGE})`);

  const title = i18nStrings.title as unknown,
    description = i18nStrings.description as unknown;
  if (typeof title !== "string")
    throw new Error("Missing title in i18n configuration");
  if (typeof description !== "string")
    throw new Error("Missing description in i18n configuration");

  return NextResponse.json({
    "name": title.toLowerCase().replaceAll(/\s+/, '_'),
    "title": title,
    "description": description,
    "url": process.env.owmf_home_url,
    "keywords": process.env.owmf_keywords,
    "author": process.env.owmf_contact_name,
    "repository": "https://gitlab.com/openetymologymap/osm-wikidata-map-framework",
  }, { status: 200 });
}
