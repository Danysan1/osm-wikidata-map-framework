<?php
require_once("./vendor/autoload.php");

function getOverpassEndpoint(): string
{
    try {
        $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
        $dotenv->load();

        $rawEndpoints = $_ENV["overpass_endpoints"];
        if (empty($rawEndpoints))
            throw new Exception("Empty overpass_endpoints");
        /**
         * @var array<string>
         */
        $endpoints = json_decode((string)$rawEndpoints);
        return (is_array($endpoints) ? $endpoints[array_rand($endpoints)] : $endpoints)."/interpreter";
    } catch (Exception $e) {
        echo "Non fatal error: " . $e . PHP_EOL;
        return 'https://overpass-api.de/api/interpreter';
    }
}

if (empty($argv[1])) {
    echo "Please provide the query type as the first argument." . PHP_EOL;
    exit(1);
}
$inputString = $argv[1];

if (empty($argv[2])) {
    echo "Please provide the query name as the second argument." . PHP_EOL;
    exit(2);
}

switch (strtolower($inputString)) {
    case "sophox":
        /*
        https://wiki.openstreetmap.org/wiki/Sophox
        https://sophox.org/
        */
        $baseURL = 'https://sophox.org/sparql?query=';
        $folder = "sophox";
        $inputExtension = "rq";
        $outputExtension = "xml";
        break;

    case "wikidata":
    case "wikidata-xml":
    case "wdx":
        /*
        https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual#SPARQL_endpoint
        */
        $baseURL = 'https://query.wikidata.org/sparql?format=xml&query=';
        $folder = "wikidata";
        $inputExtension = "rq";
        $outputExtension = "xml";
        break;

    case "wikidata-json":
    case "wdj":
        /*
        https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual#SPARQL_endpoint
        */
        $baseURL = 'https://query.wikidata.org/sparql?format=json&query=';
        $folder = "wikidata";
        $inputExtension = "rq";
        $outputExtension = "json";
        break;

    case "overpassql":
    case "opq":
        /* 
        https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
        https://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide
        https://wiki.openstreetmap.org/wiki/Overpass_turbo/Extended_Overpass_Turbo_Queries
        */
        $baseURL = getOverpassEndpoint() . "?data=";
        $folder = "overpassql";
        $inputExtension = "overpassql";
        $outputExtension = "json";
        break;

    case "overpassxml":
    case "opx":
        /*
        https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
        https://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide
        */
        $baseURL = getOverpassEndpoint() . "?data=";
        $folder = "overpassxml";
        $inputExtension = "xml";
        $outputExtension = "json";
        break;

    default:
        echo "Please provide a VALID string as the first argument." . PHP_EOL;
        exit(3);
}

$ret = 0;
for ($i = 2; $i < $argc; $i++) {
    if (empty($argv[$i])) {
        echo "Invalid query name." . PHP_EOL;
        exit(2);
    }
    $inputNumber = $argv[$i];

    $fileName = "samples/$folder/$inputNumber.$inputExtension";
    if (!file_exists($fileName)) {
        echo "File $fileName does not exist." . PHP_EOL;
        exit(4);
    }
    $query = file_get_contents($fileName);
    if ($inputExtension == "rq") {
        $query = preg_replace('/(^\s+)|(\s*#[\/\s\w\(\),\']+$)/m', "", $query);
    } elseif ($inputExtension == "overpass" && strpos($query, "out:csv") !== false) {
        $outputExtension = "csv";
    }

    //$queryString = http_build_query(["query"=>$query]);
    //$url = "$baseURL?$queryString";
    $url = $baseURL . urlencode($query);
    //echo "Querying $url".PHP_EOL;

    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERAGENT => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36",
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_SSL_VERIFYPEER => 0
    ]);

    echo "Calling $baseURL..." . PHP_EOL;
    $responseBody = curl_exec($curl);

    if ($responseBody === false) {
        echo "Call failure." . PHP_EOL;

        $curlError = curl_error($curl);
        echo "Error: $curlError" . PHP_EOL;

        $ret = 5;
    } else {
        $httpCode = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        echo "HTTP code: $httpCode" . PHP_EOL;

        if ($httpCode == 200) {
            echo "Call successful." . PHP_EOL;
            $outFileName = "samples/$folder/$inputNumber-output.$outputExtension";
            file_put_contents($outFileName, $responseBody);
            echo "Output written to $outFileName" . PHP_EOL;
            $ret = 0;
        } else {
            echo "Call failed." . PHP_EOL;
            echo "Response body:\n$responseBody" . PHP_EOL;
            $ret = 6;
        }

        $timeTaken = curl_getinfo($curl, CURLINFO_TOTAL_TIME);
        echo "Time taken: $timeTaken s" . PHP_EOL;
    }

    curl_close($curl);
}
exit($ret);
