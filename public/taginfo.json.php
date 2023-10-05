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
$filterTags = $conf->has("osm_filter_tags") ? $conf->getArray("osm_filter_tags") : null;

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

if ($conf->has('osm_text_key')) {
    $textKey = (string)$conf->get('osm_text_key');
    $tags[] = [
        "key" => $textKey,
        "object_types" => ["node", "way", "relation", "area"],
        "doc_url" => $contributingURL,
        "description" => "The value of '$textKey' is used as textual detail information",
    ];
}

if ($conf->has('osm_description_key')) {
    $descriptionKey = (string)$conf->get('osm_description_key');
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

if ($conf->getBool("db_enable") && $conf->getBool("propagate_data")) {
    $tags[] = [
        "key" => "highway",
        "object_types" => ["way"],
        "doc_url" => $contributingURL,
        "description" => "The value of 'highway' is used to find roads to which details can be propagated",
    ];
}

if ($conf->has('osm_wikidata_keys')) {
    foreach ($conf->getWikidataKeys() as $key) {
        $tags[] = [
            "key" => $key,
            "object_types" => ["node", "way", "relation", "area"],
            "doc_url" => $contributingURL,
            "description" => "The Wikidata entities linked by '$key' are used to show details about the item",
        ];
    }
}

if ($conf->has("osm_wikidata_properties")) {
    $wikidataProps = $conf->getArray("osm_wikidata_properties");
    if (!empty($wikidataProps)) {
        $propsString = implode(", ", $wikidataProps);
        $tags[] = [
            "key" => "wikidata",
            "object_types" => ["node", "way", "relation", "area"],
            "doc_url" => $contributingURL,
            "description" => "The value of 'wikidata' is used to gather details from relevant properties ($propsString) of the linked Wikidata entity",
        ];
    }
}

if ($conf->has("wikidata_indirect_property")) {
    $wikidataProp = (string)$conf->get("wikidata_indirect_property");
    $tags[] = [
        "key" => "wikidata",
        "object_types" => ["node", "way", "relation", "area"],
        "doc_url" => $contributingURL,
        "description" => "The value of 'wikidata' is used to gather details from Wikidata entities that link to the same entity through the $wikidataProp property",
    ];
}

if (!$conf->has("osm_wikidata_properties") && !$conf->has("wikidata_indirect_property") && !$conf->has("osm_wikidata_keys") && !$conf->has("osm_text_key")) {
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
