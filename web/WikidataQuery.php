<?php
require_once("./Query.php");
require_once("./WikidataQueryResult.php");

class WikidataQuery extends Query {
    /**
     * @param string $endpoint
     * @return WikidataQueryResult
     */
    public function send($endpoint) {
        $ch = curl_init();
        $url = "$endpoint?".http_build_query(["query"=>$this->getQuery()]);
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
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
        return new WikidataQueryResult($result, $curlInfo);
    }
}
