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
  const wikispore = useMemo(() => {
    if (!etymology.wikispore || !process.env.owmf_wikispore_enable) return undefined;

    return etymology.wikispore.startsWith("http")
      ? etymology.wikispore
      : `https://wikispore.wmflabs.org/wiki/${etymology.wikispore}`;
  }, [etymology.wikispore]);

  return (
    <ButtonRow
      entitree={entitree}
      wikidata={etymology.wikidata}
      wikipedia={etymology.wikipedia}
      commons={etymology.commons}
      wikispore={wikispore}
    />
  );
};
