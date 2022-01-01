<?php

namespace App;

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface Configuration
{
	public function has(string $key): bool;

	/**
	 * @param string $key
	 * @return mixed
	 */
	public function get(string $key);

	public function getBool(string $key): bool;
}
