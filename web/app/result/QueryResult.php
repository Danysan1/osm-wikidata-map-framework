<?php

namespace App\Result;

/**
 * Result of a query
 * 
 * @see Query 
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface QueryResult {
    /**
     * @return boolean
     */
    public function isSuccessful();

    /**
     * @return boolean
     */
    public function hasResult();

    /**
     * @return array
     */
    public function getResult();

    /**
     * @return string
     */
    public function __toString();
}