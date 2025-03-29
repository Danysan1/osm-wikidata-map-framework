import { LinkedEntityDetails } from "@/src/model/LinkedEntityDetails";
import { FC } from "react";

interface LinkedEntityLinkProps {
  linkedEntity: LinkedEntityDetails;
}

export const LinkedEntityLink: FC<LinkedEntityLinkProps> = ({ linkedEntity }) => {
  if (linkedEntity.name && !linkedEntity.wikidata) return linkedEntity.name;

  if (!linkedEntity.wikidata) return null;

  return (
    <a
      href={`https://www.wikidata.org/wiki/${linkedEntity.wikidata}`}
      target="_blank"
      rel="noreferrer"
    >
      {linkedEntity.name ? linkedEntity.name : linkedEntity.wikidata}
    </a>
  );
};
