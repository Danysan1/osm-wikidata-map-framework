"use client";

import { loadClientI18n } from "@/src/i18n/client";
import { SourcePreset } from "@/src/model/SourcePreset";
import Link from "next/link";
import { FC, Fragment } from "react";
import { useTranslation } from "react-i18next";
import styles from "./Contributing.module.css"

loadClientI18n().catch((e) => { throw e; });

interface ContributingProps {
    lang?: string;
    sourcePreset: SourcePreset;
}

export const Contributing: FC<ContributingProps> = ({ sourcePreset }) => {
    const { t } = useTranslation(),
        anyLinkedEntity = !!sourcePreset?.osm_wikidata_keys || !!sourcePreset?.osm_wikidata_properties || !!sourcePreset?.wikidata_indirect_property || !!sourcePreset?.osm_text_key;

    return <div>
        <Link href="/">&lt; Back to map</Link>

        <h1>{t("info_box.contribute")}</h1>

        <section id="report_entity">
            <h2>How to report a problem in an entity</h2>
            <p>If an entity linked to a map feature is the correct one but there is a problem in its details (birth date, nationality, ...):</p>
            <ol>
                <li>From the details window click on the &quot;Wikidata&quot; button for the incorrect linked entity</li>
                <li>At the top of the opened page click on &quot;Discussion&quot;</li>
                <li>At the top of the opened page click on &quot;Add topic&quot;</li>
                <li>Write in the title and description the problem you found in the entity</li>
                <li>Confirm your comment by clicking on the &quot;Add topic&quot; button below</li>
            </ol>
        </section>

        {anyLinkedEntity && <section id="report_linked_entity">
            <h2>How to report a problem in an entity linked to a feature</h2>
            <p>If a wrong entity is associated to the map feature you can use the &quot;{t("etymology_details.source")}&quot; row to find the source of the error:</p>
            <ol>
                {process.env.owmf_propagate_data && <li>
                    If the source row includes the &quot;{t("etymology_details.propagation")}&quot; step, skip to the <a href="#propagation">next section below</a>.
                </li>}
                {!!sourcePreset.osm_text_key && <li>
                    <strong>If the source row starts with &quot;OpenStreetMap&quot; and does not include any &quot;Wikidata&quot; link</strong> then the text-only linked entity is taken from the <a href={`https://wiki.openstreetmap.org/wiki/Key:${sourcePreset.osm_text_key}`}><code>{sourcePreset.osm_text_key}</code></a> tag on the OSM element for this feature.
                    &nbsp;<strong>Open the OSM item for this feature</strong> by clicking the &quot;OpenStreetMap&quot; link in the source row.
                    On the left of the OSM element&apos;s page the value for the tag <a href={`https://wiki.openstreetmap.org/wiki/Key:${sourcePreset.osm_text_key}`}><code>{sourcePreset.osm_text_key}</code></a> will be the wrong entity you noticed. 
                    If you are an OSM mapper fix it yourself, otherwise click on the dialog button on the right to add a note to the map and describe the problem.
                </li>}
                {!!sourcePreset.osm_wikidata_keys && <li>
                    <strong>If the source row starts with &quot;OpenStreetMap&quot; and does include only one &quot;Wikidata&quot; link</strong>
                    On the left of the OSM element&apos;s page check if one of the following tags is present:
                    <ul>{sourcePreset.osm_wikidata_keys.map(key => <li key={key}>
                        <a href={`https://wiki.openstreetmap.org/wiki/Key:${key}`}><code>{key}</code></a>
                    </li>)}</ul>
                    If it is, it means that OSM is directly linking to that entity.
                    Click on the dialog button on the right to add a note to the map and describe the problem or, if you are a mapper, edit the element to fix it.
                </li>}
                {(!!sourcePreset.osm_wikidata_properties || !!sourcePreset?.wikidata_indirect_property) && <li>
                    <strong>If the source row starts with &quot;OpenStreetMap&quot; and includes multiple &quot;Wikidata&quot; links</strong> it means that the OSM element for this feature links to the Wikidata item for this feature through the <a href="https://wiki.openstreetmap.org/wiki/Key:wikidata"><code>wikidata</code></a> tag.
                    &nbsp;<strong>Open the Wikidata item for this feature</strong> by clicking the first &quot;Wikidata&quot; link in the source row.
                    If the content of the opened page DOES NOT represent the map feature (e.g. it represents the linked entity or something else) then the OSM element&apos;s <a href="https://wiki.openstreetmap.org/wiki/Key:wikidata"><code>wikidata</code></a> tag points to the wrong item.
                    Go back to the source row and open the OSM element by clicking on the first &quot;OpenStreetMap&quot; link.
                    On the left of the OSM element&apos;s page a <code>wikidata</code> tag will be present and its value will be wrong.
                    If you are an OSM mapper fix it yourself, otherwise click on the dialog button on the right to add a note to the map and describe the problem.
                </li>}
                {!!sourcePreset.wikidata_indirect_property && <li>
                    <strong>If the source row includes multiple &quot;Wikidata&quot; links</strong> it may mean that the wrong linked entity references the Wikidata item for this feature.
                    &nbsp;<strong>Open the Wikidata item for the linked entity</strong> by clicking the last &quot;Wikidata&quot; link in the source row, it may contain a
                    &nbsp;<a href={`https://www.wikidata.org/wiki/Property:${sourcePreset.wikidata_indirect_property}`}><code>{sourcePreset.wikidata_indirect_property}</code></a>&nbsp;
                    relation to the wrong linked entity.
                    If you are Wikidata editor fix it yourself by removing the wrong relation, otherwise report the problem on the item&apos;s Discussion page:
                    <ol>
                        <li>At the top of the opened page click on &quot;Discussion&quot;</li>
                        <li>At the top of the opened page click on &quot;Add topic&quot;</li>
                        <li>Write in the title and description the problem you found in the item</li>
                        <li>Confirm your comment by clicking on the &quot;Add topic&quot; button below</li>
                    </ol>
                </li>}
                {!!sourcePreset.osm_wikidata_properties && <li>
                    <strong>If the source row includes multiple &quot;Wikidata&quot; links</strong> it may mean that the linked entity is referenced by the Wikidata item for this feature.
                    &nbsp;<strong>Open the Wikidata item for this feature</strong> by clicking the first &quot;Wikidata&quot; link in the source row, it may contain a
                    &nbsp;
                    {sourcePreset.osm_wikidata_properties?.map((prop, index) => <Fragment key={index}>
                        {index > 0 && index < (sourcePreset.osm_wikidata_properties!.length - 1) && ", "}
                        {index === (sourcePreset.osm_wikidata_properties!.length - 1) && " or "}
                        <a href={`https://www.wikidata.org/wiki/Property:${prop}`}><code>{prop}</code></a>
                    </Fragment>)}
                    &nbsp;
                    relation to the wrong linked entity.
                    If you are Wikidata editor fix it yourself, otherwise report the problem on the item&apos;s Discussion page:
                    <ol>
                        <li>At the top of the opened page click on &quot;Discussion&quot;</li>
                        <li>At the top of the opened page click on &quot;Add topic&quot;</li>
                        <li>Write the title and description of the problem you found in the item</li>
                        <li>Confirm your comment by clicking on the &quot;Add topic&quot; button below</li>
                    </ol>
                </li>}
            </ol>
        </section>}

        {anyLinkedEntity && !!process.env.owmf_propagate_data && <section id="propagation">
            <h3>Propagated linked entities</h3>
            <p>Database/PMTiles sources of this website include some linked entities that added through &quot;propagation&quot; that you won&apos;t find on the original sources (OSM and Wikidata)</p>
            <ol>
                <li>First off, it does a case insensitive search of names used by multiple roads far from each other which have all exactly and only the same etymology</li>
                <li>Then it copies that etymology to all other roads with the same name.</li>
            </ol>
        </section>}

        {anyLinkedEntity && <section id="contribute_linked_entity">
            <h2>How to contribute to linked entities</h2>
            <p>
                {t("title")} gets entities linked to map features from <a href="https://www.openstreetmap.org/welcome">OpenStreetMap</a> and information about the linked entities from <a href="https://www.wikidata.org/wiki/Wikidata:Introduction">Wikidata</a>.
                The following tools make it easier to contribute to OpenStreetMap by linking Wikidata entities:
            </p>
            <ul>
                {sourcePreset?.mapcomplete_theme && <li><a href={`https://mapcomplete.org/${sourcePreset?.mapcomplete_theme}`}>mapcomplete.org</a> helps discovering missing <code>*:wikidata</code> tags and find their possible value</li>}
                <li><a href="https://osm.wikidata.link/">osm.wikidata.link</a> helps discovering missing <code>wikidata</code> tags and find their possible value</li>
            </ul>
            <p>
                If those tools aren&apos;t enough for your needs and you want to manually add or correct entities linked to a map feature you can do it on <a href="https://www.openstreetmap.org/">openstreetmap.org</a>.
                You can learn how to map on <a href="https://www.openstreetmap.org/welcome">the official welcome page</a> and on <a href="https://learnosm.org/">LearnOSM</a>.
            </p>
            <p>
                The wikidata Q-ID of an item (object/person/...) can be found by searching its name on <a href="https://www.wikidata.org/wiki/Wikidata:Main_Page">wikidata.org</a>, once the subject will be opened its alphanumeric ID will be both on the right of the title and in the URL.
                Suppose for example that you want to link some item to Nelson Mandela: after searching it on wikidata you will find its page at <a href="https://www.wikidata.org/wiki/Q8023">https://www.wikidata.org/wiki/Q8023</a>. As can be seen at the end of the URL, its Q-ID is <code>Q8023</code>.
            </p>
            {t("title")} obtains linked entities from multiple OpenStreetMap tags and Wikidata properties:

            <table className={styles.tag_table}>
                <thead>
                    <tr>
                        <th>Platform</th>
                        <th>Property/Key</th>
                        <th>Links</th>
                        <th>Usage</th>
                    </tr>
                </thead>
                <tbody>
                    {sourcePreset.osm_wikidata_keys?.map(key => <tr key={key}>
                        <td>OpenStreetMap</td>
                        <td><code>{key}=*</code></td>
                        <td><a href={`https://wiki.openstreetmap.org/wiki/Key:${key}`}>OSM Wiki</a></td>
                        <td>Links the OSM element for the map feature directly to a Wikidata linked entity</td>
                    </tr>)}
                    {sourcePreset.osm_text_key && <tr>
                        <td>OpenStreetMap</td>
                        <td><code>{sourcePreset.osm_text_key}=*</code></td>
                        <td><a href={`https://wiki.openstreetmap.org/wiki/Key:${sourcePreset.osm_text_key}`}>OSM Wiki</a></td>
                        <td>The value for this tag is the title of a text-only linked entity</td>
                    </tr>}
                    {sourcePreset.osm_description_key && <tr>
                        <td>OpenStreetMap</td>
                        <td><code>{sourcePreset.osm_description_key}=*</code></td>
                        <td><a href={`https://wiki.openstreetmap.org/wiki/Key:${sourcePreset.osm_description_key}`}>OSM Wiki</a></td>
                        <td>The value for this tag is the description of a text-only linked entity</td>
                    </tr>}
                    {(!!sourcePreset.osm_wikidata_properties || !!sourcePreset.wikidata_indirect_property) && <>
                        <tr>
                            <td>Wikidata</td>
                            <td><code>P402</code></td>
                            <td><a href="https://www.wikidata.org/wiki/Property:P402">Wikidata</a></td>
                            <td>Links the Wikidata element for the map feature to the OSM item for the feature itself. The Wikidata item is then searched for any of the properties below.</td>
                        </tr>
                        <tr>
                            <td>OpenStreetMap</td>
                            <td><code>wikidata=*</code></td>
                            <td><a href="https://wiki.openstreetmap.org/wiki/Key:wikidata">OSM Wiki</a></td>
                            <td>Links the OSM element for the map feature to the Wikidata item for the feature itself (NOT the linked entity!). The Wikidata item is then searched for any of the properties below.</td>
                        </tr>
                    </>}
                    {sourcePreset.osm_wikidata_properties?.map(prop => <tr key={prop}>
                        <td>Wikidata</td>
                        <td><code>{prop}</code></td>
                        <td><a href={`https://www.wikidata.org/wiki/Property:${prop}`}>Wikidata</a></td>
                        <td>Links the Wikidata item for the map feature directly to a Wikidata linked entity</td>
                    </tr>)}
                    {sourcePreset.wikidata_indirect_property && <tr>
                        <td>Wikidata</td>
                        <td><code>{sourcePreset.wikidata_indirect_property}</code></td>
                        <td><a href={`https://www.wikidata.org/wiki/Property:${sourcePreset.wikidata_indirect_property}`}>Wikidata</a></td>
                        <td>Links a Wikidata linked entity directly to the Wikidata item for the map feature</td>
                    </tr>}
                </tbody>
            </table>
            <p>In order to display an entity linked to a map feature you need to create one of these combinations. Here&apos;s how to do it:</p>

            <ol>
                <li>Find the element of interest on <a href="https://www.openstreetmap.org/">openstreetmap.org</a></li>
                <li>Check out the element&apos;s tags:
                    <ul>
                        {sourcePreset.osm_wikidata_keys?.length && <li>
                            If the element has a
                            &nbsp;
                            {sourcePreset.osm_wikidata_keys.map((key, index) => <Fragment key={index}>
                                {index > 0 && index < (sourcePreset.osm_wikidata_keys!.length - 1) && ", "}
                                {index === (sourcePreset.osm_wikidata_keys!.length - 1) && " or "}
                                <a href={`https://wiki.openstreetmap.org/wiki/Key:${key}`}><code>{key}</code></a>
                            </Fragment>)}
                            &nbsp;
                            tag and this website&apos;s data has been updated in the meantime, then the element should already be available on the map.
                        </li>}
                        <li>If one of these tags is present and this website&apos;s data has been updated but the element isn&apos;t available on the map, then the tag value may contain an error (like not being a valid Wikidata ID).</li>
                        <li>If one of these tags is available but links to the wrong entity, search on Wikidata the ID for the correct entity ID and edit the incorrect tag with the new ID.</li>
                        <li>If the element has a <a href="https://wiki.openstreetmap.org/wiki/Key:wikidata"><code>wikidata</code></a> tag check the referenced Wikidata entity.
                            <ul>
                                <li>If it does not represent the same real world object of the OSM element, search the correct one and change it.</li>
                                <li>
                                    If it contains a
                                    &nbsp;
                                    {sourcePreset.osm_wikidata_properties?.map((prop, index) => <Fragment key={index}>
                                        {index > 0 && index < (sourcePreset.osm_wikidata_properties!.length - 1) && ", "}
                                        {index === (sourcePreset.osm_wikidata_properties!.length - 1) && " or "}
                                        <a href={`https://www.wikidata.org/wiki/Property:${prop}`}><code>{prop}</code></a>
                                    </Fragment>)}
                                    &nbsp;
                                    relation check that it links to the correct entity. If it is absent, add it:
                                    <ol>
                                        <li>Click &quot;+ Add statement&quot;</li>
                                        <li>On the left choose the appropriate property among those above</li>
                                        <li>On the right search the desired entity to use as the value</li>
                                    </ol>
                                </li>
                            </ul>
                        </li>
                        <li>If none of these tags is present, you can link the Wikidata item for the entity directly to the map feature:
                            <ol>
                                <li>Search the entity on Wikidata</li>
                                <li>If the Wikidata entity for the subject you want to use is not available you can create it on <a href="https://www.wikidata.org/wiki/Special:NewItem">https://www.wikidata.org/wiki/Special:NewItem</a> using the instructions on that page.</li>
                                <li>
                                    Add to the OpenStreetMap element the appropriate tag among those above with the Wikidata ID as value.
                                    {sourcePreset.id === "etymology" && <span>Using the example above, if you want to state an element is named after Nelson Mandela you will need to add the tag <code>name:etymology:wikidata</code>=<code>Q8023</code>.</span>}
                                </li>
                            </ol>
                        </li>
                    </ul>
                </li>
            </ol>
        </section>}

        <section id="contribute_map">
            <h2>How to contribute to the background map</h2>
            <p>The background maps are provided by external providers which are based on OpenStreetMap such as <a href="https://www.maptiler.com/">Maptiler</a>, <a href="https://stadiamaps.com/">Stadia Maps</a>, <a href="https://www.jawg.io/en/">Jawg</a> and <a href="https://www.mapbox.com/">Mapbox</a>.</p>
            <p>You can improve OpenStreetMap data on <a href="https://www.openstreetmap.org/">openstreetmap.org</a>. You can learn how to map on <a href="https://www.openstreetmap.org/welcome">the official welcome page</a> and on <a href="https://learnosm.org/">LearnOSM</a>.</p>
            <p>Keep in mind that these external providers doesn&apos;t update the map immediately so if you edit something on OpenStreetMap it may take some time to appear in the map.</p>
        </section>

        <section id="contribute_owmf">
            <h2>Contributing to OSM-Wikidata Map Framework</h2>
            <p>See <a href="https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md">CONTRIBUTING.md</a>.</p>
        </section>

        <hr />
        <small>
            Generated by OSM-Wikidata Map Framework {process.env.owmf_version} -
            &nbsp;
            <a href="https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/issues">Report an issue</a>
        </small>
    </div>
}