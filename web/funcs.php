<?php

function overpassQuery($minLat, $minLon, $maxLat, $maxLon) {
	return "[out:json][timeout:25];
	(
		node['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
		way['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
		relation['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
	);
	out body;
	>;
	out skel qt;";
}

function getOverpassResult($endpoint, $query) {
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $endpoint);
	curl_setopt($ch, CURLOPT_POST, 1);
	curl_setopt($ch, CURLOPT_POSTFIELDS, $query);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	$result = curl_exec($ch);
	curl_close($ch);
	return $result;
}
