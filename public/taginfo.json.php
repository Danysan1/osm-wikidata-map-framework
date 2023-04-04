<?php

declare(strict_types=1);
require_once(__DIR__ . "/funcs.php");

use \App\Config\IniEnvConfiguration;

$conf = new IniEnvConfiguration();

prepareJSON($conf);

$thisURL = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
$homeURL = (string)$conf->get("home_url");
$contributingURL = (string)$conf->get("contributing_url");
$textKey = (string)$conf->get("osm_text_key");
$descriptionKey = (string)$conf->get("osm_description_key");
$filterKey = (string)$conf->get("osm_filter_key");

$tags = [[
    "key" => "alt_name",
    "object_types" => ["node", "way", "relation", "area"],
    "doc_url" => $contributingURL,
    "description" => "The value of 'alt_name' is used to display the object's name alongside its details",
], [
    "key" => "name",
    "object_types" => ["node", "way", "relation", "area"],
    "doc_url" => $contributingURL,
    "description" => "The value of 'name' is used to display the object's name alongside its details",
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
], [
    "key" => $textKey,
    "object_types" => ["node", "way", "relation", "area"],
    "doc_url" => $contributingURL,
    "description" => "The value of '$textKey' is used as textual detail information",
], [
    "key" => $descriptionKey,
    "object_types" => ["node", "way", "relation", "area"],
    "doc_url" => $contributingURL,
    "description" => "The value of '$descriptionKey' is used as textual detail information",
], [
    "key" => $filterKey,
    "object_types" => ["node", "way", "relation", "area"],
    "doc_url" => $contributingURL,
    "description" => "Elements are shown on the map only if '$filterKey' is present among their tags",
]];

if ($conf->getBool("db_enable") && $conf->getBool("propagate_data")) {
    $tags[] = [
        "key" => "highway",
        "object_types" => ["way"],
        "doc_url" => $contributingURL,
        "description" => "The value of 'highway' is used to find roads to which details can be propagated",
    ];
}

foreach ($conf->getWikidataKeys() as $key) {
    $tags[] = [
        "key" => $key,
        "object_types" => ["node", "way", "relation", "area"],
        "doc_url" => $contributingURL,
        "description" => "The Wikidata entity/entities linked by '$key' is/are used to show details about the item",
    ];
}

if($conf->has("osm_wikidata_properties")) {
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

echo json_encode([
    "data_format" => 1,
    "data_url" => $thisURL,
    "project" => [
        "name" => (string)$conf->get("info_title"),
        "description" => (string)$conf->get("info_description"),
        "project_url" => $homeURL,
        "doc_url" => $contributingURL,
        "icon_url" => "$homeURL/favicon.ico",
        "contact_name" => (string)$conf->get("contact_name"),
        "contact_email" => (string)$conf->get("contact_email"),
    ],
    "tags" => $tags,
]);
