<?php

namespace App\Query\Wikidata;

require_once(__DIR__."/../BaseQuery.php");
require_once(__DIR__."/../../result/wikidata/WikidataQueryResult.php");

use App\Query\BaseQuery;
use App\Result\Wikidata\WikidataQueryResult;

/**
 * Wikidata query sent via HTTP POST request.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class POSTWikidataQuery extends BaseQuery {
    /**
     * @return WikidataQueryResult
     */
    public function send() {
        $ch = curl_init();
        $url = $this->getEndpointURL();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query(["query"=>$this->getQuery()]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERAGENT => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36",
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_SSL_VERIFYPEER => 0
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $result = curl_exec($ch);
        $curlInfo = (array)curl_getinfo($ch);
        curl_close($ch);
        if(!$result)
            $result = null;
        else
            assert(is_string($result));
        $out = new WikidataQueryResult($result, $curlInfo);
        /*if(!$out->isSuccessful()) {
            error_log("Unsuccessful POSTWikidataQuery - ".$out)
        }*/
        return $out;
    }
}
