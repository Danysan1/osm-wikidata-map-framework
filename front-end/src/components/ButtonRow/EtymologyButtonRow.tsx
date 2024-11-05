import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ButtonRow } from "./ButtonRow";

interface EtymologyButtonRowProps {
  etymology: EtymologyDetails;
}

export const EtymologyButtonRow: React.FC<EtymologyButtonRowProps> = ({ etymology }) => {
  const { i18n } = useTranslation();
  const entitree = useMemo(
    () =>
      i18n.language && etymology.wikidata && etymology.instanceID == "Q5"
        ? `https://www.entitree.com/${i18n.language}/family_tree/${etymology.wikidata}`
        : undefined,
    [etymology.instanceID, etymology.wikidata, i18n.language]
  );

  return (
    <ButtonRow
      entitreeURL={entitree}
      wikidata={etymology.wikidata}
      wikipedia={etymology.wikipedia}
      commons={etymology.commons}
      wikispore={etymology.wikispore}
    />
  );
};
