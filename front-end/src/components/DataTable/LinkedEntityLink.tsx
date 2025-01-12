import { Etymology } from "@/src/model/Etymology";
import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { FC } from "react";

interface LinkedEntityLinkProps {
  linkedEntity?: Etymology;
  details?: Record<string, EtymologyDetails>;
}

export const LinkedEntityLink: FC<LinkedEntityLinkProps> = ({
  linkedEntity,
  details,
}) => {
  if (linkedEntity?.name && !linkedEntity.wikidata) return linkedEntity.name;

  if (!linkedEntity?.wikidata) return null;

  const name = details?.[linkedEntity?.wikidata]?.name;
  return (
    <a
      href={`https://www.wikidata.org/wiki/${linkedEntity?.wikidata}`}
      target="_blank"
      rel="noreferrer"
    >
      {name ? name : linkedEntity?.wikidata}
    </a>
  );
};
