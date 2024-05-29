<?php

/**
 * Generates the taginfo.json file for this OWMF-based project, ready to be used by OpenStreetMap Taginfo.
 * @see https://wiki.openstreetmap.org/wiki/Taginfo/Projects
 * @see https://wiki.openstreetmap.org/wiki/Taginfo
 */

declare(strict_types=1);
require_once(__DIR__ . "/funcs.php");

use \App\Config\IniEnvConfiguration;

$conf = new IniEnvConfiguration();

prepareJSON($conf);

$homeURL = (string)$conf->get("home_url");
$contributingURL = (string)$conf->get("contributing_url");
if ($conf->has("source_presets") && count($conf->getArray("source_presets")) == 1) {
    $presetID = $conf->getArray("source_presets")[0];
    $presetPath = __DIR__ . "./presets/$presetID.json";
    if (!file_exists($presetPath))
        throw new Exception("Preset file not found: $presetPath");

    $preset = json_decode(file_get_contents($presetPath), true);
    $filterTags = $preset["osm_filter_tags"];
    $textKey = $preset["osm_text_key"];
    $descriptionKey = $preset["osm_description_key"];
    $wikidataKeys = empty($preset["osm_wikidata_keys"]) ? [] : $conf->transformWikidataKeys($preset["osm_wikidata_keys"]);
    $wikidataProps = $preset["osm_wikidata_properties"];
    $wikidataIndirectProp = $preset["wikidata_indirect_property"];
    $noLinkedEntities = $presetID == "base";
} else {
    $filterTags = $conf->has("osm_filter_tags") ? $conf->getArray("osm_filter_tags") : null;
    $textKey = $conf->has("osm_text_key") ? (string)$conf->get("osm_text_key") : null;
    $descriptionKey = $conf->has("osm_description_key") ? (string)$conf->get("osm_description_key") : null;
    $wikidataKeys = $conf->has('osm_wikidata_keys') ? $conf->getWikidataKeys() : [];
    $wikidataProps = $conf->has("osm_wikidata_properties") ? $conf->getArray("osm_wikidata_properties") : [];
    $wikidataIndirectProp = $conf->has("wikidata_indirect_property") ? (string)$conf->get("wikidata_indirect_property") : null;
    $noLinkedEntities = !$conf->has("osm_wikidata_properties") && !$conf->has("wikidata_indirect_property") && !$conf->has("osm_wikidata_keys") && !$conf->has("osm_text_key");
}

$tags = [[
    "key" => "alt_name",
    "object_types" => ["node", "way", "relation", "area"],
    "doc_url" => $contributingURL,
    "description" => "The value of 'alt_name' is shown among the object's alternative names",
], [
    "key" => "official_name",
    "object_types" => ["node", "way", "relation", "area"],
    "doc_url" => $contributingURL,
    "description" => "The value of 'official_name' is shown among the object's alternative names",
], [
    "key" => "name",
    "object_types" => ["node", "way", "relation", "area"],
    "doc_url" => $contributingURL,
    "description" => "The value of 'name' is used to display the object's name",
], [
    "key" => "wikimedia_commons",
    "object_types" => ["node", "way", "relation", "area"],
    "doc_url" => $contributingURL,
    "description" => "The value of 'wikimedia_commons' is used to show the link to the object's Wikimedia Commons page alongside its details",
], [
    "key" => "wikipedia",
    "object_types" => ["node", "way", "relation", "area"],
    "doc_url" => $contributingURL,
    "description" => "The value of 'wikipedia' is used to show the link to the object's Wikipedia page alongside its details",
]];

if (!empty($textKey)) {
    $tags[] = [
        "key" => $textKey,
        "object_types" => ["node", "way", "relation", "area"],
        "doc_url" => $contributingURL,
        "description" => "The value of '$textKey' is used as textual detail information",
    ];
}

if (!empty($descriptionKey)) {
    $tags[] = [
        "key" => $descriptionKey,
        "object_types" => ["node", "way", "relation", "area"],
        "doc_url" => $contributingURL,
        "description" => "The value of '$descriptionKey' is used as textual detail information",
    ];
}

if (!empty($filterTags)) {
    $filterTagsStringList = implode(" or ", $filterTags);
    foreach ($filterTags as $filterTag) {
        $tagObj = [
            "object_types" => ["node", "way", "relation", "area"],
            "doc_url" => $contributingURL,
            "description" => "Elements are shown on the map only if they contain the tag $filterTagsStringList",
        ];

        $split = explode("=", (string)$filterTag);
        if (empty($split[0]))
            throw new Exception("Bad filter tags config: '$filterTag'");
        $tagObj["key"] = $split[0];
        if (!empty($split[1]) && $split[1] != "*")
            $tagObj["value"] = $split[1];

        $tags[] = $tagObj;
    }
}

if ($conf->getBool("propagate_data") && $conf->has("pmtiles_base_url")) {
    $tags[] = [
        "key" => "highway",
        "object_types" => ["way"],
        "doc_url" => $contributingURL,
        "description" => "The value of 'highway' is used to find roads to which details can be propagated",
    ];
}

foreach ($wikidataKeys as $key) {
    $tags[] = [
        "key" => $key,
        "object_types" => ["node", "way", "relation", "area"],
        "doc_url" => $contributingURL,
        "description" => "The Wikidata entities linked by '$key' are used to show details about the item",
    ];
}

if (!empty($wikidataProps)) {
    $propsString = implode(", ", $wikidataProps);
    $tags[] = [
        "key" => "wikidata",
        "object_types" => ["node", "way", "relation", "area"],
        "doc_url" => $contributingURL,
        "description" => "The value of 'wikidata' is used to gather details from relevant properties ($propsString) of the linked Wikidata entity",
    ];
}

if (!empty($wikidataIndirectProp)) {
    $tags[] = [
        "key" => "wikidata",
        "object_types" => ["node", "way", "relation", "area"],
        "doc_url" => $contributingURL,
        "description" => "The value of 'wikidata' is used to gather details from Wikidata entities that link to the same entity through the $wikidataProp property",
    ];
}

if ($noLinkedEntities) {
    $tags[] = [
        "key" => "wikidata",
        "object_types" => ["node", "way", "relation", "area"],
        "doc_url" => $contributingURL,
        "description" => "The value of 'wikidata' is used to gather details from the linked Wikidata entities",
    ];
}

$i18nOverride = $conf->getArray("i18n_override");
$defaultLanguage = "en"; // (string)$conf->get("default_language");
$defaultNamespace = "app";
if (empty($i18nOverride[$defaultLanguage][$defaultNamespace]) || !is_array($i18nOverride[$defaultLanguage][$defaultNamespace]))
    throw new Exception("Missing i18n configuration for the default language ($defaultLanguage)");
$i18nStrings = $i18nOverride[$defaultLanguage][$defaultNamespace];
if (empty($i18nStrings["title"]))
    throw new Exception("Missing title in i18n configuration");
if (empty($i18nStrings["description"]))
    throw new Exception("Missing description in i18n configuration");

echo json_encode([
    "data_format" => 1,
    "data_url" => getCurrentURL(),
    "project" => [
        "name" => $i18nStrings["title"],
        "description" => $i18nStrings["description"],
        "project_url" => $homeURL,
        "doc_url" => $contributingURL,
        "icon_url" => "$homeURL/favicon.ico",
        "contact_name" => (string)$conf->get("contact_name"),
        "contact_email" => (string)$conf->get("contact_email"),
    ],
    "tags" => $tags,
]);
