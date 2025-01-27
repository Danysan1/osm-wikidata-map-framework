import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { getFeatureLinkedEntities, OwmfFeature } from "@/src/model/OwmfResponse";
import { CachedDetailsService } from "@/src/services/WikidataDetailsService/CachedDetailsService";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./DataTable.module.css";
import { DataTableRow } from "./DataTableRow";

interface DataTableProps {
  features: OwmfFeature[];
  setOpenFeature: (feature: OwmfFeature) => void;
}

export const DataTable: FC<DataTableProps> = ({ features, setOpenFeature }) => {
  const { t, i18n } = useTranslation(),
    [entityDetails, setEtymologyDetails] = useState<Record<string, EtymologyDetails>>();

  useEffect(() => {
    const wikidataIdArray = features.flatMap((f) =>
        getFeatureLinkedEntities(f)
          .filter((e) => e.wikidata)
          .map((e) => e.wikidata!)
      ),
      uniqueWikidataIds = new Set<string>(wikidataIdArray),
      detailsService = new CachedDetailsService(i18n.language);

    detailsService
      .fetchEtymologyDetails(uniqueWikidataIds)
      .then(setEtymologyDetails)
      .catch((e) => console.error("Error fetching linked entity details", e));
  }, [features, i18n.language]);

  return (
    <table className={styles.data_table}>
      <thead>
        <tr>
          <th>{t("data_table.names")}</th>
          <th>{t("data_table.actions")}</th>
          <th>{t("data_table.linked_entities")}</th>
        </tr>
      </thead>
      <tbody>
        {features.map((feature, i) => (
          <DataTableRow
            key={feature.id ?? i}
            feature={feature}
            openFeatureDetails={() => setOpenFeature(feature)}
            details={entityDetails}
          />
        ))}
      </tbody>
    </table>
  );
};
