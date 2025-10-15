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
      href={`${process.env.NEXT_PUBLIC_OWMF_wikibase_instance_url}/wiki/${linkedEntity.wikidata}`}
      target="_blank"
      rel="noreferrer"
    >
      {linkedEntity.name ? linkedEntity.name : linkedEntity.wikidata}
    </a>
  );
};
