<?php
require_once("./QueryResult.php");

class WikidataQuery {
    /**
     * @var string
     */
    private $query;

    /**
     * @param string $query
     */
    public function __construct($query) {
        $this->query = $query;
    }

    /**
     * @param array<string> $IDList
     * @return WikidataQuery
     */
    public static function FromIDList($IDList) {
        return new self(
            "TODO"
        );
    }
    
    /**
     * @return string
     */
    public function getQuery() {
        return $this->query;
    }

    /**
     * @param string $endpoint
     * @return QueryResult
     */
    public function send($endpoint) {
        $ch = curl_init();
        $url = "$endpoint?".http_build_query(["query"=>$this->query]);
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $result = curl_exec($ch);
        $curlInfo = curl_getinfo($ch);
        curl_close($ch);
        return new QueryResult($result, $curlInfo);
    }
}
