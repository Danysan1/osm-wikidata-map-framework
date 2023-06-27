<?php

declare(strict_types=1);

namespace App\Query\Wikidata\QueryBuilder;

class BaseEtymologyIDListWikidataQueryBuilder extends BaseIDListWikidataQueryBuilder
{
    protected function createQueryFromValidIDsString(string $wikidataValues, string $language): string
    {
        return "SELECT ?wikidata
                (SAMPLE(?instanceID) AS ?instanceID)
                (SAMPLE(?instance_name) AS ?instance)
                (SAMPLE(?genderID) AS ?genderID)
                (SAMPLE(?gender_name) AS ?gender)
                (SAMPLE(?countryID) AS ?countryID)
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
            WHERE {
                VALUES ?wikidata { $wikidataValues }

                OPTIONAL { # necessary for type stats
                    ?instanceID ^wdt:P31 ?wikidata;
                        rdfs:label ?instance_name.
                    FILTER(lang(?instance_name)='$language').
                }

                OPTIONAL { # necessary for gender stats
                    ?genderID ^wdt:P21 ?wikidata;
                        rdfs:label ?gender_name.
                    FILTER(lang(?gender_name)='$language').
                }

                OPTIONAL { # necessary for century stats
                    ?wikidata p:P585/psv:P585 [ # event date - https://www.wikidata.org/wiki/Property:P585
                        wikibase:timePrecision ?event_date_precision;
                        wikibase:timeValue ?event_date
                    ].
                    MINUS {
                        ?wikidata p:P585/psv:P585/wikibase:timePrecision ?other_event_date_precision.
                        FILTER (?other_event_date_precision > ?event_date_precision).
                    }.
                }

                # Date the event represented by this entity started
                # start time - https://www.wikidata.org/wiki/Property:P580
                # inception - https://www.wikidata.org/wiki/Property:P571
                # date of official opening - https://www.wikidata.org/wiki/Property:P1619
                # necessary for century stats
                OPTIONAL {
                    ?wikidata (p:P580/psv:P580)|(p:P571/psv:P571)|(p:P1619/psv:P1619) [
                        wikibase:timePrecision ?start_date_precision;
                        wikibase:timeValue ?start_date
                    ].
                    MINUS {
                        ?wikidata (p:P571/psv:P571/wikibase:timePrecision)|(p:P1619/psv:P1619/wikibase:timePrecision)|(p:P569/psv:P569/wikibase:timePrecision) ?other_start_date_precision.
                        FILTER (?other_start_date_precision > ?start_date_precision).
                    }.
                }

                # Date the event represented by this entity ended
                # end time - https://www.wikidata.org/wiki/Property:P582
                # dissolved, abolished or demolished date - https://www.wikidata.org/wiki/Property:P576
                # date of official closure - https://www.wikidata.org/wiki/Property:P3999
                # necessary for century stats
                OPTIONAL {
                    ?wikidata (p:P582/psv:P582)|(p:P576/psv:P576)|(p:P3999/psv:P3999) [
                        wikibase:timePrecision ?end_date_precision;
                        wikibase:timeValue ?end_date
                    ].
                    MINUS {
                        ?wikidata (p:P582/psv:P582/wikibase:timePrecision)|(p:P576/psv:P576/wikibase:timePrecision)|(p:P3999/psv:P3999/wikibase:timePrecision) ?other_end_date_precision.
                        FILTER (?other_end_date_precision > ?end_date_precision).
                    }.
                }

                # Date the person represented by this entity was born in
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

                # Date the person represented by this entity died in
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
                    ?countryID ^wdt:P17|^wdt:P27 ?wikidata.
                }
            }
            GROUP BY ?wikidata";
    }
}
