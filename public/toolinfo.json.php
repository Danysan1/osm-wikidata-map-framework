<?php
/**
 * Generates the toolinfo.json file for this OWMF-based project, ready to be used by Hay's Wikimedia-related tool directory.
 * @see https://hay.toolforge.org/directory/
 */

declare(strict_types=1);
require_once(__DIR__ . "/funcs.php");

use \App\Config\IniEnvConfiguration;

$conf = new IniEnvConfiguration();

prepareJSON($conf);

$i18nOverride = $conf->getArray("i18n_override");
$defaultLanguage = "en"; // (string)$conf->get("default_language");
$defaultNamespace = "app";
if (empty($i18nOverride[$defaultLanguage][$defaultNamespace]))
    throw new Exception("Missing i18n configuration for the default language ($defaultLanguage)");
$i18nStrings = $i18nOverride[$defaultLanguage][$defaultNamespace];
if (empty($i18nStrings["title"]))
    throw new Exception("Missing title in i18n configuration");
if (empty($i18nStrings["description"]))
    throw new Exception("Missing description in i18n configuration");

echo json_encode([
    "name" => preg_replace('/\s+/', '_', strtolower($i18nStrings["title"])),
    "title" => $i18nStrings["title"],
    "description" => $i18nStrings["description"],
    "url" => (string)$conf->get("home_url"),
    "keywords" => (string)$conf->get("keywords"),
    "author" => (string)$conf->get("contact_name"),
    "repository" => "https://gitlab.com/openetymologymap/osm-wikidata-map-framework",
]);
