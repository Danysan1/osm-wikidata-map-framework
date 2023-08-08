<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\Query;

/**
 * Base abstract implementation of a query object.
 */
abstract class BaseQuery implements Query
{
    protected function getSimplifiedClassName(mixed $object): string
    {
        $className = get_class($object);

        $startPos = strrpos($className, "\\");
        $offset = $startPos === false ? 0 : $startPos + 1;

        $endPos = strpos($className, "@");
        $length = $endPos === false ? null : $endPos - $offset;

        return str_replace("\0", "_", substr($className, $offset, $length));
    }

    public function getQueryTypeCode(): string
    {
        return $this->getSimplifiedClassName($this);
    }

    public function __toString(): string
    {
        return get_class($this);
    }
}
