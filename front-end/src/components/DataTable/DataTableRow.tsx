import { deduplicateByName, normalizeForComparison, type LinkedEntityDetails } from "@/src/model/LinkedEntityDetails";
import {
  getFeatureLinkedEntities,
  getFeatureTags,
  OwmfFeature,
} from "@/src/model/OwmfResponse";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ButtonRow } from "../ButtonRow/ButtonRow";
import styles from "./DataTable.module.css";
import { LinkedEntityLink } from "./LinkedEntityLink";

interface DataTableRowProps {
  /** The feature to be represented in this row */
  feature: OwmfFeature;
  /** Details by QID of linked entities of ALL FEATURES IN THE TABLE, should be filtered based on this feature linked entities */
  details?: Record<string, LinkedEntityDetails>;
  openFeatureDetails: () => void;
}

export const DataTableRow: FC<DataTableRowProps> = ({
  feature,
  details,
  openFeatureDetails,
}) => {
  const { i18n } = useTranslation(),
    entitiesCellContent = useMemo(() => {
      const entities = getFeatureLinkedEntities(feature),
        mergedEntities = entities.map<LinkedEntityDetails>(e => (e.wikidata && details?.[e.wikidata]) ? { ...details[e.wikidata], ...e } : e),
        uniqueEntities = mergedEntities.filter(deduplicateByName);

      return (
        <ul>
          {uniqueEntities.map((entity, i) => (
            <li key={entity.wikidata ?? entity.name ?? i}>
              <LinkedEntityLink linkedEntity={entity} />
            </li>
          ))}
        </ul>
      );
    }, [details, feature]),
    nameCellContent = useMemo(() => {
      const localNameKey = "name:" + i18n.language,
        tags = getFeatureTags(feature),
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        mainName = tags?.[localNameKey] || tags?.name || tags?.["name:en"],
        nameArray: string[] = [];
      if (tags?.alt_name) nameArray.push(...tags.alt_name.split(";"));
      if (typeof mainName === "string") {
        const normalizedName = normalizeForComparison(mainName),
          includedInAnyAltName = nameArray.some((alt_name) => {
            const out = normalizeForComparison(alt_name).includes(normalizedName);
            console.debug("DataTableRow", { normalizedName, alt_name, out });
            return out;
          });
        if (!includedInAnyAltName) nameArray.push(mainName);
      }

      return <span onClick={openFeatureDetails}>{nameArray.join(" / ")}</span>;
    }, [feature, i18n.language, openFeatureDetails]);

  return (
    <tr className={styles.data_table_row}>
      <td>{nameCellContent}</td>
      <td>
        <ButtonRow onOpenInfo={openFeatureDetails} />
      </td>
      <td>{entitiesCellContent}</td>
    </tr>
  );
};
