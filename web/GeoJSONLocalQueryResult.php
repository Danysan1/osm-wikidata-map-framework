<?php
require_once("./LocalQueryResult.php");

class GeoJSONLocalQueryResult extends LocalQueryResult implements GeoJSONQueryResult
{
    /**
     * @param boolean $success
     * @param array|null $result
     */
    public function __construct($success, $result)
    {
        /**
         * @psalm-suppress DocblockTypeContradiction
         */
        if ($result !== null && (!is_array($result) || empty($result["type"]))) {
            throw new Exception("Invalid GeoJSON result");
        }
        parent::__construct($success, $result);
    }

    public function getGeoJSONData()
    {
        return $this->getResult();
    }

    public function getGeoJSON()
    {
        return json_encode($this->getGeoJSONData());
    }
}
