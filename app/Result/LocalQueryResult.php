<?php

declare(strict_types=1);

namespace App\Result;


use \App\Result\QueryResult;

/**
 * Locally generated query result.
 */
abstract class LocalQueryResult implements QueryResult
{
    private bool $success;
    private ?string $sourcePath;
    private mixed $result;

    public function __construct(bool $success, mixed $result, ?string $sourcePath = null)
    {
        $this->success = $success;
        $this->sourcePath = $sourcePath;
        $this->result = $result;
    }

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
            if ($ret === false) {
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
        return get_class($this) . " - " . ($this->success ? "Success" : "Failure") . " - " . json_encode($this->result);
    }
}
