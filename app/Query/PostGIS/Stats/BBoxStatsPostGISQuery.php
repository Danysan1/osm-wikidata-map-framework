<?php

declare(strict_types=1);

namespace App\Query\PostGIS\Stats;

use App\BoundingBox;
use App\Config\Wikidata\WikidataConfig;
use App\Query\BBoxJSONQuery;
use App\Query\PostGIS\BBoxTextPostGISQuery;
use App\Result\JSONQueryResult;
use App\ServerTiming;
use PDO;

abstract class BBoxStatsPostGISQuery extends BBoxTextPostGISQuery implements BBoxJSONQuery
{
    public function __construct(
        BoundingBox $bbox,
        PDO $db,
        WikidataConfig $wikidataConfig,
        string $defaultLanguage,
        ?string $language = null,
        ?ServerTiming $serverTiming = null,
        ?int $maxElements = null,
        ?string $source = null,
        ?string $search = null
    ) {
        parent::__construct(
            $bbox,
            $db,
            $wikidataConfig,
            $defaultLanguage,
            $language,
            $serverTiming,
            $maxElements,
            $source,
            $search,
            true,
            false
        );
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof JSONQueryResult)
            throw new \Exception("sendAndGetJSONResult(): can't get JSON result");
        return $out;
    }
}