import { Etymology } from "@/src/model/Etymology";
import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { WikidataDetailsService } from "@/src/services/WikidataDetailsService/WikidataDetailsService";
import { showLoadingSpinner, showSnackbar } from "@/src/snackbar";
import { FC, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { EtymologyView } from "../EtymologyView/EtymologyView";

interface EtymologyListProps {
    etymologies: string | Etymology[];
}

export const EtymologyList: FC<EtymologyListProps> = ({ etymologies }) => {
    const { t, i18n } = useTranslation(),
        [loadingEtymologies, setLoadingEtymologies] = useState<boolean>(true),
        [etymologyDetails, setEtymologyDetails] = useState<EtymologyDetails[]>(),
        downloadEtymologyDetails = useCallback(async (etymologies?: Etymology[], maxItems = 100): Promise<EtymologyDetails[]> => {
            if (!etymologies?.length)
                return [];

            // De-duplicate and sort by ascending Q-ID length (shortest usually means most famous)
            let etymologyIDs = new Set(
                etymologies.map(e => e.wikidata ?? "").filter(x => x !== "")
            );
            if (etymologyIDs.size == 0)
                return etymologies;

            let sortedIDs = Array.from(etymologyIDs).sort((a, b) => parseInt(a.replace("Q", "")) - parseInt(b.replace("Q", "")));
            if (etymologyIDs.size > maxItems) {
                // Too many items, limiting to the first N most famous ones
                sortedIDs = sortedIDs.slice(0, maxItems);
                etymologyIDs = new Set(sortedIDs);
                showSnackbar(
                    t("feature_details.loading_first_n_items", `Loading only first ${maxItems} items`, { partial: maxItems, total: etymologies.length }),
                    "lightsalmon",
                    10_000
                );
            }

            try {
                const detailsService = new WikidataDetailsService(i18n.language),
                    downloadedEtymologies = await detailsService.fetchEtymologyDetails(etymologyIDs);
                return sortedIDs.map((wikidataID): EtymologyDetails => {
                    const baseEntity = etymologies.find(oldEty => oldEty.wikidata === wikidataID),
                        downloadedDetails = downloadedEtymologies[wikidataID];
                    return { ...baseEntity, ...downloadedDetails };
                });
            } catch (err) {
                console.error("Failed downloading etymology details", etymologyIDs, err);
                return etymologies;
            }
        }, [i18n.language, t]);

    useEffect(() => {
        const etys = typeof etymologies === "string" ? JSON.parse(etymologies) as Etymology[] : etymologies;
        showLoadingSpinner(true);
        downloadEtymologyDetails(etys)
            .then(setEtymologyDetails)
            .catch(console.error)
            .finally(() => {
                setLoadingEtymologies(false)
                showLoadingSpinner(false);
            });
    }, [downloadEtymologyDetails, etymologies]);

    return <div className="etymologies_container grid grid-auto">
        {loadingEtymologies && <div className="etymology etymology_loading">
            <h3>{t("feature_details.loading")}</h3>
        </div>}
        {etymologyDetails?.map((ety, i) => <EtymologyView key={i} etymology={ety} />)}
    </div>;
}

/*export class FeatureElement extends HTMLDivElement {

    private async fetchAndShowEtymologies(properties: EtymologyFeatureProperties, etymologies_container: HTMLElement, etymologies?: Etymology[]) {
        const placeholder = etymologies_container.querySelector<HTMLDivElement>(".etymology_loading");
        if (!etymologies) {
            placeholder?.classList.add("hiddenElement");
            return;
        }

        showLoadingSpinner(true);

        const filledEtymologies = await this.downloadEtymologyDetails(etymologies);
        this.showEtymologies(filledEtymologies, etymologies_container, this.currentZoom);
        this.showTextEtymologies(properties, filledEtymologies, etymologies_container);
        placeholder?.classList.add("hiddenElement");

        const parts_containers = etymologies_container.querySelectorAll<HTMLElement>(".etymology_parts_container")
        if (!parseBoolConfig(process.env.owmf_fetch_parts_of_linked_entities) || parts_containers.length == 0) {
            if (process.env.NODE_ENV === 'development') console.debug("fetchAndShowEtymologies: skipping fetching parts of linked entities", { filledEtymologies });
        } else {
            if (process.env.NODE_ENV === 'development') console.debug("fetchAndShowEtymologies: fetching parts of linked entities", { filledEtymologies });
            const parts = filledEtymologies.reduce((acc: Etymology[], ety: Etymology): Etymology[] => {
                if (ety.statementEntity) {
                    acc.push({
                        ...ety,
                        from_statement_of_wikidata_cod: ety.wikidata,
                        wikidata: ety.statementEntity,
                    });
                }
                if (ety.parts) {
                    acc.push(...ety.parts.map(part => ({
                        ...ety,
                        from_parts_of_wikidata_cod: ety.wikidata,
                        wikidata: part
                    })));
                }
                return acc;
            }, []),
                filledParts = await this.downloadEtymologyDetails(parts);

            if (process.env.NODE_ENV === 'development') console.debug("fetchAndShowEtymologies: showing parts of linked entities", { filledParts, parts_containers });
            parts_containers.forEach(parts_container => {
                const wdID = parts_container.dataset.wikidataCod;
                if (wdID) {
                    const partsOfThisEntity = filledParts.filter(ety => ety.from_parts_of_wikidata_cod === wdID || ety.from_statement_of_wikidata_cod === wdID);
                    this.showEtymologies(partsOfThisEntity, parts_container, this.currentZoom);
                    parts_container.classList.remove("hiddenElement");
                }
            });
        }

        showLoadingSpinner(false);
    }

    private showEtymologies(etymologies: EtymologyDetails[], etymologies_container: HTMLElement, currentZoom: number) {
        // Sort entities by Wikidata Q-ID length (shortest ID usually means most famous)
        etymologies.sort((a, b) => (a.wikidata?.length ?? 0) - (b.wikidata?.length ?? 0)).forEach((ety) => {
            if (ety?.wikidata) {
                try {
                    etymologies_container.appendChild(etymologyToDomElement(ety, currentZoom))
                } catch (err) {
                    console.error("Failed adding etymology", { ety, err });
                }
            } else if (process.env.NODE_ENV === 'development') {
                console.warn("Found etymology without Wikidata ID", { ety });
            }
        });
    }

    private showTextEtymologies(properties: EtymologyFeatureProperties, etymologies: EtymologyDetails[], etymologies_container: HTMLElement) {
        const textEtyName = properties.text_etymology === "null" ? undefined : properties.text_etymology,
            textEtyNameExists = typeof textEtyName === "string" && !!textEtyName,
            textEtyNames = textEtyNameExists ? textEtyName.split(";") : [],
            textEtyDescr = properties.text_etymology_descr === "null" ? undefined : properties.text_etymology_descr,
            textEtyDescrExists = typeof textEtyDescr === "string" && !!textEtyDescr,
            textEtyDescrs = textEtyDescrExists ? textEtyDescr.split(";") : [];
        if (process.env.NODE_ENV === 'development') console.debug("showEtymologies: text etymology", { textEtyName, textEtyNameExists, textEtyNames, textEtyDescr, textEtyDescrExists, textEtyDescrs });

        for (let n = 0; n < Math.max(textEtyNames.length, textEtyDescrs.length); n++) {
            const nthTextEtyNameExists = n < textEtyNames.length,
                nthTextEtyDescrExists = n < textEtyDescrs.length,
                // If the text etymology has only the name and it's already shown by one of the Wikidata etymologies' name/description, hide it
                textEtyShouldBeShown = nthTextEtyDescrExists || (
                    nthTextEtyNameExists && etymologies.every((etymology) =>
                        !etymology?.name?.toLowerCase()?.includes(textEtyNames[n].trim().toLowerCase()) &&
                        !etymology?.description?.toLowerCase()?.includes(textEtyNames[n].trim().toLowerCase())
                    )
                ),
                nthTextEtyName = nthTextEtyNameExists ? textEtyNames[n] : undefined,
                nthTextEtyDescr = nthTextEtyDescrExists ? textEtyDescrs[n] : undefined;
            if (process.env.NODE_ENV === 'development') console.debug("showEtymologies: showing text etymology? ", {
                n, nthTextEtyNameExists, nthTextEtyName, nthTextEtyDescrExists, nthTextEtyDescr, textEtyShouldBeShown, etymologies
            });
            if (textEtyShouldBeShown) {
                etymologies_container.appendChild(etymologyToDomElement({
                    name: nthTextEtyName,
                    description: nthTextEtyDescr,
                    from_osm: true,
                    from_osm_type: properties.osm_type,
                    from_osm_id: properties.osm_id,
                }));
            }
        }
    }
}*/
