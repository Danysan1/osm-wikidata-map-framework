import { MapboxGeoJSONFeature as MapGeoJSONFeature } from "mapbox-gl";

import { Point, LineString, Polygon, MultiPolygon } from "geojson";
import { Etymology, etymologyToDomElement } from "./EtymologyElement";
import { debugLog } from "./config";
import { showLoadingSpinner } from "./snackbar";

interface FeatureProperties {
    alt_name?: string;
    commons?: string;
    el_id?: number;
    etymologies: Etymology[] | string; // Even though it is received as an array, for some reason Mapbox GL JS stringifies it as JSON
    gender_color?: string;
    name?: string;
    osm_id?: number;
    osm_type?: string;
    source_color?: string;
    text_etymology?: string;
    text_etymology_descr?: string;
    type_color?: string;
    wikidata?: string;
    wikipedia?: string;
}

export function featureToDomElement(feature: MapGeoJSONFeature, currentZoom = 12.5): HTMLElement {
    const detail_template = document.getElementById('detail_template');
    if (!(detail_template instanceof HTMLTemplateElement))
        throw new Error("Missing etymology template");

    const properties = feature.properties as FeatureProperties,
        etymologies = typeof properties?.etymologies === 'string' ? JSON.parse(properties?.etymologies) as Etymology[] : properties?.etymologies,
        detail_container = detail_template.content.cloneNode(true) as HTMLElement,
        osm_full_id = properties.osm_type && properties.osm_id ? properties.osm_type + '/' + properties.osm_id : null;
    //detail_container.dataset.el_id = properties.el_id?.toString();

    debugLog("featureToDomElement", {
        el_id: properties.el_id, feature, etymologies, detail_container
    });

    const element_name = detail_container.querySelector<HTMLElement>('.element_name');
    if (!element_name) {
        console.warn("Missing element_name");
    } else if (properties.name && properties.name != 'null') {
        element_name.innerText = '📍 ' + properties.name;
    }

    const element_alt_name = detail_container.querySelector<HTMLElement>('.element_alt_name');
    if (!element_alt_name) {
        console.warn("Missing element_alt_name");
    } else if (properties.alt_name && properties.alt_name != 'null') {
        element_alt_name.innerText = '("' + properties.alt_name + '")';
    }

    const wikidata = properties.wikidata,
        element_wikidata_button = detail_container.querySelector<HTMLAnchorElement>('.element_wikidata_button');
    if (!element_wikidata_button) {
        console.warn("Missing element_wikidata_button");
    } else if (wikidata && wikidata != 'null') {
        element_wikidata_button.href = `https://www.wikidata.org/wiki/${wikidata}`;
        element_wikidata_button.classList.remove("hiddenElement");
    } else {
        element_wikidata_button.classList.add("hiddenElement");
    }

    const wikipedia = properties.wikipedia,
        element_wikipedia_button = detail_container.querySelector<HTMLAnchorElement>('.element_wikipedia_button');
    if (!element_wikipedia_button) {
        console.warn("Missing element_wikipedia_button");
    } else if (wikipedia && wikipedia != 'null') {
        element_wikipedia_button.href = `https://www.wikipedia.org/wiki/${wikipedia}`;
        element_wikipedia_button.classList.remove("hiddenElement");
    } else {
        element_wikipedia_button.classList.add("hiddenElement");
    }

    const commons = properties.commons,
        element_commons_button = detail_container.querySelector<HTMLAnchorElement>('.element_commons_button');
    if (!element_commons_button) {
        console.warn("Missing element_commons_button");
    } else if (commons && commons != 'null') {
        element_commons_button.href = `https://commons.wikimedia.org/wiki/${commons}`;
        element_commons_button.classList.remove("hiddenElement");
    } else {
        element_commons_button.classList.add("hiddenElement");
    }

    const element_osm_button = detail_container.querySelector<HTMLAnchorElement>('.element_osm_button');
    if (!element_osm_button) {
        console.warn("Missing element_osm_button");
    } else if (osm_full_id) {
        element_osm_button.href = 'https://www.openstreetmap.org/' + osm_full_id;
        element_osm_button.classList.remove("hiddenElement");
    } else {
        element_osm_button.classList.add("hiddenElement");
    }

    const element_mapcomplete_button = detail_container.querySelector<HTMLAnchorElement>('.element_mapcomplete_button');
    if (!element_mapcomplete_button) {
        console.warn("Missing element_mapcomplete_button");
    } else if (osm_full_id) {
        element_mapcomplete_button.href = 'https://mapcomplete.osm.be/etymology.html#' + osm_full_id;
        element_mapcomplete_button.classList.remove("hiddenElement");
    } else {
        element_mapcomplete_button.classList.add("hiddenElement");
    }

    const element_location_button = detail_container.querySelector<HTMLAnchorElement>('.element_location_button');
    if (!element_location_button) {
        console.warn("Missing element_location_button");
    } else if (osm_full_id || properties.wikipedia || properties.wikidata) { // Hide this button if it is the only one
        let coord = (feature.geometry as Point | LineString | Polygon | MultiPolygon).coordinates;
        while (Array.isArray(coord) && Array.isArray(coord[0])) {
            coord = coord[0];
        }
        const lon = coord[0], lat = coord[1];
        element_location_button.href = `#${lon},${lat},${currentZoom + 1}`;
        element_location_button.classList.remove("hiddenElement");
    } else {
        element_location_button.classList.add("hiddenElement");
    }

    const etymologies_container = detail_container.querySelector<HTMLElement>('.etymologies_container');
    if (!etymologies_container) {
        console.warn("Missing etymologies_container");
    } else {
        showLoadingSpinner(true);
        downloadEtymologyDetails(etymologies).then((filledEtymologies) => {
            showLoadingSpinner(false);
            filledEtymologies.forEach(function (ety) {
                if (ety?.wikidata) {
                    try {
                        etymologies_container.appendChild(etymologyToDomElement(ety, currentZoom))
                    } catch (err) {
                        console.error("Failed adding etymology", ety, err);
                    }
                } else {
                    console.warn("Found etymology without Wikidata ID", ety);
                }
            });

            const textEtyName = properties.text_etymology === "null" ? undefined : properties.text_etymology,
                textEtyNameExists = typeof textEtyName === "string" && !!textEtyName,
                textEtyDescr = properties.text_etymology_descr === "null" ? undefined : properties.text_etymology_descr,
                textEtyDescrExists = typeof textEtyDescr === "string" && !!textEtyDescr;
            let textEtyShouldBeShown = textEtyNameExists || textEtyDescrExists;

            if (textEtyNameExists && !textEtyDescrExists) {
                // If the text etymology has only the name and it's already shown by one of the Wikidata etymologies' name/description, hide it
                textEtyShouldBeShown = filledEtymologies.some((etymology) =>
                    !etymology?.name?.toLowerCase()?.includes(textEtyName.trim().toLowerCase()) &&
                    !etymology?.description?.toLowerCase()?.includes(textEtyName.trim().toLowerCase())
                );
            }

            debugLog("featureToDomElement: showing text etymology? ", {
                feature, textEtyName, textEtyNameExists, textEtyShouldBeShown, textEtyDescr, textEtyDescrExists
            });
            if (textEtyShouldBeShown) {
                etymologies_container.appendChild(etymologyToDomElement({
                    name: textEtyName,
                    description: textEtyDescr,
                    from_osm: true,
                    from_osm_type: properties.osm_type,
                    from_osm_id: properties.osm_id,
                }, currentZoom));
            }
        });
    }

    return detail_container;
}

async function downloadEtymologyDetails(etymologies: Etymology[]): Promise<Etymology[]> {
    const etymologyIDs = etymologies.filter(e => e?.wikidata).map(e => "wd:" + e.wikidata);
    try {
        const culture = document.documentElement.lang,
            language = culture.split('-')[0],
            wikidataValues = etymologyIDs.join(" "),
            sparql = `
SELECT ?wikidata
    (SAMPLE(?name) AS ?name)
    (SAMPLE(?description) AS ?description)
    (SAMPLE(?instanceID) AS ?instanceID)
    (SAMPLE(?instance_name) AS ?instance)
    (SAMPLE(?genderID) AS ?genderID)
    (SAMPLE(?gender_name) AS ?gender)
    (SAMPLE(?wikipedia) AS ?wikipedia)
    (SAMPLE(?commons) AS ?commons)
    (GROUP_CONCAT(DISTINCT ?occupation_name; SEPARATOR=', ') AS ?occupations)
    (GROUP_CONCAT(DISTINCT ?citizenship_name; SEPARATOR=', ') AS ?citizenship)
    (GROUP_CONCAT(DISTINCT ?picture; SEPARATOR='||') AS ?pictures)
    (GROUP_CONCAT(DISTINCT ?prize_name; SEPARATOR=', ') AS ?prizes)
    (SAMPLE(?event_date) AS ?event_date)
    (SAMPLE(?event_date_precision) AS ?event_date_precision)
    (SAMPLE(?start_date) AS ?start_date)
    (SAMPLE(?start_date_precision) AS ?start_date_precision)
    (SAMPLE(?end_date) AS ?end_date)
    (SAMPLE(?end_date_precision) AS ?end_date_precision)
    (SAMPLE(?birth_date) AS ?birth_date)
    (SAMPLE(?birth_date_precision) AS ?birth_date_precision)
    (SAMPLE(?death_date) AS ?death_date)
    (SAMPLE(?death_date_precision) AS ?death_date_precision)
    (GROUP_CONCAT(DISTINCT ?event_place_name; SEPARATOR=', ') AS ?event_place)
    (SAMPLE(?birth_place_name) AS ?birth_place)
    (SAMPLE(?death_place_name) AS ?death_place)
    (SAMPLE(?wkt_coords) AS ?wkt_coords)
WHERE {
    VALUES ?wikidata { ${wikidataValues} }

    {
        ?name ^rdfs:label ?wikidata.
        FILTER(lang(?name)='${language}').
        OPTIONAL {
            ?description ^schema:description ?wikidata.
            FILTER(lang(?description)='${language}').
        }
    } UNION {
        MINUS {
            ?other_name ^rdfs:label ?wikidata.
            FILTER(lang(?other_name)='${language}').
        }
        ?name ^rdfs:label ?wikidata.
        FILTER(lang(?name)='en').
        OPTIONAL {
            ?description ^schema:description ?wikidata.
            FILTER(lang(?description)='en').
        }
    } UNION {
        MINUS {
            ?other_name ^rdfs:label ?wikidata.
            FILTER(lang(?other_name)='${language}' || lang(?other_name)='en').
        }
        ?name ^rdfs:label ?wikidata.
    }

    OPTIONAL {
        ?occupation ^wdt:P106 ?wikidata.
        {
            ?gender ^wdt:P21 ?wikidata.
            FILTER(?gender IN (wd:Q6581072, wd:Q1052281)). # female / transgender female
            ?occupation_name ^wdt:P2521 ?occupation. # female form of occupation label
        } UNION {
            MINUS {
                ?occupation_name ^wdt:P2521 ?occupation.
                FILTER(lang(?occupation_name)='${language}').
            }. # female form of occupation is NOT available in this language
            ?gender ^wdt:P21 ?wikidata.
            FILTER(?gender IN (wd:Q6581072, wd:Q1052281)). # female / transgender female
            ?occupation_name ^rdfs:label ?occupation. # base occupation label
        } UNION {
            ?gender ^wdt:P21 ?wikidata.
            FILTER(?gender NOT IN (wd:Q6581072, wd:Q1052281)). # NOT female / transgender female
            ?occupation_name ^wdt:P3321 ?occupation. # male form of occupation label
        } UNION {
            MINUS {
                ?occupation_name ^wdt:P3321 ?occupation.
                FILTER(lang(?occupation_name)='${language}').
            }. # male form of occupation is NOT available in this language
            ?gender ^wdt:P21 ?wikidata.
            FILTER(?gender NOT IN (wd:Q6581072, wd:Q1052281)). # NOT female / transgender female
            ?occupation_name ^rdfs:label ?occupation. # male form of occupation label
        } UNION {
            MINUS { ?wikidata wdt:P21 []. } . # no gender specified
            ?occupation_name ^rdfs:label ?occupation. # base occupation label
        }
        FILTER(lang(?occupation_name)='${language}').
    }

    OPTIONAL {
        ?picture ^wdt:P18|^wdt:P94|^wdt:P242|^wdt:P15|^wdt:P41 ?wikidata.
# picture - https://www.wikidata.org/wiki/Property:P18
# coat of arms image - https://www.wikidata.org/wiki/Property:P94
# locator map image - https://www.wikidata.org/wiki/Property:P242
# route map - https://www.wikidata.org/wiki/Property:P15
# flag - https://www.wikidata.org/wiki/Property:P41
    }

    OPTIONAL {
        ?wikidata p:P585/psv:P585 [ # event date - https://www.wikidata.org/wiki/Property:P585
            wikibase:timePrecision ?event_date_precision;
            wikibase:timeValue ?event_date
        ].
        MINUS {
            ?wikidata p:P585/psv:P585/wikibase:timePrecision ?other_event_date_precision.
            FILTER (?other_event_date_precision > ?event_date_precision).
        }.
    }

    OPTIONAL {
        ?wikidata (p:P580/psv:P580)|(p:P571/psv:P571)|(p:P1619/psv:P1619) [
# start time - https://www.wikidata.org/wiki/Property:P580
# inception - https://www.wikidata.org/wiki/Property:P571
# date of official opening - https://www.wikidata.org/wiki/Property:P1619
            wikibase:timePrecision ?start_date_precision;
            wikibase:timeValue ?start_date
        ].
        MINUS {
            ?wikidata (p:P571/psv:P571/wikibase:timePrecision)|(p:P1619/psv:P1619/wikibase:timePrecision)|(p:P569/psv:P569/wikibase:timePrecision) ?other_start_date_precision.
            FILTER (?other_start_date_precision > ?start_date_precision).
        }.
    }

    OPTIONAL {
        ?wikidata (p:P582/psv:P582)|(p:P576/psv:P576)|(p:P3999/psv:P3999) [
# end time - https://www.wikidata.org/wiki/Property:P582
# dissolved, abolished or demolished date - https://www.wikidata.org/wiki/Property:P576
# date of official closure - https://www.wikidata.org/wiki/Property:P3999
            wikibase:timePrecision ?end_date_precision;
            wikibase:timeValue ?end_date
        ].
        MINUS {
            ?wikidata (p:P582/psv:P582/wikibase:timePrecision)|(p:P576/psv:P576/wikibase:timePrecision)|(p:P3999/psv:P3999/wikibase:timePrecision) ?other_end_date_precision.
            FILTER (?other_end_date_precision > ?end_date_precision).
        }.
    }

    OPTIONAL {
        ?wikidata p:P569/psv:P569 [ # birth date - https://www.wikidata.org/wiki/Property:P569
            wikibase:timePrecision ?birth_date_precision;
            wikibase:timeValue ?birth_date
        ].
        MINUS {
            ?wikidata p:P569/psv:P569/wikibase:timePrecision ?other_birth_date_precision.
            FILTER (?other_birth_date_precision > ?birth_date_precision).
        }.
    }

    OPTIONAL {
        ?wikidata p:P570/psv:P570 [ # death date - https://www.wikidata.org/wiki/Property:P570
            wikibase:timePrecision ?death_date_precision;
            wikibase:timeValue ?death_date
        ].
        MINUS {
            ?wikidata p:P570/psv:P570/wikibase:timePrecision ?other_death_date_precision.
            FILTER (?other_death_date_precision > ?death_date_precision).
        }.
    }

    OPTIONAL {
        ?event_place_name ^rdfs:label/^wdt:P276 ?wikidata.
        FILTER(lang(?event_place_name)='${language}').
    }

    OPTIONAL {
        ?birth_place_name ^rdfs:label/^wdt:P19 ?wikidata.
        FILTER(lang(?birth_place_name)='${language}').
    }

    OPTIONAL {
        ?death_place_name ^rdfs:label/^wdt:P20 ?wikidata.
        FILTER(lang(?death_place_name)='${language}').
    }

    OPTIONAL {
        ?wikipedia schema:about ?wikidata;
            schema:inLanguage '${language}';
            schema:isPartOf [ wikibase:wikiGroup 'wikipedia' ].
    }

    OPTIONAL {
        ?commons ^wdt:P373 ?wikidata.
    }

    OPTIONAL {
        ?prize ^wdt:P166 ?wikidata # awarded prize
        {
            ?prize_group ^wdt:P361 ?prize.
            FILTER(?prize_group IN (wd:Q7191,wd:Q19020,wd:Q41254)). # Nobel, Academy (Oscar), Grammy
        } UNION {
            ?prize wdt:P31 wd:Q28444913. # Palme d'Or (Cannes)
        } UNION {
            ?prize wdt:P1027 wd:Q49024. # Golden Lion (Venice)
        }
        ?prize_name ^rdfs:label ?prize.
        FILTER(lang(?prize_name)='${language}').
    }

    OPTIONAL {
        ?wkt_coords ^wdt:P625 ?wikidata.
        FILTER(STRSTARTS(?wkt_coords, 'Point')).
    }

    OPTIONAL {
        ?citizenship_name ^rdfs:label/^wdt:P27 ?wikidata.
        FILTER(lang(?citizenship_name)='${language}').
    }
}
GROUP BY ?wikidata
            `,
            response = await fetch("https://query.wikidata.org/sparql", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ format: "json", query: sparql }).toString(),
            }),
            res = await response.json();
        return res?.results?.bindings?.map((x: any): Etymology => {
            const wdURI = x.wikidata.value as string,
                wdQID = wdURI.replace("http://www.wikidata.org/entity/", ""),
                sourceEty = etymologies.find(ety => ety.wikidata == wdQID);
            return {
                ...sourceEty,
                birth_date: x.birth_date?.value,
                birth_date_precision: parseInt(x.birth_date_precision?.value),
                birth_place: x.birth_place?.value,
                citizenship: x.citizenship?.value,
                commons: x.commons?.value,
                death_date: x.death_date?.value,
                death_date_precision: parseInt(x.death_date_precision?.value),
                death_place: x.death_place?.value,
                description: x.description?.value,
                end_date: x.end_date?.value,
                end_date_precision: parseInt(x.end_date_precision?.value),
                event_date: x.event_date?.value,
                event_date_precision: parseInt(x.event_date_precision?.value),
                event_place: x.event_place?.value,
                name: x.name?.value,
                occupations: x.occupations?.value,
                pictures: x.pictures?.value?.split("||"),
                prizes: x.prizes?.value,
                start_date: x.start_date?.value,
                start_date_precision: parseInt(x.start_date_precision?.value),
                wikipedia: x.wikipedia?.value,
                wkt_coords: x.wkt_coords?.value,
            };
        });
    } catch (err) {
        console.error("Failed downloading etymology details", etymologyIDs, err);
        return etymologies;
    }
}
