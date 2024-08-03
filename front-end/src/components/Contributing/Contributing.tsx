"use client";

import { loadClientI18n } from "@/src/i18n/client";
import { SourcePreset } from "@/src/model/SourcePreset";
import Link from "next/link";
import { FC, Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";

loadClientI18n().catch((e) => { throw e; });

interface ContributingProps {
    lang?: string;
    sourcePreset: SourcePreset;
}

export const Contributing: FC<ContributingProps> = ({ sourcePreset }) => {
    const { t } = useTranslation();
    const mapcompleteURL = useMemo(
        () => sourcePreset?.mapcomplete_theme ? `https://mapcomplete.org/${sourcePreset?.mapcomplete_theme}` : undefined,
        [sourcePreset?.mapcomplete_theme]
    );

    return <div>
        <Link href="/">&lt; Back to map</Link>

        <h1>{t("info_box.contribute")}</h1>

        {sourcePreset?.osm_wikidata_keys?.length && <div>
            <h2>How to report a problem in an entity linked to a feature</h2>
            <p>If a wrong entity is associated to the map feature:</p>
            <ol>
                <li>From the details window click on the &quot;OpenStreetMap&quot; button</li>
                <li>
                    On the left of the opened page check if one of the following tags is present:
                    <ul>{sourcePreset.osm_wikidata_keys.map(key => <li key={key}>
                        <a href={`https://wiki.openstreetmap.org/wiki/Key:${key}`}><code>{key}</code></a>
                    </li>)}</ul>
                    If it is, it means that OSM is directly linking to that entity.
                    Click on the dialog button on the right to add a note to the map and describe the problem.
                </li>
                <li>
                    If the tags above are absent, the <a href="https://wiki.openstreetmap.org/wiki/Key:wikidata"><code>wikidata</code></a> tag will be present and its value will be clickable.
                    Click on it.
                    If the opened page DOES NOT represent the map feature the `wikidata` tag points to the wrong item.
                    Either go back to the OpenStreetMap page and either fix it or click on the button on the right to add a note to the map and submit the problem.
                    If instead the opened page represents the map feature (not the linked entity, not something else), it should contain a
                    &nbsp;
                    {sourcePreset.osm_wikidata_properties?.map((prop, index) => <Fragment key={index}>
                        {index > 0 && index < (sourcePreset.osm_wikidata_properties!.length - 1) && ", "}
                        {index === (sourcePreset.osm_wikidata_properties!.length - 1) && " or "}
                        <a href={`https://www.wikidata.org/wiki/Property:${prop}`}><code>{prop}</code></a>
                    </Fragment>)}
                    &nbsp;
                    relation to the wrong item:
                    <ol>
                        <li>At the top of the opened page click on &quot;Discussion&quot;</li>
                        <li>Append in the opened text box the description of the problem you found in the etymology for the item</li>
                        <li>Confirm your comment by clicking on the blue button below</li>
                    </ol>
                </li>
            </ol>
        </div>}

        <h2>How to report a problem in an entity</h2>
        <p>If the entity associated to the map feature is correct but there is a problem in the details (birth date, nationality, ...):</p>
        <ol>
            <li>From the details window click on the &quot;Wikidata&quot; button for the incorrect etymology</li>
            <li>At the top of the opened page click on &quot;Discussion&quot;</li>
            <li>Append in the opened text box the description of the problem you found in the data</li>
            <li>Confirm your comment by clicking on the blue button below</li>
        </ol>

        <h2>How to contribute to linked entities</h2>
        <p>{t("title")} gets entities linked to map features from [OpenStreetMap](https://www.openstreetmap.org/welcome) and information about the etymology subjects from <a href="https://www.wikidata.org/wiki/Wikidata:Introduction">Wikidata</a>.</p>
        <p>Some tools make it easy to contribute to OpenStreetMap by linking entities:</p>

        <ul>
            {mapcompleteURL && <li><a href={mapcompleteURL}>mapcomplete.org</a> helps discovering missing <code>*:wikidata</code> tags and find their possible value</li>}
            <li><a href="https://osm.wikidata.link/">osm.wikidata.link</a> helps discovering missing <code>wikidata</code> tags and find their possible value</li>
        </ul>
        <p>If those tools aren&apos;t enough for your needs and you want to manually add or correct entities linked to a map feature you can do it on <a href="https://www.openstreetmap.org/">openstreetmap.org</a>.</p>
        <p>You can learn how to map on <a href="https://www.openstreetmap.org/welcome">the official welcome page</a> and on <a href="https://learnosm.org/">LearnOSM</a>.</p>
        <p>The wikidata ID of an item (object/person/...) can be found by searching its name on <a href="https://www.wikidata.org/wiki/Wikidata:Main_Page">wikidata.org</a>, once the subject will be opened its alphanumeric ID will be both on the right of the title and in the URL.</p>
        {sourcePreset.id === "etymology" && <p>Suppose for example that you want to tag something named after Nelson Mandela: after searching it on wikidata you will find its page at <a href="https://www.wikidata.org/wiki/Q8023">https://www.wikidata.org/wiki/Q8023</a> . As can be seen from the URL, its ID is <code>Q8023</code>.</p>}
        <p>{t("title")} obtains linked entities from multiple tags:</p>

        <p>Possible patterns of tags and properties used by {t("title")} are listed in <a href="https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/README.md">README.md</a>. Examples of tags and properties to be configured for these patterns are:</p>

        <table>
            <thead>
                <tr>
                    <th>Platform</th>
                    <th>Property/Key</th>
                    <th>Other info</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>OpenStreetMap</td>
                    <td><code>wikidata</code></td>
                    <td><a href="https://wiki.openstreetmap.org/wiki/Key:wikidata">Documentation</a></td>
                </tr>
                {sourcePreset.osm_wikidata_keys?.map(key => <tr key={key}>
                    <td>OpenStreetMap</td>
                    <td><code>{key}</code></td>
                    <td><a href={`https://wiki.openstreetmap.org/wiki/Key:${key}`}>Documentation</a></td>
                </tr>)}
                {sourcePreset.osm_text_key && <tr>
                    <td>OpenStreetMap</td>
                    <td><code>{sourcePreset.osm_text_key}</code></td>
                    <td><a href={`https://wiki.openstreetmap.org/wiki/Key:${sourcePreset.osm_text_key}`}>Documentation</a></td>
                </tr>}
                {sourcePreset.osm_description_key && <tr>
                    <td>OpenStreetMap</td>
                    <td><code>{sourcePreset.osm_description_key}</code></td>
                    <td><a href={`https://wiki.openstreetmap.org/wiki/Key:${sourcePreset.osm_description_key}`}>Documentation</a></td>
                </tr>}
                {sourcePreset.osm_wikidata_properties?.map(prop => <tr key={prop}>
                    <td>Wikidata</td>
                    <td><code>{prop}</code></td>
                    <td><a href={`https://www.wikidata.org/wiki/Property:${prop}`}>Info</a></td>
                </tr>)}
                {sourcePreset.wikidata_indirect_property && <tr>
                    <td>Wikidata</td>
                    <td><code>{sourcePreset.wikidata_indirect_property}</code></td>
                    <td><a href={`https://www.wikidata.org/wiki/Property:${sourcePreset.wikidata_indirect_property}`}>Info</a></td>
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

        <h2>How to contribute to the background map</h2>

        <p>The background maps are provided by external providers which are based on OpenStreetMap such as <a href="https://www.maptiler.com/">Maptiler</a>, <a href="https://stadiamaps.com/">Stadia Maps</a>, <a href="https://www.jawg.io/en/">Jawg</a> and <a href="https://www.mapbox.com/">Mapbox</a>.</p>
        <p>You can improve OpenStreetMap data on <a href="https://www.openstreetmap.org/">openstreetmap.org</a>. You can learn how to map on <a href="https://www.openstreetmap.org/welcome">the official welcome page</a> and on <a href="https://learnosm.org/">LearnOSM</a>.</p>
        <p>Keep in mind that these external providers doesn&apos;t update the map immediately so if you edit something on OpenStreetMap it may take some time to appear in the map.</p>

        <h2>Contributing to OSM-Wikidata Map Framework</h2>
        <p>See <a href="https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md">CONTRIBUTING.md</a>.</p>

        <hr />
        <small>
            Generated by OSM-Wikidata Map Framework {process.env.owmf_version} -
            &nbsp;
            <a href="https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/issues">Report an issue</a>
        </small>
    </div>
}