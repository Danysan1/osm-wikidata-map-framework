import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { EtymologyFeature } from "@/src/model/EtymologyResponse";
import { getEtymologies } from "@/src/services/etymologyUtils";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FeatureButtonRow } from "../ButtonRow/FeatureButtonRow";
import styles from "./DataTable.module.css";

interface DataTableRowProps {
    feature: EtymologyFeature;
    details?: Record<string, EtymologyDetails>;
    openFeatureDetails: () => void;
}

export const DataTableRow: FC<DataTableRowProps> = ({ feature, details, openFeatureDetails }) => {
    const { i18n } = useTranslation(),
        etys = getEtymologies(feature),
        etyCellContent = etys?.length ? <ul>
            {etys?.map(ety => <li key={ety.wikidata}>
                <a href={`https://www.wikidata.org/wiki/${ety.wikidata}`} target="_blank" rel="noreferrer">
                    {ety.wikidata && details?.[ety.wikidata]?.name ? details?.[ety.wikidata]?.name : ety.wikidata}
                </a>
            </li>)}
        </ul> : feature.properties?.text_etymology,
        nameCellContent = useMemo(() => {
            const localNameKey = "name:" + i18n.language,
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                mainName = feature.properties?.[localNameKey] || feature.properties?.name || feature.properties?.["name:en"],
                nameArray: string[] = [];
            if (feature.properties?.alt_name)
                nameArray.push(...feature.properties.alt_name.split(";"));
            if (typeof mainName === "string") {
                const lowerName = mainName.toLowerCase().replaceAll('“', '"').replaceAll('”', '"'),
                    includedInAnyAltName = nameArray.some(alt_name =>
                        alt_name.toLowerCase().replaceAll('“', '"').replaceAll('”', '"').includes(lowerName)
                    );
                if (!includedInAnyAltName)
                    nameArray.push(mainName);
            }

            return <span onClick={openFeatureDetails}>{nameArray.join(" / ")}</span>;
        }, [feature.properties, i18n.language, openFeatureDetails]);

    return <tr className={styles.data_table_row}>
        <td>{nameCellContent}</td>
        <td><FeatureButtonRow feature={feature} openFeatureDetails={openFeatureDetails} /></td>
        <td>{etyCellContent}</td>
    </tr>;
}
