// php sample.php overpassql 45
// https://wiki.openstreetmap.org/wiki/SPARQL_vs_Overpass_QL_examples

[out:json][timeout:25];
// gather results
(
  nwr["highway"="primary"]["junction"="roundabout"]["lanes"="3"](44.33189137217148,11.660528182983398,44.39055564523902,11.751079559326172);
);
// print results
out body;
>;
out skel qt 100;
