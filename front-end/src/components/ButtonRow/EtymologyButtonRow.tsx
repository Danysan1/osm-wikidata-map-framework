import { parseBoolConfig } from "@/src/config";
import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { useTranslation } from "next-i18next";
import { useMemo } from "react";
import { ButtonRow } from "./ButtonRow";

interface EtymologyButtonRowProps {
    etymology: EtymologyDetails;
}

export const EtymologyButtonRow: React.FC<EtymologyButtonRowProps> = ({ etymology }) => {
    const { i18n } = useTranslation(),
        entitree = useMemo(
            () => i18n.language && etymology.wikidata && etymology.instanceID == "Q5" ? `https://www.entitree.com/${i18n.language}/family_tree/${etymology.wikidata}` : undefined,
            [etymology.instanceID, etymology.wikidata, i18n.language]
        ),
        wikispore = useMemo(
            () => {
                if (!parseBoolConfig("wikispore_enable")) return undefined;
                return etymology.wikispore?.startsWith("http") ? etymology.wikispore : `https://wikispore.wmflabs.org/wiki/${etymology.wikispore}`;
            },
            [etymology.wikispore]
        );
    return <ButtonRow
        entitree={entitree}
        wikidata={etymology.wikidata}
        wikipedia={etymology.wikipedia}
        commons={etymology.commons}
        wikispore={wikispore} />
};
