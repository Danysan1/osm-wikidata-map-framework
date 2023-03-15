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
                (SAMPLE(?event_date) AS ?event_date)
                (SAMPLE(?event_date_precision) AS ?event_date_precision)
                (SAMPLE(?start_date) AS ?start_date)
                (SAMPLE(?start_date_precision) AS ?start_date_precision)
                (SAMPLE(?birth_date) AS ?birth_date)
                (SAMPLE(?birth_date_precision) AS ?birth_date_precision)
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

                OPTIONAL { # necessary for century stats
                    ?wikidata p:P569/psv:P569 [ # birth date - https://www.wikidata.org/wiki/Property:P569
                        wikibase:timePrecision ?birth_date_precision;
                        wikibase:timeValue ?birth_date
                    ].
                    MINUS {
                        ?wikidata p:P569/psv:P569/wikibase:timePrecision ?other_birth_date_precision.
                        FILTER (?other_birth_date_precision > ?birth_date_precision).
                    }.
                }
            }
            GROUP BY ?wikidata";
    }
}
