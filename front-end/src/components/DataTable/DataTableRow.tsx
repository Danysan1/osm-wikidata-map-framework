import { Etymology } from "@/src/model/Etymology";
import { EtymologyDetails } from "@/src/model/EtymologyDetails";
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
  feature: OwmfFeature;
  details?: Record<string, EtymologyDetails>;
  openFeatureDetails: () => void;
}

export const DataTableRow: FC<DataTableRowProps> = ({
  feature,
  details,
  openFeatureDetails,
}) => {
  const { i18n } = useTranslation(),
    entitiesCellContent = useMemo(() => {
      const uniqueEntities = getFeatureLinkedEntities(feature).reduce<
        Record<string, Etymology>
      >((acc, entity, i) => {
        const wdQID = entity?.wikidata,
          entityDetails = wdQID ? details?.[wdQID] : undefined,
          signature = entityDetails?.name ?? entity.name ?? wdQID ?? i.toString();
        if (!acc[signature]?.wikidata) acc[signature] = entityDetails ?? entity;
        return acc;
      }, {});
      console.debug("Calculated unique entities", uniqueEntities);

      return (
        <ul>
          {Object.keys(uniqueEntities).map((signature) => (
            <li key={signature}>
              <LinkedEntityLink linkedEntity={uniqueEntities[signature]} />
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
        const lowerName = mainName
            .toLowerCase()
            .replaceAll("“", '"')
            .replaceAll("”", '"'),
          includedInAnyAltName = nameArray.some((alt_name) =>
            alt_name
              .toLowerCase()
              .replaceAll("“", '"')
              .replaceAll("”", '"')
              .includes(lowerName)
          );
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
