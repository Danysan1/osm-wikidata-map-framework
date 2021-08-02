<?php
require_once("./QueryResult.php");

class LocalQueryResult implements QueryResult {
    /**
     * @var boolean
     */
    private $success;

    /**
     * @var array|null
     */
    private $result;

    /**
     * @param boolean $success
     * @param array|null $result
     */
    public function __construct($success, $result) {
        $this->success = $success;
        $this->result = $result;
    }

    /**
     * @return boolean
     */
    public function isSuccessful()
    {
        return $this->success;
    }

    /**
     * @return boolean
     */
    public function hasResult() {
        return $this->result !== null;
    }

    /**
     * @return array
     */
    public function getResult() {
        if($this->result === null) {
            throw new Exception("No result available");
        }
        return $this->result;
    }

    public function __toString()
    {
        return "LocalQueryResult: ".($this->success?"Success":"Failure").PHP_EOL.$this->result;
    }
}
