<?php
function getOverpassEndpoint(): string
{
    $possibleEndpoints = [ // https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
        "http://overpass-api.de/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
        "https://z.overpass-api.de/api/interpreter",
        "https://overpass.openstreetmap.ru/api/interpreter",
        //"https://overpass.openstreetmap.fr/api/interpreter", // From the wiki "don't exceed 1000 queries per day", so not available
        "https://overpass.kumi.systems/api/interpreter",
    ];
    return $possibleEndpoints[array_rand($possibleEndpoints)];
}

$geoJSONData = [
    "type" => "FeatureCollection",
    "features" => []
];

define('LATITUDE_INCREMENT', 2);
define('LONGITUDINE_INCREMENT', 2);
define('MAX_TRIES', 5);
$startLat = isset($argv[1]) ? (float)$argv[1] : -90;
$startLon = isset($argv[2]) ? (float)$argv[2] : -180;
$endLat = isset($argv[3]) ? (float)$argv[3] : 90;
$endLon = isset($argv[4]) ? (float)$argv[4] : 180;
$totalRequests = (($endLat - $startLat) / LATITUDE_INCREMENT) * (($endLon - $startLon) / LONGITUDINE_INCREMENT);
$requestCount = 0;
for ($minLat = $startLat; $minLat < $endLat; $minLat += LATITUDE_INCREMENT) {
    for ($minLon = $startLon; $minLon < $endLon; $minLon += LONGITUDINE_INCREMENT) {
        $requestCount += 1;
        $maxLat = $minLat + LATITUDE_INCREMENT;
        $maxLon = $minLon + LONGITUDINE_INCREMENT;
        $bbox = "$minLat,$minLon,$maxLat,$maxLon";
        echo "$requestCount/$totalRequests\t| Preparing $bbox... ";
        $response = false;
        for ($try = 0; $try < MAX_TRIES && $response == false; $try++) {
            try {
                sleep($try * (int)exp($try)); // exponential back-off
                $query = "[out:csv(::count; false)];
                    (
                        nwr['name:etymology:wikidata']($bbox);
                        nwr['subject:wikidata']($bbox);
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
                } elseif (intval(trim($response)) > 0) {
                    $geoJSONData["features"][] = [
                        "type" => "Feature",
                        "geometry" => [
                            "type" => "Point",
                            "coordinates" => [
                                $minLon + LONGITUDINE_INCREMENT / 2,
                                $minLat + LATITUDE_INCREMENT / 2
                            ],
                        ],
                        "properties" => [
                            "ety_count" => intval(trim($response))
                        ]
                    ];
                }
                echo "done: " . trim($response) . PHP_EOL;
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
if (!file_put_contents("web/global-map.geojson", json_encode($geoJSONData)))
    echo json_encode($geoJSONData);
