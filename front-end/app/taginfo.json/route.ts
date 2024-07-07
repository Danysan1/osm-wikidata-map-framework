import { parseStringArrayConfig } from "@/src/config";
import { DEFAULT_LANGUAGE } from "@/src/i18n/common";
import { loadServerI18n } from "@/src/i18n/server";
import { readSourcePreset } from "@/src/SourcePreset/server";
import { NextResponse } from "next/server";

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
export async function GET() {
  const { t } = await loadServerI18n(DEFAULT_LANGUAGE);

  const contributingURL = process.env.owmf_contributing_url,
    sourcePresets = process.env.owmf_source_presets ? parseStringArrayConfig(process.env.owmf_source_presets) : undefined,
    sourcePreset = readSourcePreset(sourcePresets?.[0]);

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
    "data_url": process.env.owmf_home_url + "/taginfo.json",
    "project": {
      "name": t("title"),
      "description": t("description"),
      "project_url": process.env.owmf_home_url,
      "doc_url": contributingURL,
      "icon_url": process.env.owmf_home_url + "/favicon.ico",
      "contact_name": process.env.owmf_contact_name,
      "contact_email": process.env.owmf_contact_email,
    },
    "tags": tags,
  }, { status: 200 });
}
