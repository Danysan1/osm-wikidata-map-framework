
[out:csv(::type, ::id, ::lat, ::lon, ::count)];
//[out:json];

// All countries
area["admin_level"="2"]["boundary"="administrative"]["ISO3166-1"][!"ISO3166-2"]->.countries;

// Count the elements with etymology in each country
foreach .countries -> .country (
  // display details for the current country
  .country out ids center;

  // Collect all Nodes, Ways and Relations with "name:etymology:wikidata"=* in the current country
  (
    //node(area.country)["name:etymology:wikidata"];
    way(area.country)["name:etymology:wikidata"];
    //rel(area.country)["name:etymology:wikidata"];
  );

  // Count the elements in the current country
  out count; 
);