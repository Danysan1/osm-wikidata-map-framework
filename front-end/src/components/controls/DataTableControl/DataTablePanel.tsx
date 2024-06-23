import { EtymologyFeature } from "@/src/model/EtymologyResponse";
import { useTranslation } from "next-i18next";
import { FC } from "react";

interface DataTablePanelProps {
    features: EtymologyFeature[];
}

export const DataTablePanel: FC<DataTablePanelProps> = (props) => {
    const { t } = useTranslation();
    return <div>
        <table>
            <thead>
                <th>
                    <td>{t("name")}</td>
                    <td>{t("alt_name")}</td>
                </th>
            </thead>
            <tbody>
                {props.features.map((feature) => (
                    <tr key={feature.id ?? feature.properties?.id}>
                        <td>{feature.properties?.name}</td>
                        <td>{feature.properties?.alt_name}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
}