// https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_API_by_Example#Count_Pharmacies_per_County_.28updated_0.7.54.29
/*
   CSV-Format: To load the query results in LibreOffice, click on 
                 "Export" -> "Open Raw Data directly from Overpass API"
               in overpass turbo. Fields are tab-separated.
*/

// Define fields for csv output
[out:csv(::type, "de:regionalschluessel", name,
         ::count, ::"count:nodes", ::"count:ways", ::"count:relations")];

//All areas with regional key (German: "Regionalschlüssel") starting with 057
area["de:regionalschluessel"~"^057"];

// Count the pharmacies in each area
foreach->.regio(
  // display details for the current area
  .regio out;

  // Collect all Nodes, Ways and Relations with amenity=pharmacy in the current area
  ( node(area.regio)[amenity=pharmacy];
    way(area.regio)[amenity=pharmacy];
    rel(area.regio)[amenity=pharmacy];);

// Count the elements in the current area Area  
  out count; 
);