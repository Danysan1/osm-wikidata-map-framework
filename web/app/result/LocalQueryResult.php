<?php

namespace App\Result;

require_once(__DIR__ . "/QueryResult.php");

use \App\Result\QueryResult;

/**
 * Locally generated query result.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
abstract class LocalQueryResult implements QueryResult
{
    /**
     * @var boolean
     */
    private $success;

    /**
     * @var mixed
     */
    private $result;

    /**
     * @param boolean $success
     * @param mixed $result
     */
    public function __construct($success, $result)
    {
        $this->success = $success;
        $this->result = $result;
    }

    /**
     * @return boolean
     */
    public function isSuccessful(): bool
    {
        return $this->success;
    }

    public function hasResult(): bool
    {
        return $this->result !== null;
    }

    public function getResult(): mixed
    {
        if ($this->result === null) {
            throw new \Exception("No result available");
        }
        return $this->result;
    }

    public function __toString()
    {
        return "LocalQueryResult: " . ($this->success ? "Success" : "Failure") . PHP_EOL . json_encode($this->result);
    }
}
