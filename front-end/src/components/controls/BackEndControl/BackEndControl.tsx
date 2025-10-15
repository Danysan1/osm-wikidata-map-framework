import { OSM_TITLE, parseStringArrayConfig } from "@/src/config";
import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { EntityDetailsDatabase } from "@/src/db/EntityDetailsDatabase";
import { EntityLinkNotesDatabase } from "@/src/db/EntityLinkNotesDatabase";
import { MapDatabase } from "@/src/db/MapDatabase";
import { StatsDatabase } from "@/src/db/StatsDatabase";
import { osmKeyToKeyID } from "@/src/model/OwmfResponse";
import { SourcePreset } from "@/src/model/SourcePreset";
import { FC, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ControlPosition } from "react-map-gl/maplibre";
import { Button } from "../../Button/Button";
import { LastDbUpdate } from "../../LastDbUpdate/LastDbUpdate";
import { DropdownControl, DropdownItem } from "../DropdownControl/DropdownControl";
import { DateSelector } from "./DateSelector";

interface BackEndControlProps {
  preset: SourcePreset;
  position?: ControlPosition;
}

const PMTILES_GROUP_NAME = "Database (PMTiles)",
  OVERPASS_GROUP_NAME = `${OSM_TITLE} (Overpass API)`,
  POSTPASS_GROUP_NAME = `${OSM_TITLE} (Postpass API)`,
  WDQS_GROUP_NAME = "Wikidata Query Service",
  OVERPASS_WDQS_GROUP_NAME = `${OSM_TITLE} (Overpass API) + Wikidata Query Service`,
  POSTPASS_WDQS_GROUP_NAME = `${OSM_TITLE} (Postpass API) + Wikidata Query Service`,
  QLEVER_GROUP_NAME = `${OSM_TITLE} / Wikidata (QLever)`;

/**
 * Let the user choose the back-end from a list of available back-ends for the current instance and source preset.
 **/
export const BackEndControl: FC<BackEndControlProps> = ({ preset, position }) => {
  const { t } = useTranslation(),
    { backEndID, setBackEndID } = useUrlFragmentContext(),
    dropdownItems = useMemo(() => {
      const qleverOsmEnable =
        !!process.env.NEXT_PUBLIC_OWMF_qlever_instance_url &&
        !!process.env.NEXT_PUBLIC_OWMF_qlever_osm_source,
        qleverWdEnable =
          !!process.env.NEXT_PUBLIC_OWMF_qlever_instance_url &&
          !!process.env.NEXT_PUBLIC_OWMF_qlever_wikibase_source,
        pmtilesURL =
          process.env.NEXT_PUBLIC_OWMF_pmtiles_preset === preset.id
            ? process.env.NEXT_PUBLIC_OWMF_pmtiles_base_url
            : undefined,
        dropdownItems: DropdownItem[] = [],
        buildDropdownItem = (
          backEndID: string,
          text: string,
          category?: string
        ): DropdownItem => ({
          id: backEndID,
          text: text,
          category: category,
          onSelect: () => setBackEndID(backEndID),
        });

      if (pmtilesURL)
        dropdownItems.push(
          buildDropdownItem(
            "pmtiles_all",
            t("source.db_all", "All sources from DB"),
            PMTILES_GROUP_NAME
          )
        );

      const allKeysText = t("source.all_keys", "All keys");
      if (preset.osm_wikidata_keys?.length) {
        dropdownItems.push(
          buildDropdownItem("overpass_osm_all", allKeysText, OVERPASS_GROUP_NAME)
        );
      }
      if (preset.relation_member_role) {
        dropdownItems.push(
          buildDropdownItem(
            "overpass_osm_rel_role",
            `Relation role "${preset.relation_member_role}"`,
            OVERPASS_GROUP_NAME
          )
        );
      }

      if (preset.osm_wikidata_properties?.length) {
        /**
         * @example "Wikidata P138/P825/P547"
         */
        const wikidataDirectText = "Wikidata " + preset.osm_wikidata_properties.join("/");
        /**
         * @example "OSM wikidata=* > Wikidata P138/P825/P547"
         */
        const osmWikidataDirectText = `wikidata=* > ${wikidataDirectText}`;
        if (pmtilesURL) {
          dropdownItems.push(
            buildDropdownItem(
              "pmtiles_osm_wd_direct",
              osmWikidataDirectText,
              PMTILES_GROUP_NAME
            )
          );
          dropdownItems.push(
            buildDropdownItem("pmtiles_wd_direct", wikidataDirectText, PMTILES_GROUP_NAME)
          );
        }
        if (preset.osm_wikidata_keys?.length) {
          dropdownItems.push(
            buildDropdownItem(
              "overpass_osm_all_wd+wd_direct",
              `${allKeysText} + ${wikidataDirectText}`,
              OVERPASS_WDQS_GROUP_NAME
            )
          );
        }
        dropdownItems.push(
          buildDropdownItem(
            "overpass_osm_wd+wd_direct",
            osmWikidataDirectText,
            OVERPASS_WDQS_GROUP_NAME
          )
        );

        dropdownItems.push(
          buildDropdownItem("wd_direct", wikidataDirectText, WDQS_GROUP_NAME)
        );

        if (preset.osm_wikidata_keys?.length) {
          dropdownItems.push(
            buildDropdownItem("postpass_osm_all", allKeysText, POSTPASS_GROUP_NAME)
          );
          dropdownItems.push(
            buildDropdownItem(
              "postpass_osm_all_wd+wd_direct",
              `${allKeysText} + ${wikidataDirectText}`,
              POSTPASS_WDQS_GROUP_NAME
            )
          );
        }
        dropdownItems.push(
          buildDropdownItem(
            "postpass_osm_wd+wd_direct",
            osmWikidataDirectText,
            POSTPASS_WDQS_GROUP_NAME
          )
        );

        if (qleverWdEnable)
          dropdownItems.push(
            buildDropdownItem(
              "qlever_wd_direct",
              wikidataDirectText,
              QLEVER_GROUP_NAME
            )
          );
        if (qleverOsmEnable) {
          dropdownItems.push(
            buildDropdownItem(
              "qlever_osm_wd_direct",
              osmWikidataDirectText,
              QLEVER_GROUP_NAME
            )
          );
          //dropdownItems.push(buildDropdownItem("qlever_osm_all_wd_direct", `${allKeysText} + ${wikidataDirectText}`, QLEVER_GROUP_NAME)); // TODO: implement and enable
        }
        if (preset.osm_wikidata_properties.length > 1) {
          for (const prop of preset.osm_wikidata_properties) {
            dropdownItems.push(
              buildDropdownItem("wd_direct_" + prop, "Wikidata " + prop, WDQS_GROUP_NAME)
            );
            //dropdownItems.push(buildDropdownItem("qlever_wd_direct_" + prop, `Wikidata ${prop}`, QLEVER_GROUP_NAME)); // TODO: Implement and enable
          }
        }
      }

      if (preset.wikidata_indirect_property) {
        const indirectText = t(
          "source.wd_indirect",
          "P625 qualifiers on {{indirectWdProperty}} and Wikidata entities referenced with {{indirectWdProperty}}",
          { indirectWdProperty: preset.wikidata_indirect_property }
        ),
          qualifierText = t(
            "source.wd_qualifier",
            "P625 qualifiers on {{indirectWdProperty}}",
            { indirectWdProperty: preset.wikidata_indirect_property }
          ),
          reverseText = t(
            "source.wd_reverse",
            "Wikidata entities referenced with {{indirectWdProperty}}",
            { indirectWdProperty: preset.wikidata_indirect_property }
          );

        if (preset.osm_wikidata_keys?.length) {
          dropdownItems.push(
            buildDropdownItem(
              "overpass_osm_all_wd+wd_indirect",
              `${allKeysText} + ${indirectText}`,
              OVERPASS_WDQS_GROUP_NAME
            )
          );
          dropdownItems.push(
            buildDropdownItem(
              "overpass_osm_all_wd+wd_qualifier",
              `${allKeysText} + ${qualifierText}`,
              OVERPASS_WDQS_GROUP_NAME
            )
          );
          dropdownItems.push(
            buildDropdownItem(
              "overpass_osm_all_wd+wd_reverse",
              `${allKeysText} + ${reverseText}`,
              OVERPASS_WDQS_GROUP_NAME
            )
          );
        }
        dropdownItems.push(
          buildDropdownItem(
            "overpass_osm_wd+wd_indirect",
            `wikidata=* > ${indirectText}`,
            OVERPASS_WDQS_GROUP_NAME
          )
        );
        dropdownItems.push(
          buildDropdownItem(
            "overpass_osm_wd+wd_reverse",
            `wikidata=* > ${reverseText}`,
            OVERPASS_WDQS_GROUP_NAME
          )
        );

        dropdownItems.push(
          buildDropdownItem("wd_indirect", indirectText, WDQS_GROUP_NAME)
        );
        dropdownItems.push(
          buildDropdownItem("wd_qualifier", qualifierText, WDQS_GROUP_NAME)
        );
        dropdownItems.push(buildDropdownItem("wd_reverse", reverseText, WDQS_GROUP_NAME));

        if (qleverOsmEnable) {
          if (preset.osm_wikidata_keys?.length) {
            // dropdownItems.push(buildDropdownItem("qlever_osm_all_indirect", `${allKeysText} + ${indirectText}`, QLEVER_GROUP_NAME)); // TODO: implement and enable
            // dropdownItems.push(buildDropdownItem("qlever_osm_all_qualifier", `${allKeysText} + ${qualifierText}`, QLEVER_GROUP_NAME)); // TODO: implement and enable
            // dropdownItems.push(buildDropdownItem("qlever_osm_all_reverse", `${allKeysText} + ${reverseText}`, QLEVER_GROUP_NAME)); // TODO: implement and enable
          }
          // dropdownItems.push(buildDropdownItem("qlever_osm_wikidata_indirect", `wikidata=* > ${indirectText}`, QLEVER_GROUP_NAME)); // TODO: implement and enable
          dropdownItems.push(
            buildDropdownItem(
              "qlever_osm_wd_reverse",
              `wikidata=* > ${reverseText}`,
              QLEVER_GROUP_NAME
            )
          );
        }
        if (qleverWdEnable) {
          // dropdownItems.push(buildDropdownItem("qlever_wd_indirect", indirectText, QLEVER_GROUP_NAME)); // TODO: enable when QLever supports WITH
          dropdownItems.push(
            buildDropdownItem("qlever_wd_qualifier", qualifierText, QLEVER_GROUP_NAME)
          );
          dropdownItems.push(
            buildDropdownItem("qlever_wd_reverse", reverseText, QLEVER_GROUP_NAME)
          );
        }
      }

      if (preset.osm_wikidata_keys?.length && qleverOsmEnable) {
        dropdownItems.push(
          buildDropdownItem("qlever_osm_all", `${allKeysText}`, QLEVER_GROUP_NAME)
        );
      }

      preset.osm_wikidata_keys?.forEach((key) => {
        const osmKeyID = osmKeyToKeyID(key);

        dropdownItems.push(
          buildDropdownItem("overpass_" + osmKeyID, key, OVERPASS_GROUP_NAME)
        );
        dropdownItems.push(
          buildDropdownItem("postpass_" + osmKeyID, key, POSTPASS_GROUP_NAME)
        );
        if (pmtilesURL)
          dropdownItems.push(
            buildDropdownItem("pmtiles_" + osmKeyID, `${key}`, PMTILES_GROUP_NAME)
          );
        if (qleverOsmEnable)
          dropdownItems.push(
            buildDropdownItem("qlever_" + osmKeyID, `${key}`, QLEVER_GROUP_NAME)
          );
      });

      const anyLinkedEntity =
        !!preset.osm_wikidata_keys ||
        !!preset.osm_wikidata_properties ||
        !!preset.wikidata_indirect_property ||
        !!preset.osm_text_key;
      if (!anyLinkedEntity) {
        dropdownItems.push(
          buildDropdownItem(
            "overpass_osm_wd+wd_base",
            "wikidata=* + Wikidata P625",
            OVERPASS_WDQS_GROUP_NAME
          )
        );
        dropdownItems.push(
          buildDropdownItem("overpass_osm_wd", "wikidata=*", OVERPASS_GROUP_NAME)
        );

        dropdownItems.push(
          buildDropdownItem("wd_base", "Wikidata P625", WDQS_GROUP_NAME)
        );
        if (qleverOsmEnable) {
          dropdownItems.push(
            buildDropdownItem(
              "qlever_osm_wd_base",
              "wikidata=* + Wikidata P625",
              QLEVER_GROUP_NAME
            )
          );
          dropdownItems.push(
            buildDropdownItem("qlever_osm_wd", "wikidata=*", QLEVER_GROUP_NAME)
          );
        }
        if (qleverWdEnable)
          dropdownItems.push(
            buildDropdownItem("qlever_wd_base", "Wikidata P625", QLEVER_GROUP_NAME)
          );
      }

      if (pmtilesURL)
        dropdownItems.push(
          buildDropdownItem(
            "pmtiles_propagated",
            t("source.propagated", "Propagated"),
            PMTILES_GROUP_NAME
          )
        );

      return dropdownItems;
    }, [
      preset.id,
      preset.osm_text_key,
      preset.osm_wikidata_keys,
      preset.osm_wikidata_properties,
      preset.relation_member_role,
      preset.wikidata_indirect_property,
      setBackEndID,
      t,
    ]);

  // console.debug("BackEndControl render", { preset, dropdownItems });

  useEffect(() => {
    if (!dropdownItems.find((i) => i.id === backEndID)) {
      const preferredBackends = process.env.NEXT_PUBLIC_OWMF_preferred_backends
        ? parseStringArrayConfig(process.env.NEXT_PUBLIC_OWMF_preferred_backends)
        : [],
        preferredBackend = preferredBackends.find(
          (backend) => !!dropdownItems.find((item) => item.id === backend)
        ),
        newItem =
          dropdownItems.find((item) => item.id === preferredBackend) ?? dropdownItems[0];
      if (!newItem) {
        console.error("No back-end available");
      } else {
        console.debug(
          "BackEndControl: Back-end ID did not exist, updating to existing one",
          { backEndID, dropdownItems, preferredBackends, preferredBackend, newItem }
        );
        newItem.onSelect();
      }
    }
  }, [backEndID, dropdownItems]);

  const clearCache = useCallback(
    () =>
      void Promise.all([
        new EntityDetailsDatabase().clear(),
        new EntityLinkNotesDatabase().clear(),
        new MapDatabase().clear(),
        new StatsDatabase().clear(),
      ]).catch((e) => console.error("Failed clearing cache", e)),
    []
  );

  return (
    <DropdownControl
      buttonContent="⚙️"
      dropdownItems={dropdownItems}
      selectedValue={backEndID}
      title={t("source.choose_source")}
      position={position}
      className="back-end-ctrl"
    >
      {backEndID.startsWith("pmtiles") && <LastDbUpdate />}
      {backEndID.startsWith("pmtiles") && (
        <Button
          className="dataset_button"
          href={process.env.NEXT_PUBLIC_OWMF_pmtiles_base_url + "dataset.csv"}
          iconText="💾"
          iconAlt="Dataset symbol"
          showText
          text={t("info_box.download_dataset")}
          title={t("info_box.download_dataset")}
        />
      )}
      {backEndID.includes("ohm") && <DateSelector />}
      {!backEndID.startsWith("pmtiles") && (
        <Button
          onClick={clearCache}
          className="clear_cache_button"
          title={t("clear_cache")}
          iconText="🗑️"
          iconAlt="Clear cache symbol"
          text={t("clear_cache")}
          showText
        />
      )}
    </DropdownControl>
  );
};
