import osmTagDiagram from "@/src/img/data/osm_name_etymology.png";
import directDiagram from "@/src/img/data/osm_wikidata_direct.png";
import reverseDiagram from "@/src/img/data/osm_wikidata_reverse.png";
import propagationDiagram from "@/src/img/data/propagation.png";
import { SourcePreset } from "@/src/model/SourcePreset";
import Image from "next/image";
import Link from "next/link";
import { FC, Fragment } from "react";
import styles from "./Contributing.module.css";
import { loadServerI18n } from "@/src/i18n/server";

interface ContributingProps {
    lang?: string;
    sourcePreset: SourcePreset;
}

export const Contributing: FC<ContributingProps> = async ({ lang, sourcePreset }) => {
    const { t } = await loadServerI18n(lang),
        anyLinkedEntity = !!sourcePreset?.osm_wikidata_keys || !!sourcePreset?.osm_wikidata_properties || !!sourcePreset?.wikidata_indirect_property || !!sourcePreset?.osm_text_key,
        anyPropagation = anyLinkedEntity && process.env.NEXT_PUBLIC_OWMF_pmtiles_preset === sourcePreset.id;

    return <div className={styles.container}>
        <Link href="/">&lt; Back to map</Link>

        <h1>{t("info_box.contribute", "Contribute to the map")}</h1>

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
            <p>If a wrong entity is associated to the map feature you can use the linked entity&apos;s source row to find the source of the error:</p>
            <ol>
                {anyPropagation && <li>
                    If the source row includes the &quot;{t("etymology_details.propagation")}&quot; step, skip to the <a href="#propagation">next section below</a>.
                </li>}
                {!!sourcePreset.osm_text_key && <li>
                    <strong>If the source row starts with &quot;OpenStreetMap&quot; and does not include any &quot;Wikidata&quot; link</strong>, then the text-only linked entity is taken from the <a href={`https://wiki.openstreetmap.org/wiki/Key:${sourcePreset.osm_text_key}`}><code>{sourcePreset.osm_text_key}</code></a> tag on the OSM element for this feature.
                    &nbsp;<strong>Open the OSM item for this feature</strong> by clicking the &quot;OpenStreetMap&quot; link in the source row.
                    On the left of the OSM element&apos;s page the value for the tag <a href={`https://wiki.openstreetmap.org/wiki/Key:${sourcePreset.osm_text_key}`}><code>{sourcePreset.osm_text_key}</code></a> will be the wrong entity you noticed. 
                    If you are an OSM mapper you can fix it yourself, otherwise click on the dialog button on the right to add a note to the map and describe the problem.
                </li>}
                {!!sourcePreset.osm_wikidata_keys && <li>
                    <strong>If the source row starts with &quot;OpenStreetMap&quot; and does include only one &quot;Wikidata&quot; link</strong>, then the OSM element for this map feature is directly linking to the Wikidata entity.
                    &nbsp;<strong>Open the OSM item for this feature</strong> by clicking the &quot;OpenStreetMap&quot; link in the source row.
                    On the left of the OSM element&apos;s page one of the following tags should be present:
                    <ul>{sourcePreset.osm_wikidata_keys.map(key => <li key={key}>
                        <a href={`https://wiki.openstreetmap.org/wiki/Key:${key}`}><code>{key}</code></a>
                    </li>)}</ul>
                    The value for that tag should be the ID of the wrong Wikidata linked entity that you noticed.
                    If you are an OSM mapper you can fix it yourself, otherwise click on the dialog button on the right to add a note to the map and describe the problem.
                </li>}
                {(!!sourcePreset.osm_wikidata_properties || !!sourcePreset?.wikidata_indirect_property) && <li>
                    <strong>If the source row starts with &quot;OpenStreetMap&quot; and includes multiple &quot;Wikidata&quot; links</strong> it means that the OSM element for this feature links to the Wikidata item for this feature through the <a href="https://wiki.openstreetmap.org/wiki/Key:wikidata"><code>wikidata</code></a> tag.
                    &nbsp;<strong>Open the Wikidata item for this feature</strong> by clicking the first &quot;Wikidata&quot; link in the source row.
                    If the content of the opened page DOES NOT represent the map feature (e.g. it represents the linked entity or something else) then the OSM element&apos;s <a href="https://wiki.openstreetmap.org/wiki/Key:wikidata"><code>wikidata</code></a> tag points to the wrong item.
                    Go back to the source row and open the OSM element by clicking on the first &quot;OpenStreetMap&quot; link.
                    On the left of the OSM element&apos;s page a <code>wikidata</code> tag will be present and its value will be wrong.
                    If you are an OSM mapper you can fix it yourself, otherwise click on the dialog button on the right to add a note to the map and describe the problem.
                </li>}
                {!!sourcePreset.wikidata_indirect_property && <li>
                    <strong>If the source row includes multiple &quot;Wikidata&quot; links</strong> it may mean that the wrong linked entity references the Wikidata item for this feature.
                    &nbsp;<strong>Open the Wikidata item for the linked entity</strong> by clicking the last &quot;Wikidata&quot; link in the source row, it may contain a
                    &nbsp;<a href={`https://www.wikidata.org/wiki/Property:${sourcePreset.wikidata_indirect_property}`}><code>{sourcePreset.wikidata_indirect_property}</code></a>&nbsp;
                    relation to the wrong linked entity.
                    If you are Wikidata editor you can fix it yourself by removing the wrong relation, otherwise report the problem on the item&apos;s Discussion page:
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
                        {index > 0 && index === (sourcePreset.osm_wikidata_properties!.length - 1) && " or "}
                        <a href={`https://www.wikidata.org/wiki/Property:${prop}`}><code>{prop}</code></a>
                    </Fragment>)}
                    &nbsp;
                    relation to the wrong linked entity.
                    If you are Wikidata editor you can fix it yourself, otherwise report the problem on the item&apos;s Discussion page:
                    <ol>
                        <li>At the top of the opened page click on &quot;Discussion&quot;</li>
                        <li>At the top of the opened page click on &quot;Add topic&quot;</li>
                        <li>Write the title and description of the problem you found in the item</li>
                        <li>Confirm your comment by clicking on the &quot;Add topic&quot; button below</li>
                    </ol>
                </li>}
            </ol>
        </section>}

        {anyPropagation && <section id="propagation">
            <h3>Propagated linked entities</h3>
            <p>Database/PMTiles sources of this website include some linked entities that you won&apos;t find on the original sources (OSM and Wikidata).
                These are added through a data enhancement technique called &quot;propagation&quot; which follows these steps:
            </p>
            <ol>
                <li>All linked entities from original sources are gathered</li>
                <li>A case insensitive list of names used by multiple roads far from each other which have all exactly and only the same linked entity is compiled</li>
                <li>Then, for each name, linked entities are copied to all other roads with the same (case insensitive) name.</li>
            </ol>
            <p>For example, if a site shows what elements are named after and among all elements <strong>that have this information</strong> ALL roads that are named &quot;Via Roma&quot; are linked to the entity <a href="https://www.wikidata.org/wiki/Q220"><code>Q220</code></a> (Rome), then also all other roads named &quot;Via Roma&quot; and don&apos;t yet have this link are linked to the same entity:</p>
            <Image
                alt={"Propagation example diagram"}
                src={propagationDiagram}
                width={500}
                height={333} />
            <p>If you find an element that is linked to the wrong entity and you want to fix it or report the problem, check the linked entity&apos;s source row.
                If it includes the &quot;{t("etymology_details.propagation")}&quot; step, check whether the bad link is caused by a wrong propagation.
                You can check the source of the copied link by clicking the first and last link in the source row, you will be taken respectively to the OSM page for the map feature and to the Wikidata page for the linked entity.
                If the linked entity was correct for the original OSM element but is wrong after being copied on the current feature, then this is the fault of the propagation and you should open an issue on OSM-Wikidata Map Feature&apos;s <a href="https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/issues">GitLab</a> or <a href="https://github.com/Danysan1/osm-wikidata-map-framework/issues">GitHub</a> projects.
                Otherwise the wrong link comes from the original source and you should fix/report it by following <a href="#report_linked_entity">the steps above</a>.</p>
        </section>}

        {anyLinkedEntity && <section id="contribute_linked_entity">
            <h2>How to contribute to linked entities</h2>
            <p>
                {t("title")} gets entities linked to map features from <a href="https://www.openstreetmap.org/welcome">OpenStreetMap</a> and information about the linked entities from <a href="https://www.wikidata.org/wiki/Wikidata:Introduction">Wikidata</a>.
                The following tools make it easier to contribute to OpenStreetMap by linking Wikidata entities:
            </p>
            <ul>
                {sourcePreset?.mapcomplete_theme && <li><a href={`https://mapcomplete.org/${sourcePreset?.mapcomplete_theme}`}>MapComplete</a> helps discovering missing <code>*:wikidata</code> tags and find their possible value</li>}
                <li><a href="https://osm.wikidata.link/">OSM ↔ Wikidata matcher</a> helps discovering missing <code>wikidata</code> tags and find their possible value</li>
                <li><a href="https://map.osm.wikidata.link/">OWL map</a> helps discovering missing <code>wikidata</code> tags directly on a map</li>
                <li><a href="https://www.openstreetmap.org/">openstreetmap.org</a> allows to manually edit map elements (you can learn how to map on <a href="https://www.openstreetmap.org/welcome">the official welcome page</a> and on <a href="https://learnosm.org/">LearnOSM</a>)</li>
            </ul>
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
                    {sourcePreset.osm_wikidata_keys?.map((key, index) => <tr key={key}>
                        <td>OpenStreetMap</td>
                        <td><code>{key}=*</code></td>
                        <td><a href={`https://wiki.openstreetmap.org/wiki/Key:${key}`}>OSM Wiki</a></td>
                        {index === 0 && <td rowSpan={sourcePreset.osm_wikidata_keys?.length}>
                            Links the OSM element for the map feature directly to a Wikidata entity. Example:<br />
                            <Image
                                alt={"OSM to Wikidata diagram"}
                                src={osmTagDiagram}
                                width={420} />
                        </td>}
                    </tr>)}
                    {sourcePreset.osm_text_key && <tr>
                        <td>OpenStreetMap</td>
                        <td><code>{sourcePreset.osm_text_key}=*</code></td>
                        <td><a href={`https://wiki.openstreetmap.org/wiki/Key:${sourcePreset.osm_text_key}`}>OSM Wiki</a></td>
                        <td>The value for this tag is used as title of a text-only linked entity</td>
                    </tr>}
                    {sourcePreset.osm_description_key && <tr>
                        <td>OpenStreetMap</td>
                        <td><code>{sourcePreset.osm_description_key}=*</code></td>
                        <td><a href={`https://wiki.openstreetmap.org/wiki/Key:${sourcePreset.osm_description_key}`}>OSM Wiki</a></td>
                        <td>The value for this tag is used as description of a text-only linked entity</td>
                    </tr>}
                    {(!!sourcePreset.osm_wikidata_properties || !!sourcePreset.wikidata_indirect_property) && <>
                        <tr>
                            <td>Wikidata</td>
                            <td><code>P11693</code> (OpenStreetMap node ID)</td>
                            <td><a href="https://www.wikidata.org/wiki/Property:P11693">Wikidata</a></td>
                            <td rowSpan={4 + (sourcePreset.osm_wikidata_properties ? sourcePreset.osm_wikidata_properties.length : 1)}>
                                The link is inferred by combining a OSM-Wikidata same-entity tag/property with an intra-Wikidata link property. Example:<br />
                                <Image
                                    alt={"OSM+Wikidata diagram"}
                                    src={sourcePreset.osm_wikidata_properties ? directDiagram : reverseDiagram}
                                    width={sourcePreset.osm_wikidata_properties ? 500 : 400} />
                            </td>
                        </tr>
                        <tr>
                            <td>Wikidata</td>
                            <td><code>P10689</code> (OpenStreetMap way ID)</td>
                            <td><a href="https://www.wikidata.org/wiki/Property:P10689">Wikidata</a></td>
                        </tr>
                        <tr>
                            <td>Wikidata</td>
                            <td><code>P402</code> (OpenStreetMap relation ID)</td>
                            <td><a href="https://www.wikidata.org/wiki/Property:P402">Wikidata</a></td>
                        </tr>
                        <tr>
                            <td>OpenStreetMap</td>
                            <td><code>wikidata=*</code></td>
                            <td><a href="https://wiki.openstreetmap.org/wiki/Key:wikidata">OSM Wiki</a></td>
                        </tr>
                    </>}
                    {sourcePreset.osm_wikidata_properties?.map(prop => <tr key={prop}>
                        <td>Wikidata</td>
                        <td><code>{prop}</code></td>
                        <td><a href={`https://www.wikidata.org/wiki/Property:${prop}`}>Wikidata</a></td>
                    </tr>)}
                    {sourcePreset.wikidata_indirect_property && <tr>
                        <td>Wikidata</td>
                        <td><code>{sourcePreset.wikidata_indirect_property}</code></td>
                        <td><a href={`https://www.wikidata.org/wiki/Property:${sourcePreset.wikidata_indirect_property}`}>Wikidata</a></td>
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
                                {index > 0 && index === (sourcePreset.osm_wikidata_keys!.length - 1) && " or "}
                                <a href={`https://wiki.openstreetmap.org/wiki/Key:${key}`}><code>{key}</code></a>
                            </Fragment>)}
                            &nbsp;
                            tag and this website&apos;s data has been updated since it has been added, then the element should already be available on the map.
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
                                        {index > 0 && index === (sourcePreset.osm_wikidata_properties!.length - 1) && " or "}
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
            <p>The background maps are provided by third-party providers:</p>
            <ul>
                {!!process.env.NEXT_PUBLIC_OWMF_maptiler_key && <li><a href="https://www.maptiler.com/">Maptiler</a></li>}
                {process.env.NEXT_PUBLIC_OWMF_enable_versatiles === "true" && <li><a href="https://versatiles.org/">VersaTiles</a></li>}
                {process.env.NEXT_PUBLIC_OWMF_enable_stadia_maps === "true" && <li><a href="https://stadiamaps.com/">Stadia Maps</a></li>}
                {!!process.env.NEXT_PUBLIC_OWMF_jawg_token && <li><a href="https://www.jawg.io/en/">Jawg</a></li>}
                {!!process.env.NEXT_PUBLIC_OWMF_tracestrack_key && <li><a href="https://tracestrack.com/">Tracestrack</a></li>}
                {!!process.env.NEXT_PUBLIC_OWMF_mapbox_token && <li><a href="https://www.mapbox.com/">Mapbox</a></li>}
                {process.env.NEXT_PUBLIC_OWMF_enable_open_historical_map === "true" && <li><a href="https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Reuse">OpenHistoricalMap</a></li>}
            </ul>
            <p>Most of them render data from OpenStreetMap, which can be improved on <a href="https://www.openstreetmap.org/">openstreetmap.org</a>.
                You can learn how to map on <a href="https://www.openstreetmap.org/welcome">the official welcome page</a> and on <a href="https://learnosm.org/">LearnOSM</a>.
                Keep in mind that these external providers don&apos;t update the map immediately so if you edit something on OpenStreetMap it may take a lot of time to appear in the map.</p>
        </section>

        <section id="contribute_owmf">
            <h2>Contributing to OSM-Wikidata Map Framework</h2>
            <p>See <a href="https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md">CONTRIBUTING.md</a>.</p>
        </section>

        <hr />
        <small>
            Generated by OSM-Wikidata Map Framework {process.env.NEXT_PUBLIC_OWMF_version} -
            &nbsp;
            <a href="https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/issues">Report an issue</a>
        </small>
    </div>
}