import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { ButtonRow } from "./ButtonRow";
import entitreeLogo from "./img/entitree.png";

interface EtymologyButtonRowProps {
  etymology: EtymologyDetails;
}

export const EtymologyButtonRow: FC<EtymologyButtonRowProps> = ({ etymology }) => {
  const { i18n } = useTranslation();
  const entitreeURL = useMemo(
    () =>
      i18n.language && etymology.wikidata && etymology.instanceID == "Q5"
        ? `https://www.entitree.com/${i18n.language}/family_tree/${etymology.wikidata}`
        : undefined,
    [etymology.instanceID, etymology.wikidata, i18n.language]
  );

  return (
    <ButtonRow
      wikidata={etymology.wikidata}
      wikipedia={etymology.wikipedia}
      commons={etymology.commons}
      wikispore={etymology.wikispore}
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
