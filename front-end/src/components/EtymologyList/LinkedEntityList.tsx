import { useLoadingSpinnerContext } from "@/src/context/LoadingSpinnerContext";
import { useSnackbarContext } from "@/src/context/SnackbarContext";
import { LinkedEntity } from "@/src/model/LinkedEntity";
import { LinkedEntityDetails } from "@/src/model/LinkedEntityDetails";
import { CachedDetailsService } from "@/src/services/WikidataDetailsService/CachedDetailsService";
import { FC, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { EtymologyView } from "../EtymologyView/EtymologyView";
import styles from "./LinkedEntityList.module.css";

interface LinkedEntityListProps {
  linkedEntities: LinkedEntity[];
}

export const LinkedEntityList: FC<LinkedEntityListProps> = ({ linkedEntities }) => {
  const { t, i18n } = useTranslation(),
    [loadingEtymologies, setLoadingEtymologies] = useState<boolean>(true),
    [entityDetails, setEntityDetails] = useState<LinkedEntityDetails[]>(),
    { showSnackbar } = useSnackbarContext(),
    { showLoadingSpinner } = useLoadingSpinnerContext(),
    downloadEntityDetails = useCallback(
      async (entities?: LinkedEntity[], maxItems = 100): Promise<LinkedEntityDetails[]> => {
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
          const detailsService = new CachedDetailsService(i18n.language),
            fetched = await detailsService.fetchEtymologyDetails(etymologyIDs);
          const combined = entities.map<LinkedEntityDetails>((old) =>
            old.wikidata && fetched[old.wikidata]
              ? { ...old, ...fetched[old.wikidata] }
              : old
          );
          const filtered = combined
            .filter((e) => {
              if (e.wikidata) return true; // Always show all Wikidata entities

              if (!e.name) {
                console.warn("Not showing an entity without name nor Wikidata Q-ID", e);
                return false;
              }

              // If deduplication is disabled show all text entities
              if (process.env.owmf_deduplicate_by_name !== "true") return true;

              // Ignore text entities with the same name as an existing Wikidata entity
              const normalName = normalizeName(e.name);
              return !combined.some(
                (other) =>
                  !!other.wikidata &&
                  !!other.name &&
                  normalizeName(other.name).includes(normalName)
              );
            })
            .sort(
              // Sort entities by Wikidata Q-ID length (shortest ID usually means most famous)
              (a, b) => (a.wikidata?.length ?? 0) - (b.wikidata?.length ?? 0)
            );
          console.debug("downloadEntityDetails", { entities, combined, filtered });
          return filtered;
        } catch (err) {
          console.error("Failed downloading etymology details", etymologyIDs, err);
          return entities;
        }
      },
      [i18n.language, showSnackbar, t]
    );

  useEffect(() => {
    setLoadingEtymologies(true);
    showLoadingSpinner(true);
    downloadEntityDetails(linkedEntities)
      .then(setEntityDetails)
      .catch(console.error)
      .finally(() => {
        setLoadingEtymologies(false);
        showLoadingSpinner(false);
      });
  }, [downloadEntityDetails, linkedEntities, showLoadingSpinner]);

  return (
    <div className={styles.linked_entities_grid}>
      {loadingEtymologies && (
        <div className={styles.loading_linked_entity}>
          <h3>{t("feature_details.loading")}</h3>
        </div>
      )}

      {entityDetails?.map((ety, i) => (
        <EtymologyView key={i} entity={ety} />
      ))}
    </div>
  );
};

/**
 * @see https://stackoverflow.com/a/37511463/2347196
 */
function normalizeName(str: string) {
  return str
    .normalize("NFKD")
    .replace(/[\u0300-\u036f.]/g, "")
    .trim()
    .toLowerCase();
}
