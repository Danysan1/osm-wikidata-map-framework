import { parseBoolConfig } from "@/src/config";
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
    if (!parseBoolConfig("wikispore_enable")) return undefined;
    return etymology.wikispore?.startsWith("http")
      ? etymology.wikispore
      : `https://wikispore.wmflabs.org/wiki/${etymology.wikispore}`;
  }, [etymology.wikispore]);
  const commons = useMemo(() => {
    if (!etymology?.commons || etymology.commons === "null") return undefined;

    if (etymology.commons.startsWith("Category:"))
      return `https://commons.wikimedia.org/wiki/${etymology.commons}`;

    if (!etymology.commons.startsWith("http") && !etymology.commons.includes("File:"))
      return `https://commons.wikimedia.org/wiki/Category:${etymology.commons}`;

    return etymology.commons;
  }, [etymology?.commons]);

  return (
    <ButtonRow
      entitree={entitree}
      wikidata={etymology.wikidata}
      wikipedia={etymology.wikipedia}
      commons={commons}
      wikispore={wikispore}
    />
  );
};
