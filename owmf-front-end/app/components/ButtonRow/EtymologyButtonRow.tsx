import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { ButtonRow } from "./ButtonRow";
import { useTranslation } from "next-i18next";
import { useMemo } from "react";

interface EtymologyButtonRowProps {
    etymology: EtymologyDetails;
}

export const EtymologyButtonRow: React.FC<EtymologyButtonRowProps> = ({ etymology }) => {
    const { i18n } = useTranslation('app'),
        entitree = useMemo(() => i18n.language && etymology.wikidata && etymology.instanceID == "Q5" ? `https://www.entitree.com/${i18n.language}/family_tree/${etymology.wikidata}` : undefined, [etymology.instanceID, etymology.wikidata, i18n.language]);
    return <ButtonRow
        entitree={entitree}
        wikidata={etymology.wikidata}
        wikipedia={etymology.wikipedia}
        wikispore={etymology.wikispore} />
};
