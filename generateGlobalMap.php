<?php
function getOverpassEndpoint(): string
{
    try {
        /**
         * @var array<string>
         */
        $possibleEndpoints = (array)parse_ini_file("open-etymology-map.template.ini")["overpass-endpoints"];
        return $possibleEndpoints[array_rand($possibleEndpoints)];
    } catch (Exception $e) {
        return 'https://overpass-api.de/api/interpreter';
    }
}

function saveResult($data)
{
    file_put_contents("web/open-etymology-map-cache/global-map.geojson", json_encode($data));
}

$geoJSONData = [
    "type" => "FeatureCollection",
    "features" => []
];

define('LATITUDE_INCREMENT', 2);
define('LONGITUDINE_INCREMENT', 4);
define('MAX_TRIES', 5);
$startLat = isset($argv[1]) ? (float)$argv[1] : -90;
$startLon = isset($argv[2]) ? (float)$argv[2] : -180;
$endLat = isset($argv[3]) ? (float)$argv[3] : 90;
$endLon = isset($argv[4]) ? (float)$argv[4] : 180;
for ($minLat = $startLat; $minLat < $endLat; $minLat += LATITUDE_INCREMENT) {
    for ($minLon = $startLon; $minLon < $endLon; $minLon += LONGITUDINE_INCREMENT) {
        $maxLat = $minLat + LATITUDE_INCREMENT;
        $maxLon = $minLon + LONGITUDINE_INCREMENT;
        $bbox = "$minLat,$minLon,$maxLat,$maxLon";
        echo "Preparing $bbox... ";
        $response = false;
        for ($try = 0; $try < MAX_TRIES && $response == false; $try++) {
            try {
                sleep($try * exp($try));
                $query = "[out:csv(::count; false)];
                    (
                        node['name:etymology:wikidata']($bbox);
                        way['name:etymology:wikidata']($bbox);
                        relation['name:etymology:wikidata']($bbox);
                    );
                    out count;";
                $url = getOverpassEndpoint() . '?data=' . urlencode($query);
                echo 'executing... ';
                $response = file_get_contents($url);
                echo 'parsing... ';
                if ($response === false) {
                    throw new Exception("Call failed");
                } elseif (trim($response) === "") {
                    throw new Exception("Empty result");
                }
                $geoJSONData["features"][] = [
                    "type" => "Feature",
                    "geometry" => [
                        "type" => "Point",
                        "coordinates" => [
                            $minLat + LATITUDE_INCREMENT / 2,
                            $minLon + LONGITUDINE_INCREMENT / 2
                        ],
                    ],
                    "properties" => [
                        "etymology_count" => intval($response)
                    ]
                ];
                echo "done." . PHP_EOL;
            } catch (Exception $e) {
                if ($try < MAX_TRIES - 1) {
                    echo $e->getMessage() . ", retrying... ";
                } else {
                    echo $e->getMessage() . ", not trying anymore." . PHP_EOL;
                }
            }
        }
    }
}
saveResult($geoJSONData);
