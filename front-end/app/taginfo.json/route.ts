import { parseStringArrayConfig } from "@/src/config";
import { DEFAULT_LANGUAGE, MAIN_NAMESPACE } from "@/src/i18n";
import { SourcePreset } from "@/src/model/SourcePreset";
import { getCustomSourcePreset } from "@/src/services/PresetService";
import { existsSync, readFileSync } from "fs";
import type { Resource } from "i18next";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";

interface TagInfoTag {
  key: string;
  value?: string;
  object_types: string[];
  doc_url?: string;
  description: string;
}

/**
 * Generates the taginfo.json file for this OWMF-based project, ready to be used by OpenStreetMap Taginfo.
 * @see https://wiki.openstreetmap.org/wiki/Taginfo/Projects
 * @see https://wiki.openstreetmap.org/wiki/Taginfo
 */
export function GET(request: NextRequest) {
  const rawI18nOverride = process.env.owmf_i18n_override ? JSON.parse(process.env.owmf_i18n_override) as unknown : undefined,
    i18nOverride = rawI18nOverride && typeof rawI18nOverride === 'object' ? rawI18nOverride as Resource : undefined,
    i18nStrings = i18nOverride?.[DEFAULT_LANGUAGE]?.[MAIN_NAMESPACE];

  if (typeof i18nStrings !== "object")
    return NextResponse.json({ error: "Missing i18n configuration for the default language", DEFAULT_LANGUAGE, MAIN_NAMESPACE }, { status: 500 });

  const title = i18nStrings.title as unknown,
    description = i18nStrings.description as unknown;
  if (typeof title !== "string")
    return NextResponse.json({ error: "Missing title in i18n configuration for the default language" }, { status: 500 });
  if (typeof description !== "string")
    return NextResponse.json({ error: "Missing description in i18n configuration for the default language" }, { status: 500 });

  const contributingURL = process.env.owmf_contributing_url,
    sourcePresets = parseStringArrayConfig(process.env.owmf_source_presets);
  let sourcePreset: SourcePreset | undefined;
  if (!sourcePresets?.length) {
    sourcePreset = getCustomSourcePreset();
  } else {
    if (sourcePresets?.length !== 1)
      console.warn("Multiple source presets not supported yet");

    const presetID = sourcePresets[0],
      presetPath = join(process.cwd(), "public", "presets", presetID + ".json");
    if (!existsSync(presetPath))
      throw new Error("Preset file not found: " + presetPath);

    const presetContent = readFileSync(presetPath, "utf8"),
      presetObj: unknown = JSON.parse(presetContent);
    if (!presetObj || typeof presetObj !== "object")
      throw new Error("Invalid preset object found in " + presetPath);
    sourcePreset = { id: presetID, ...presetObj };
  }

  const tags: TagInfoTag[] = [{
    "key": "alt_name",
    "object_types": ["node", "way", "relation", "area"],
    "doc_url": contributingURL,
    "description": "The value of 'alt_name' is shown among the object's alternative names",
  }, {
    "key": "official_name",
    "object_types": ["node", "way", "relation", "area"],
    "doc_url": contributingURL,
    "description": "The value of 'official_name' is shown among the object's alternative names",
  }, {
    "key": "name",
    "object_types": ["node", "way", "relation", "area"],
    "doc_url": contributingURL,
    "description": "The value of 'name' is used to display the object's name",
  }, {
    "key": "wikimedia_commons",
    "object_types": ["node", "way", "relation", "area"],
    "doc_url": contributingURL,
    "description": "The value of 'wikimedia_commons' is used to show the link to the object's Wikimedia Commons page alongside its details",
  }, {
    "key": "wikipedia",
    "object_types": ["node", "way", "relation", "area"],
    "doc_url": contributingURL,
    "description": "The value of 'wikipedia' is used to show the link to the object's Wikipedia page alongside its details",
  }];

  if (sourcePreset.osm_text_key) {
    tags.push({
      "key": sourcePreset.osm_text_key,
      "object_types": ["node", "way", "relation", "area"],
      "doc_url": contributingURL,
      "description": "The value of '$textKey' is used as textual detail information",
    });
  }

  if (sourcePreset.osm_description_key) {
    tags.push({
      "key": sourcePreset.osm_description_key,
      "object_types": ["node", "way", "relation", "area"],
      "doc_url": contributingURL,
      "description": "The value of '$descriptionKey' is used as textual detail information",
    });
  }

  if (sourcePreset.osm_filter_tags?.length) {
    const filterTagsStringList = sourcePreset.osm_filter_tags.join(" or ");
    sourcePreset.osm_filter_tags.forEach(filterTag => {
      const split = filterTag.split("=");
      if (!split[0].length)
        throw new Error("Bad filter tags config: " + filterTag);
      tags.push({
        "key": split[0],
        "value": split[1] && split[1] !== "*" ? split[1] : undefined,
        "object_types": ["node", "way", "relation", "area"],
        "doc_url": contributingURL,
        "description": "Elements are shown on the map only if they contain the tag " + filterTagsStringList,
      });
    });
  }

  if (process.env.owmf_pmtiles_base_url) {
    tags.push({
      "key": "highway",
      "object_types": ["way"],
      "doc_url": contributingURL,
      "description": "The value of 'highway' is used to find roads to which details can be propagated",
    });
  }

  sourcePreset.osm_wikidata_keys?.forEach(key => {
    tags.push({
      "key": key,
      "object_types": ["node", "way", "relation", "area"],
      "doc_url": contributingURL,
      "description": "The Wikidata entities linked by '$key' are used to show details about the item",
    });
  });

  if (sourcePreset.osm_wikidata_properties?.length) {
    const propsString = sourcePreset.osm_wikidata_properties.join(", ");
    tags.push({
      "key": "wikidata",
      "object_types": ["node", "way", "relation", "area"],
      "doc_url": contributingURL,
      "description": `The value of 'wikidata' is used to gather details from relevant properties (${propsString}) of the linked Wikidata entity`,
    });
  }

  if (sourcePreset.wikidata_indirect_property) {
    tags.push({
      "key": "wikidata",
      "object_types": ["node", "way", "relation", "area"],
      "doc_url": contributingURL,
      "description": "The value of 'wikidata' is used to gather details from Wikidata entities that link to the same entity through the $wikidataProp property",
    });
  }

  if (sourcePreset?.id === "base") {
    tags.push({
      "key": "wikidata",
      "object_types": ["node", "way", "relation", "area"],
      "doc_url": contributingURL,
      "description": "The value of 'wikidata' is used to gather details from the linked Wikidata entities",
    });
  }

  return NextResponse.json({
    "data_format": 1,
    "data_url": request.url,
    "project": {
      "name": title,
      "description": description,
      "project_url": process.env.owmf_home_url,
      "doc_url": contributingURL,
      "icon_url": process.env.owmf_home_url + "/favicon.ico",
      "contact_name": process.env.owmf_contact_name,
      "contact_email": process.env.owmf_contact_email,
    },
    "tags": tags,
  }, { status: 200 });
}
