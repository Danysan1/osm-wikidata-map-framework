<?php

namespace App;

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface Configuration {
	/**
	 * @param string $key
	 * @return boolean
	 */
	public function has($key);

	/**
	 * @param string $key
	 * @return mixed
	 */
	public function get($key);
}
