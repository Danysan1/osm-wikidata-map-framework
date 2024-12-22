import { useLoadingSpinnerContext } from "@/src/context/LoadingSpinnerContext";
import { useSnackbarContext } from "@/src/context/SnackbarContext";
import { Etymology } from "@/src/model/Etymology";
import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { WikidataDetailsService } from "@/src/services/WikidataDetailsService/WikidataDetailsService";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { EtymologyView } from "../EtymologyView/EtymologyView";
import styles from "./EtymologyList.module.css";
import { TextEtymologies, TextEtymologiesProps } from "./TextEtymologies";

interface EtymologyListProps extends TextEtymologiesProps {
  wdLinkedEntities: string | Etymology[];
}

export const EtymologyList: FC<EtymologyListProps> = (props) => {
  const { t, i18n } = useTranslation(),
    [loadingEtymologies, setLoadingEtymologies] = useState<boolean>(true),
    [etymologyDetails, setEtymologyDetails] = useState<EtymologyDetails[]>(),
    { showSnackbar } = useSnackbarContext(),
    { showLoadingSpinner } = useLoadingSpinnerContext(),
    etys = useMemo(
      () =>
        typeof props.wdLinkedEntities === "string"
          ? (JSON.parse(props.wdLinkedEntities) as Etymology[])
          : props.wdLinkedEntities,
      [props.wdLinkedEntities]
    ),
    downloadEtymologyDetails = useCallback(
      async (entities?: Etymology[], maxItems = 100): Promise<EtymologyDetails[]> => {
        if (!entities?.length) return [];

        // De-duplicate and sort by ascending Q-ID length (shortest usually means most famous)
        let etymologyIDs = new Set(
          entities.map((e) => e.wikidata ?? "").filter((x) => x !== "")
        );
        if (etymologyIDs.size == 0) return entities;

        let sortedIDs = Array.from(etymologyIDs).sort(
          (a, b) => parseInt(a.replace("Q", "")) - parseInt(b.replace("Q", ""))
        );
        if (etymologyIDs.size > maxItems) {
          // Too many items, limiting to the first N most famous ones
          sortedIDs = sortedIDs.slice(0, maxItems);
          etymologyIDs = new Set(sortedIDs);
          showSnackbar(
            t(
              "feature_details.loading_first_n_items",
              `Loading only first ${maxItems} items`,
              { partial: maxItems, total: entities.length }
            ),
            "lightsalmon",
            10_000
          );
        }

        try {
          const detailsService = new WikidataDetailsService(i18n.language),
            downloadedEtymologies = await detailsService.fetchEtymologyDetails(
              etymologyIDs
            );
          return sortedIDs.map((wikidataID): EtymologyDetails => {
            const baseEntity = entities.find((oldEty) => oldEty.wikidata === wikidataID),
              downloadedDetails = downloadedEtymologies[wikidataID],
              out = { ...baseEntity, ...downloadedDetails };
            if (process.env.NODE_ENV === "development") console.debug("Downloaded details", { baseEntity, downloadedDetails, out });
            return out;
          });
        } catch (err) {
          console.error("Failed downloading etymology details", etymologyIDs, err);
          return entities;
        }
      },
      [i18n.language, showSnackbar, t]
    );

  useEffect(() => {
    showLoadingSpinner(true);
    downloadEtymologyDetails(etys)
      .then(setEtymologyDetails)
      .catch(console.error)
      .finally(() => {
        setLoadingEtymologies(false);
        showLoadingSpinner(false);
      });
  }, [downloadEtymologyDetails, etys, showLoadingSpinner]);

  return (
    <div className={styles.linked_entities_grid}>
      {loadingEtymologies && (
        <div className={styles.loading_linked_entity}>
          <h3>{t("feature_details.loading")}</h3>
        </div>
      )}

      {etymologyDetails // Sort entities by Wikidata Q-ID length (shortest ID usually means most famous)
        ?.sort((a, b) => (a.wikidata?.length ?? 0) - (b.wikidata?.length ?? 0))
        ?.map((ety, i) => (
          <EtymologyView key={i} etymology={ety} />
        ))}
      <TextEtymologies {...props} other_etymologies={etymologyDetails} />
    </div>
  );
};
