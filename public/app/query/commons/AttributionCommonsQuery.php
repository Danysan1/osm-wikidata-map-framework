<?php

namespace App\Query\Commons;

require_once(__DIR__ . "/../JSONCurlQuery.php");

use App\Query\JSONCurlQuery;
use Exception;

define("COMMONS_DEFAULT_ENDPOINT_URL", "https://commons.wikimedia.org/w/api.php");
//define("COMMONS_ATTRIBUTION_FIELD", "Credit");
define("COMMONS_ATTRIBUTION_FIELD", "Artist");

/**
 * @see https://www.mediawiki.org/wiki/API:Main_page
 * @see https://commons.wikimedia.org/w/api.php?action=help&modules=main
 * @see https://commons.wikimedia.org/wiki/Commons:Credit_line#Automatic_handling_of_attribution_by_reusers
 */
class AttributionCommonsQuery extends JSONCurlQuery
{
    public function __construct(array $titles, ?string $endpointURL = COMMONS_DEFAULT_ENDPOINT_URL)
    {
        parent::__construct([
            "action" => "query",
            "prop" => "imageinfo",
            "iiprop" => "extmetadata",
            "iiextmetadatafilter" => COMMONS_ATTRIBUTION_FIELD . "|LicenseShortName",
            "format" => "json",
            "titles" => implode("|", $titles),
        ], $endpointURL);
    }

    /**
     * @return array<array{picture:string,attribution:string}>
     */
    public function sendAndGetAttributions(): array
    {
        $result = $this->sendAndGetJSONResult();
        if (!$result->isSuccessful() || !$result->hasResult() || empty($result->getResult()))
            throw new Exception("Error while fetching Wikimedia Commons attributions");

        $resultData = $result->getJSONData();
        if (empty($resultData["query"]["pages"])) {
            error_log("sendAndGetAttributions: " . $result->getJSON());
            throw new Exception("sendAndGetAttributions: empty result");
        } else {
            $pages = $resultData["query"]["pages"];
        }
        $ret = array_reduce($pages, [self::class, "responseToAttributionsReducer"], []);

        return $ret;
    }

    /**
     * @param array<array{picture:string,attribution:string}> $returnArray
     * @param array $page
     * @return array<array{picture:string,attribution:string}>
     */
    private static function responseToAttributionsReducer(array $returnArray, array $page): array
    {
        $title = $page["title"];
        if (empty($page["imageinfo"])) {
            throw new Exception("responseToAttributionsReducer: missing image info in response");
        } elseif (!empty($page["imageinfo"][0]["extmetadata"])) {
            $metadata = $page["imageinfo"][0]["extmetadata"];

            $attributionString = "Wikimedia Commons";
            if (!empty($metadata["LicenseShortName"]["value"])) {
                $license = $metadata["LicenseShortName"]["value"];
                $attributionString .= ", $license";
            }
            if (!empty($metadata[COMMONS_ATTRIBUTION_FIELD]["value"])) {
                $fullAttribution = $metadata[COMMONS_ATTRIBUTION_FIELD]["value"];
                $trimmedAttribution = preg_replace('/<span style="display: none;">.*<\/span>/', '', $fullAttribution);
                //error_log("trimmedAttribution: '$title' => '$trimmedAttribution'");
                if (!empty($trimmedAttribution))
                    $attributionString .= ", $trimmedAttribution";
            }

            $returnArray[] = [
                "picture" => $title,
                "attribution" => $attributionString,
            ];
        }
        return $returnArray;
    }

    /**
     * @param array<string> $titles
     * @return array<array{picture:string,attribution:string}>
     */
    public static function splitTitlesInChunksAndGetAttributions(array $titles): array
    {
        $ret = [];
        $tot = sizeof($titles);
        if ($tot > 0) {
            for ($i = 0; $i < $tot; $i += 50) {
                $chunk = array_slice($titles, $i, 50);
                $query = new self($chunk);
                $attributions = $query->sendAndGetAttributions();
                $ret = array_merge($ret, $attributions);
            }
        }
        return $ret;
    }
}
