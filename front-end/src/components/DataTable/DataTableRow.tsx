import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { getFeatureLinkedEntities, getFeatureTags, OwmfFeature } from "@/src/model/OwmfResponse";
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

export const DataTableRow: FC<DataTableRowProps> = ({ feature, details, openFeatureDetails }) => {
    const { i18n } = useTranslation(),
        etys = getFeatureLinkedEntities(feature),
        etyCellContent = useMemo(() => {
            return <ul>
                {etys?.map((ety, i) => <li key={ety.wikidata ?? i}>
                    <LinkedEntityLink wikidataQID={ety.wikidata} details={details} />
                </li>)}
            </ul>;
        }, [details, etys]),
        nameCellContent = useMemo(() => {
            const localNameKey = "name:" + i18n.language,
                featureI18n = getFeatureTags(feature),
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                mainName = featureI18n?.[localNameKey] || featureI18n?.name || featureI18n?.["name:en"],
                nameArray: string[] = [];
            if (featureI18n?.alt_name)
                nameArray.push(...featureI18n.alt_name.split(";"));
            if (typeof mainName === "string") {
                const lowerName = mainName.toLowerCase().replaceAll('“', '"').replaceAll('”', '"'),
                    includedInAnyAltName = nameArray.some(alt_name =>
                        alt_name.toLowerCase().replaceAll('“', '"').replaceAll('”', '"').includes(lowerName)
                    );
                if (!includedInAnyAltName)
                    nameArray.push(mainName);
            }

            return <span onClick={openFeatureDetails}>{nameArray.join(" / ")}</span>;
        }, [feature, i18n.language, openFeatureDetails]);

    return <tr className={styles.data_table_row}>
        <td>{nameCellContent}</td>
        {/*<td><FeatureButtonRow feature={feature} openFeatureDetails={openFeatureDetails} /></td>*/}
        <td><ButtonRow onOpenInfo={openFeatureDetails} /></td>
        <td>{etyCellContent}</td>
    </tr>;
}
