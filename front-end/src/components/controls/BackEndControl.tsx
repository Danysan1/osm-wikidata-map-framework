import { parseBoolConfig } from "@/src/config";
import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { osmKeyToKeyID } from "@/src/model/EtymologyResponse";
import { SourcePreset } from "@/src/model/SourcePreset";
import { ControlPosition } from "maplibre-gl";
import { useTranslation } from "next-i18next";
import { FC, useCallback, useMemo } from "react";
import { DropdownControl, DropdownItem } from "./DropdownControl";

interface BackEndControlProps {
    preset: SourcePreset;
    position?: ControlPosition;
}

const PMTILES_GROUP_NAME = "Database (PMTiles)",
    OVERPASS_GROUP_NAME = "OpenStreetMap (Overpass API)",
    WDQS_GROUP_NAME = "Wikidata Query Service",
    OVERPASS_WDQS_GROUP_NAME = "OSM (Overpass API) + Wikidata Query Service",
    QLEVER_GROUP_NAME = "QLever (beta)";

/**
 * Let the user choose the back-end from a list of available back-ends for the current instance and source props.preset.
 **/
export const BackEndControl: FC<BackEndControlProps> = (props) => {
    const { t } = useTranslation(),
        { backEndID, setBackEndID } = useUrlFragmentContext(),
        dropdownItems = useMemo(() => {
            const propagationEnabled = parseBoolConfig("propagate_data"),
                qleverEnabled = parseBoolConfig("qlever_enable"),
                pmtilesURL = process.env.owmf_pmtiles_base_url,
                dropdownItems: DropdownItem[] = [],
                buildDropdownItem = (backEndID: string, text: string, category?: string): DropdownItem => ({
                    id: backEndID,
                    text: text,
                    category: category,
                    onSelect: () => setBackEndID(backEndID)
                });

            if (pmtilesURL)
                dropdownItems.push(buildDropdownItem("pmtiles_all", t("source.db_all", "All sources from DB"), PMTILES_GROUP_NAME));

            const allKeysText = t("source.all_osm_keys", "All OSM keys");
            if (props.preset.osm_wikidata_keys?.length)
                dropdownItems.push(buildDropdownItem("overpass_all", allKeysText, OVERPASS_GROUP_NAME));

            if (props.preset.osm_wikidata_properties?.length) {
                /**
                 * @example "Wikidata P138/P825/P547"
                 */
                const wikidataDirectText = "Wikidata " + props.preset.osm_wikidata_properties.join("/");
                /**
                 * @example "OSM wikidata=* > Wikidata P138/P825/P547"
                 */
                const osmWikidataDirectText = `OSM wikidata=* > ${wikidataDirectText}`;
                if (pmtilesURL) {
                    dropdownItems.push(buildDropdownItem("pmtiles_osm_wikidata_direct", osmWikidataDirectText, PMTILES_GROUP_NAME));
                    dropdownItems.push(buildDropdownItem("pmtiles_wd_direct", wikidataDirectText, PMTILES_GROUP_NAME));
                }
                if (props.preset.osm_wikidata_keys?.length)
                    dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_direct", `${allKeysText} + ${wikidataDirectText}`, OVERPASS_WDQS_GROUP_NAME));

                dropdownItems.push(buildDropdownItem("overpass_wd+wd_direct", osmWikidataDirectText, OVERPASS_WDQS_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("wd_direct", wikidataDirectText, WDQS_GROUP_NAME));
                if (qleverEnabled) {
                    dropdownItems.push(buildDropdownItem("qlever_wd_direct", `${wikidataDirectText} (beta)`, QLEVER_GROUP_NAME));
                    dropdownItems.push(buildDropdownItem("qlever_osm_wikidata_direct", `${osmWikidataDirectText} (beta)`, QLEVER_GROUP_NAME));
                    //dropdownItems.push(buildDropdownItem("qlever_osm_all_wd_direct", `${allKeysText} + ${wikidataDirectText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
                }
            }

            if (props.preset.wikidata_indirect_property) {
                const indirectText = t("source.wd_indirect", "P625 qualifiers on {{indirectWdProperty}} and Wikidata entities referenced with {{indirectWdProperty}}", { indirectWdProperty: props.preset.wikidata_indirect_property }),
                    qualifierText = t("source.wd_qualifier", "P625 qualifiers on {{indirectWdProperty}}", { indirectWdProperty: props.preset.wikidata_indirect_property }),
                    reverseText = t("source.wd_reverse", "Wikidata entities referenced with {{indirectWdProperty}}", { indirectWdProperty: props.preset.wikidata_indirect_property });

                if (props.preset.osm_wikidata_keys?.length) {
                    dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_indirect", `${allKeysText} + ${indirectText}`, OVERPASS_WDQS_GROUP_NAME));
                    dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_qualifier", `${allKeysText} + ${qualifierText}`, OVERPASS_WDQS_GROUP_NAME));
                    dropdownItems.push(buildDropdownItem("overpass_all_wd+wd_reverse", `${allKeysText} + ${reverseText}`, OVERPASS_WDQS_GROUP_NAME));
                }
                dropdownItems.push(buildDropdownItem("overpass_wd+wd_indirect", `OSM wikidata=* > ${indirectText}`, OVERPASS_WDQS_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("overpass_wd+wd_reverse", `OSM wikidata=* > ${reverseText}`, OVERPASS_WDQS_GROUP_NAME));

                dropdownItems.push(buildDropdownItem("wd_indirect", indirectText, WDQS_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("wd_qualifier", qualifierText, WDQS_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("wd_reverse", reverseText, WDQS_GROUP_NAME));

                if (qleverEnabled) {
                    if (props.preset.osm_wikidata_keys?.length) {
                        // dropdownItems.push(buildDropdownItem("qlever_osm_all_indirect", `${allKeysText} + ${indirectText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
                        // dropdownItems.push(buildDropdownItem("qlever_osm_all_qualifier", `${allKeysText} + ${qualifierText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
                        // dropdownItems.push(buildDropdownItem("qlever_osm_all_reverse", `${allKeysText} + ${reverseText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
                    }
                    // dropdownItems.push(buildDropdownItem("qlever_osm_wikidata_indirect", `OSM wikidata=* > ${indirectText} (beta)`, QLEVER_GROUP_NAME)); // TODO: implement and enable
                    dropdownItems.push(buildDropdownItem("qlever_osm_wikidata_reverse", `OSM wikidata=* > ${reverseText} (beta)`, QLEVER_GROUP_NAME));
                    dropdownItems.push(buildDropdownItem("qlever_wd_indirect", `${indirectText} (beta)`, QLEVER_GROUP_NAME));
                    dropdownItems.push(buildDropdownItem("qlever_wd_qualifier", `${qualifierText} (beta)`, QLEVER_GROUP_NAME));
                    dropdownItems.push(buildDropdownItem("qlever_wd_reverse", `${reverseText} (beta)`, QLEVER_GROUP_NAME));
                }
            }

            if (props.preset.osm_wikidata_keys?.length && qleverEnabled)
                dropdownItems.push(buildDropdownItem("qlever_osm_all", `${allKeysText} (beta)`, QLEVER_GROUP_NAME));

            props.preset.osm_wikidata_keys?.forEach(key => {
                const keyID = osmKeyToKeyID(key),
                    keyText = "OSM " + key;
                dropdownItems.push(buildDropdownItem("overpass_" + keyID, keyText, OVERPASS_GROUP_NAME));
                if (pmtilesURL)
                    dropdownItems.push(buildDropdownItem("pmtiles_" + keyID, keyText, PMTILES_GROUP_NAME));
                if (qleverEnabled)
                    dropdownItems.push(buildDropdownItem("qlever_" + keyID, `${keyText} (beta)`, QLEVER_GROUP_NAME));
            });

            if (!props.preset.osm_wikidata_keys?.length && !props.preset.osm_wikidata_properties?.length && !props.preset.wikidata_indirect_property && !props.preset.osm_text_key) {
                dropdownItems.push(buildDropdownItem("overpass_wd+wd_base", "OSM wikidata=* + Wikidata P625", OVERPASS_WDQS_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("overpass_wd", "OSM wikidata=*", OVERPASS_GROUP_NAME));
                dropdownItems.push(buildDropdownItem("wd_base", "Wikidata P625", WDQS_GROUP_NAME));
                if (qleverEnabled) {
                    dropdownItems.push(buildDropdownItem("qlever_osm_wd_base", "OSM wikidata=* + Wikidata P625 (beta)", QLEVER_GROUP_NAME));
                    dropdownItems.push(buildDropdownItem("qlever_osm_wd", "OSM wikidata=* (beta)", QLEVER_GROUP_NAME));
                    dropdownItems.push(buildDropdownItem("qlever_wd_base", "Wikidata P625 (beta)", QLEVER_GROUP_NAME));
                }
            }

            if (propagationEnabled && pmtilesURL)
                dropdownItems.push(buildDropdownItem("pmtiles_propagated", t("source.propagated", "Propagated"), PMTILES_GROUP_NAME));

            return dropdownItems;
        }, [props.preset.osm_text_key, props.preset.osm_wikidata_keys, props.preset.osm_wikidata_properties, props.preset.wikidata_indirect_property, setBackEndID, t]);

    const clearCache = useCallback(() => {
        // TODO
    }, []);

    return <DropdownControl
        buttonContent="⚙️"
        dropdownItems={dropdownItems}
        selectedValue={backEndID}
        title={t("source.choose_source")}
        position={props.position}
        className="back-end-ctrl"
    >
        <tr>
            <td colSpan={2}>
                <button onClick={clearCache} className="hiddenElement k-button w3-button w3-white w3-border w3-round-large button-6 clear_cache_button" title={t("clear_cache")} aria-label={t("clear_cache")} >
                    <span className="button_img">🗑️ &nbsp;</span>
                    <span>{t("clear_cache")}</span>
                </button>
            </td>
        </tr>
    </DropdownControl>;
}
