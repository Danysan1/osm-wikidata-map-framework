<?php

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface Configuration {
	/**
	 * @param string $key
	 * @return mixed
	 */
	public function get($key);
}
