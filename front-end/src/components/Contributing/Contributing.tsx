"use client";

import { loadClientI18n } from "@/src/i18n/client";
import { SourcePreset } from "@/src/model/SourcePreset";
import { FC, useMemo } from "react";
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
        <h1>{t("info_box.contribute")}</h1>

        {sourcePreset?.osm_wikidata_keys?.length && <>
            <h2>How to report a problem in the etymology of an element</h2>
            <p>If the problem is related to the etymology itself (a wrong etymology is associated to the element):</p>
            <ol>
                <li>From the etymology window click on the &quot;OpenStreetMap&quot; button</li>
                <li>
                    On the left of the opened page check if one of the following tags is present:
                    <ul>{sourcePreset.osm_wikidata_keys.map(key => <li key={key}><code>{key}</code></li>)}</ul>
                    If it is, click on the dialog button on the right to add a note to the map and describe the problem
                </li>
                <li>
                    If the tags above are absent, the <code>wikidata</code> tag will be present and its value will be clickable.
                    Click on it.
                    If the opened page DOES NOT represent the element from the map the `wikidata` tag points to the wrong item.
                    Either go back to the OpenStreetMap page and either fix it or click on the button on the right to add a note to the map and submit the problem.
                    If instead the opened page represents the element from the map (not its etymology, not something else), it should contain a &quot;named after&quot; or &quot;dedicated to&quot; relation to the wrong item:
                    <ol>
                        <li>At the top of the opened page click on &quot;Discussion&quot;</li>
                        <li>Append in the opened text box the description of the problem you found in the etymology for the item</li>
                        <li>Confirm your comment by clicking on the blue button below</li>
                    </ol>
                </li>
            </ol>
        </>}

        <h2>How to report a problem in an element</h2>
        <p>If the etymology associated to the element is correct but there is a problem in the details (birth date, nationality, ...):</p>
        <ol>
            <li>From the etymology window click on the &quot;Wikidata&quot; button for the incorrect etymology</li>
            <li>At the top of the opened page click on &quot;Discussion&quot;</li>
            <li>Append in the opened text box the description of the problem you found in the data</li>
            <li>Confirm your comment by clicking on the blue button below</li>
        </ol>

        <h2>How to contribute to the etymology data</h2>
        <p>OSM-Wikidata Map Framework gets the etymology of elements on the map from [OpenStreetMap](https://www.openstreetmap.org/welcome) and information about the etymology subjects from <a href="https://www.wikidata.org/wiki/Wikidata:Introduction">Wikidata</a>.</p>
        <p>Some tools make it easy to contribute to OpenStreetMap by linking etymology data:</p>

        <ul>
            {mapcompleteURL && <li><a href={mapcompleteURL}>mapcomplete.org</a> helps discovering missing <code>*:wikidata</code> tags and find their possible value</li>}
            <li><a href="https://osm.wikidata.link/">osm.wikidata.link</a> helps discovering missing <code>wikidata</code> tags and find their possible value</li>
        </ul>
        <p>If those tools aren&apos;t enough for your needs and you want to manually add or correct the etymology of an element you can do it on <a href="https://www.openstreetmap.org/">openstreetmap.org</a>.</p>
        <p>You can learn how to map on <a href="https://www.openstreetmap.org/welcome">the official welcome page</a> and on <a href="https://learnosm.org/">LearnOSM</a>.</p>
        <p>The wikidata ID of an item (object/person/...) can be found by searching its name on <a href="https://www.wikidata.org/wiki/Wikidata:Main_Page">wikidata.org</a>, once the subject will be opened its alphanumeric ID will be both on the right of the title and in the URL.</p>
        <p>Suppose for example that you want to tag something named after Nelson Mandela: after searching it on wikidata you will find its page at <a href="https://www.wikidata.org/wiki/Q8023">https://www.wikidata.org/wiki/Q8023</a> . As can be seen from the URL, its ID is <code>Q8023</code>.</p>
        <p>OSM-Wikidata Map Framework obtains the etymology data from multiple tags:</p>

        <p>Possible patterns of tags and properties used by OSM-Wikidata Map Framework are listed in <a href="https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/README.md">README.md</a>. Examples of tags and properties to be configured for these patterns are:</p>

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
        <p>In order to display the etymology of an element you need to create one of these combinations. Here&apos;s how to do it:</p>

        <ol>
            <li>Find the element of interest on <a href="https://www.openstreetmap.org/">openstreetmap.org</a></li>
            <li>Check out the element&apos;s tags:
                <ul>
                    <li>If the element has a <code>name:etymology:wikidata</code>, <code>subject:wikidata</code> or <code>buried:wikidata</code> tag and two weeks have passed from their addition, then the element should already be available on OSM-Wikidata Map Framework.</li>
                    <li>If one of these tags is present and the time period has passed but the element isn&apos;t available on OWMF, then the tag value may contain an error (like not being a valid Wikidata ID).</li>
                    <li>If one of these tags is available but liks to the wrong etymology/subject, search on Wikidata the ID for the correct etymology/subject and edit the incorrect tag with the new ID.</li>
                    <li>If the element has a <code>wikidata</code> tag check the referenced Wikidata element.</li>
                    <li>If it does not represent the same real world object of the OSM element, search the correct one and change it.</li>
                    <li>If it contains a <code>P138</code> (&quot;named after&quot;), <code>P547</code> (&quot;commemorates&quot;) or <code>P825</code> (&quot;dedicated to&quot;) relation check that it links to the correct etymology. If it is absent, add it:
                        <ol>
                            <li>Click &quot;+ Add statement&quot;</li>
                            <li>On the left choose <code>P138</code>, <code>P547</code> or <code>P825</code> (depending on which is more appropriate) as property</li>
                            <li>On the right search the desired etymology to use as the value</li>
                        </ol>
                    </li>
                    <li>If none of these tags is present, you can link the Wikidata item for the etymology to the element
                        <ol>
                            <li>Search the etymology on Wikidata</li>
                            <li>If the Wikidata element for the etymology is not available you can create it <a href="https://www.wikidata.org/wiki/Special:NewItem">on this Wikidata page</a> using the instructions on that page.</li>
                            <li>Add to the OpenStreetMap element the <code>name:etymology:wikidata</code>, <code>subject:wikidata</code> or <code>buried:wikidata</code> tag (depending on the meaning of the etymology) with the Wikidata ID as value. Using the example above, if you want to state an element is named after Nelson Mandela you will need to add the tag <code>name:etymology:wikidata</code>=<code>Q8023</code>.</li>
                        </ol>
                    </li>
                </ul>
            </li>
        </ol>

        <h2>How to contribute to the background map</h2>

        <p>The background maps are provided by external providers which are based on OpenStreetMap such as <a href="https://www.maptiler.com/">Maptiler</a>, <a href="https://stadiamaps.com/">Stadia Maps</a>, <a href="https://www.jawg.io/en/">Jawg</a> and <a href="https://www.mapbox.com/">Mapbox</a>.</p>
        <p>You can improve OpenStreetMap data on <a href="https://www.openstreetmap.org/">openstreetmap.org</a>.</p>
        <p>You can learn how to map on <a href="https://www.openstreetmap.org/welcome">the official welcome page</a> and on <a href="https://learnosm.org/">LearnOSM</a>.</p>
        <p>Keep in mind that these external providers doesn&apos;t update the map immediately so if you edit something on OpenStreetMap it may take some time to appear in the map.</p>

        <h2>Contributing to OSM-Wikidata Map Framework</h2>
        <p>See <a href="https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md">CONTRIBUTING.md</a>.</p>
    </div>
}