<?php
require_once("./BaseRemoteQueryResult.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class JSONRemoteQueryResult extends BaseRemoteQueryResult
{
    /**
     * @return bool
     */
    public function hasResult()
    {
        return $this->hasBody() && $this->isJSON();
    }

    /**
     * @return array
     */
    public function getResult()
    {
        if (!$this->hasBody()) {
            throw new Exception("JSONRemoteQueryResult::getResult: No response available, can't parse");
        }
        if (!$this->isJSON()) {
            throw new Exception("JSONRemoteQueryResult::getResult: Not a valid JSON response, can't parse");
        }

        return (array)json_decode($this->getBody(), true);
    }
}
