<?php

declare(strict_types=1);

namespace App;

/**
 * Class that allows to record a series of labeled timings.
 * These timings can then be sent to the client as a Server Timing header.
 */
class ServerTiming
{
    /**
     * Labeled timestamps array
     * 
     * @var array<array{string|null,float}>
     */
    private $times;

    public function __construct()
    {
        $this->times = [[NULL, microtime(true)]];
    }

    /**
     * Add a new labeled timestamp
     *
     * @param string $name The label of the timestamp
     * @return void
     */
    public function add($name)
    {
        if (empty($name))
            throw new \InvalidArgumentException("ServerTiming::add(): Invalid name");

        $this->times[] = [$name, microtime(true)];
    }

    /**
     * Return an array of time spent in each step
     *
     * @param boolean $sumHomonyms
     * @return array<array{string,int}>
     */
    public function getSpentTimes($sumHomonyms = true)
    {
        /** @var array<array{string,int}> */
        $ret = [];
        for ($i = 1; $i < count($this->times); $i++) {
            $name = (string)$this->times[$i][0];
            $milliseconds = (int)(($this->times[$i][1] - $this->times[$i - 1][1]) * 1000);

            if ($sumHomonyms) {
                $rowFound = null;

                for ($j = 0; ($rowFound === null && $j < count($ret)); $j++) {
                    if (
                        !empty($ret[$j][0]) &&
                        $ret[$j][0] == $name &&
                        !empty($ret[$j][1]) &&
                        is_int($ret[$j][1])
                    ) {
                        $rowFound = $j;
                        $ret[$j][1] += $milliseconds;
                    }
                }

                if ($rowFound === null) {
                    $ret[] = [$name, $milliseconds];
                }
            } else {
                $ret[] = [$name, $milliseconds];
            }
        }
        return $ret;
    }

    /**
     * Reducer for the reduce function
     * 
     * @param string $header Server-Timing header so far
     * @param array{string,int} $time The current row
     * @return string
     */
    private static function serverTimingReducer($header, $time)
    {
        return $header . $time[0] . ";dur=" . $time[1] . ",";
    }

    /**
     * Get the Server-Timing header
     *
     * @return string
     * @see https://www.w3.org/TR/server-timing/
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing
     * @see https://www.fastly.com/blog/supercharging-server-timing-http-trailers
     */
    public function getHeader()
    {
        return array_reduce($this->getSpentTimes(), [self::class, "serverTimingReducer"], "Server-Timing:");
    }

    /**
     * Send the Server-Timing header
     *
     * @return void
     */
    public function sendHeader()
    {
        header($this->getHeader());
    }

    public function __toString(): string
    {
        $timeArr = array_map(function ($t) {
            return sprintf("%s=%.3fs", $t[0], $t[1] / 1000);
        }, $this->getSpentTimes());
        return implode(", ", $timeArr);
    }

    /**
     * Print the timestamps into the PHP log file
     *
     * @psalm-suppress PossiblyUnusedMethod
     */
    public function logTimes(string $label = ""): void
    {
        error_log("$label ServerTiming: $this");
    }
}
