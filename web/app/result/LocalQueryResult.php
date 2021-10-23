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
     * @var string|null
     */
    private $sourcePath;

    /**
     * @var mixed
     */
    private $result;

    /**
     * @param boolean $success
     * @param mixed $result
     * @param string|null $sourcePath
     */
    public function __construct($success, $result, $sourcePath = null)
    {
        $this->success = $success;
        $this->sourcePath = $sourcePath;
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
        return $this->result !== null || $this->sourcePath !== null;
    }

    public function getResult()
    {
        if ($this->result !== null) {
            return $this->result;
        } elseif ($this->hasPublicSourcePath()) {
            $path = $this->getPublicSourcePath();
            $ret = @file_get_contents($path);
            if($ret === false) {
                error_log(get_class($this) . ": Unable to read source file '$path'");
                throw new \Exception("Unable to read source file");
            }
            return $ret;
        } else {
            throw new \Exception("No result available");
        }
    }

    public function hasPublicSourcePath(): bool
    {
        return $this->sourcePath !== null;
    }

    protected function setPublicSourcePath(string $sourcePath): void
    {
        $this->sourcePath = $sourcePath;
    }

    public function getPublicSourcePath(): string
    {
        if ($this->sourcePath === null) {
            throw new \Exception("No source path available");
        }
        return $this->sourcePath;
    }

    public function __toString(): string
    {
        return get_class($this) . ", " . ($this->success ? "Success" : "Failure") . PHP_EOL . json_encode($this->result);
    }
}
