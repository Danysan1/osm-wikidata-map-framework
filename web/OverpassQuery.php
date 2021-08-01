<?php
require_once("./OverpassResult.php");

class OverpassQuery {
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
     * @param float $minLat
     * @param float $minLon
     * @param float $maxLat
     * @param float $maxLon
     * @return OverpassQuery
     */
    public static function FromBoundingBox($minLat, $minLon, $maxLat, $maxLon) {
        return new self(
            "[out:json][timeout:25];
            (
                node['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
                way['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
                relation['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
            );
            out body;
            >;
            out skel qt;"
        );
    }

    /**
     * @param float $lat
     * @param float $lon
     * @param int $radius
     * @return OverpassQuery
     */
    public static function AroundPoint($lat, $lon, $radius) {
        return new self(
            "[out:json][timeout:25];
            (
              node['name:etymology:wikidata'](around:$radius,$lat,$lon);
              way['name:etymology:wikidata'](around:$radius,$lat,$lon);
              relation['name:etymology:wikidata'](around:$radius,$lat,$lon);
            );
            out body;
            >;
            out skel qt;"
        );
    }

    /**
     * @return OverpassQuery
     */
    public static function Global () {
        return new self(
            "[out:json][timeout:25];
            (
              node['name:etymology:wikidata'];
              way['name:etymology:wikidata'];
              relation['name:etymology:wikidata'];
            );
            out body;
            >;
            out skel qt;"
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
     * @return OverpassResult
     */
    public function send($endpoint) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $endpoint);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $this->query);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $result = curl_exec($ch);
        $curlInfo = (array)curl_getinfo($ch);
        curl_close($ch);
        if(!$result)
            $result = null;
        else
            assert(is_string($result));
        return new OverpassResult($result, $curlInfo);
    }
}
