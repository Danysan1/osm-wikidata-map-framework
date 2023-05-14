<?php

declare(strict_types=1);

namespace App\Result;


use \App\Result\LocalQueryResult;
use \App\Result\JSONQueryResult;

/**
 * Locally generated JSON query result
 */
class JSONLocalQueryResult extends LocalQueryResult implements JSONQueryResult
{
    public function __construct(bool $success, mixed $result, ?string $sourcePath = null)
    {
        $emptyResult = empty($result) && $result !== [];
        $resultFromResult = $success && !$emptyResult;
        $resultFromSourcePath = $success && $emptyResult;

        if ($resultFromSourcePath && empty($sourcePath)) {
            throw new \Exception("JSONLocalQueryResult: Empty result");
        } elseif ($resultFromResult && !is_string($result) && !is_array($result)) {
            throw new \Exception("JSONLocalQueryResult: Result must be a string or array");
        }

        parent::__construct($success, $result, $sourcePath);
    }

    public function getJSONData(): array
    {
        $res = $this->getResult();
        return is_array($res) ? $res : (array)json_decode((string)$res, true);
    }

    public function getArray(): array
    {
        return $this->getJSONData();
    }

    public function getJSON(): string
    {
        $res = $this->getResult();
        return is_array($res) ? json_encode($res) : (string)$res;
    }
}
