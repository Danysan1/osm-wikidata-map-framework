import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { FC } from "react";

interface LinkedEntityLinkProps {
    wikidataQID?: string;
    details?: Record<string, EtymologyDetails>;
}

export const LinkedEntityLink: FC<LinkedEntityLinkProps> = ({ wikidataQID, details }) => {
    if (!wikidataQID) return null;

    const name = details?.[wikidataQID]?.name;
    return <a href={`https://www.wikidata.org/wiki/${wikidataQID}`} target="_blank" rel="noreferrer">
        {name ? name : wikidataQID}
    </a>;
}