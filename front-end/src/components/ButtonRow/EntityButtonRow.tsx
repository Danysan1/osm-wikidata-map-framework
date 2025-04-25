import { LinkedEntityDetails } from "@/src/model/LinkedEntityDetails";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { ButtonRow } from "./ButtonRow";
import entitreeLogo from "./img/entitree.png";

interface EntityButtonRowProps {
  entity: LinkedEntityDetails;
}

export const EntityButtonRow: FC<EntityButtonRowProps> = ({ entity }) => {
  const { i18n } = useTranslation(),
    language = i18n.language.split("_")[0]; // Ignore country
  const entitreeURL = language && entity.wikidata && entity.instanceID == "Q5"
    ? `https://www.entitree.com/${language}/family_tree/${entity.wikidata}`
    : undefined;

  return (
    <ButtonRow
      wikidata={entity.wikidata}
      wikipedia={entity.wikipedia}
      commons={entity.commons}
      wikispore={entity.wikispore}
    >
      {entitreeURL && (
        <Button
          href={entitreeURL}
          title="EntiTree"
          className="entitree_button"
          icon={entitreeLogo}
          iconAlt="EntiTree logo"
          text="EntiTree"
        />
      )}
    </ButtonRow>
  );
};
