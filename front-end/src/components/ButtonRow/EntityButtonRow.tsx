import { LinkedEntityDetails } from "@/src/model/LinkedEntityDetails";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { ButtonRow } from "./ButtonRow";
import entitreeLogo from "./img/entitree.png";

interface EntityButtonRowProps {
  entity: LinkedEntityDetails;
}

export const EntityButtonRow: FC<EntityButtonRowProps> = ({ entity }) => {
  const { i18n } = useTranslation();
  const entitreeURL = useMemo(
    () =>
      i18n.language && entity.wikidata && entity.instanceID == "Q5"
        ? `https://www.entitree.com/${i18n.language}/family_tree/${entity.wikidata}`
        : undefined,
    [entity.instanceID, entity.wikidata, i18n.language]
  );

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
