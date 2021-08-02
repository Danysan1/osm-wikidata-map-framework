<?php
require_once("./Query.php");
require_once("./GeoJSONQueryResult.php");

class OverpassQuery extends Query {
    /**
     * @param string $endpoint
     * @return GeoJSONQueryResult
     */
    public function send($endpoint) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $endpoint);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $this->getQuery());
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $result = curl_exec($ch);
        $curlInfo = (array)curl_getinfo($ch);
        curl_close($ch);
        if(!$result)
            $result = null;
        else
            assert(is_string($result));
        return new OverpassQueryResult($result, $curlInfo);
    }
}
