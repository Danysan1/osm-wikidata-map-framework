<?php
if (empty($argv[1])) {
    echo "Please provide a string as the first argument.\n";
    exit(1);
}
$inputString = $argv[1];

if (empty($argv[2]) || !is_numeric($argv[2])) {
    echo "Please provide a number as the second argument.\n";
    exit(2);
}

if (strtolower($inputString) == "sophox") {
    /*
    https://wiki.openstreetmap.org/wiki/Sophox
    https://sophox.org/
    */
    $baseURL = 'https://sophox.org/sparql?query=';
    $folder = "sophox";
    $inputExtension = "rq";
    $outputExtension = "xml";
} elseif (strtolower($inputString) == "wikidata") {
    /*
    https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual#SPARQL_endpoint
    */
    $baseURL = 'https://query.wikidata.org/sparql?query=';
    $folder = "wikidata";
    $inputExtension = "rq";
    $outputExtension = "xml";
} elseif (strtolower($inputString) == "overpassql") {
    /* 
    https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
    https://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide
    https://wiki.openstreetmap.org/wiki/Overpass_turbo/Extended_Overpass_Turbo_Queries
    */
    $baseURL = 'https://overpass-api.de/api/interpreter?data=';
    $folder = "overpassql";
    $inputExtension = "overpass";
    $outputExtension = "json";
} elseif (strtolower($inputString) == "overpassxml") {
    /*
    https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
    https://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide
    */
    $baseURL = 'https://overpass-api.de/api/interpreter?data=';
    $folder = "overpassxml";
    $inputExtension = "xml";
    $outputExtension = "json";
} else {
    echo "Please provide a VALID string as the first argument.\n";
    exit(3);
}

$ret = 0;
for ($i = 2; $i < $argc; $i++) {
    if (empty($argv[$i]) || !is_numeric($argv[$i])) {
        echo "Invalid number argument.\n";
        exit(2);
    }
    $inputNumber = (int)$argv[$i];

    $fileName = "samples/$folder/$inputNumber.$inputExtension";
    if (!file_exists($fileName)) {
        echo "File $fileName does not exist.\n";
        exit(4);
    }
    $query = file_get_contents($fileName);
    if ($inputExtension == "rq") {
        $query = preg_replace('/(^\s+)|(\s*#[\/\s\w\(\),\']+$)/m', "", $query);
    }

    //$queryString = http_build_query(["query"=>$query]);
    //$url = "$baseURL?$queryString";
    $url = $baseURL . urlencode($query);
    //echo "Querying $url\n";

    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERAGENT => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36",
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_SSL_VERIFYPEER => 0
    ]);

    $responseBody = curl_exec($curl);

    if ($responseBody === false) {
        echo "Call failure.\n";

        $curlError = curl_error($curl);
        echo "Error: $curlError\n";

        $ret = 5;
    } else {
        $httpCode = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        echo "HTTP code: $httpCode\n";

        if ($httpCode == 200) {
            echo "Call successful.\n";
            $outFileName = "samples/$folder/$inputNumber-output.$outputExtension";
            file_put_contents($outFileName, $responseBody);
            echo "Output written to $outFileName\n";
            $ret = 0;
        } else {
            echo "Call failed.\n";
            echo "Response body:\n$responseBody\n";
            $ret = 6;
        }

        $timeTaken = curl_getinfo($curl, CURLINFO_TOTAL_TIME);
        echo "Time taken: $timeTaken s\n";
    }

    curl_close($curl);
}
exit($ret);
