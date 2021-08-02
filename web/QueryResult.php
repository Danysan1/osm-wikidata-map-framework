<?php

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