import { OsmType } from "@/src/model/Etymology";
import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { FC, useMemo } from "react";
import { EtymologyView } from "../EtymologyView/EtymologyView";

export interface TextEtymologiesProps {
  text_etymology?: string;
  text_etymology_descr?: string;
  other_etymologies?: EtymologyDetails[];
  from_osm_id?: number;
  from_osm_type?: OsmType;
}

export const TextEtymologies: FC<TextEtymologiesProps> = (props) => {
  const detailedEntities = useMemo(() => {
    const textEtyName = props.text_etymology === "null" ? undefined : props.text_etymology,
      textEtyNames = textEtyName ? textEtyName.split(";") : [],
      textEtyDescr = props.text_etymology_descr === "null" ? undefined : props.text_etymology_descr,
      textEtyDescrs = textEtyDescr ? textEtyDescr.split(";") : [],
      etys: EtymologyDetails[] = [];
    for (let n = 0; n < Math.max(textEtyNames.length, textEtyDescrs.length); n++) {
      const nthTextEtyName = n < textEtyNames.length ? textEtyNames[n].trim() : undefined,
        nthTextEtyDescr = n < textEtyDescrs.length ? textEtyDescrs[n].trim() : undefined,
        // If the text etymology has only the name and it's already shown by one of the Wikidata linked entities' name/description, hide it
        textEtyShouldBeShown = !!nthTextEtyDescr || (nthTextEtyName &&
          props.other_etymologies?.every((ety) => {
            const a = !ety.name?.toLowerCase()?.includes(nthTextEtyName?.toLowerCase()),
            b = !ety.description?.toLowerCase()?.includes(nthTextEtyName?.toLowerCase()),
            out = a && b;
            console.debug("showEtymologies: should show text etymology? ", { a, b, ety, nthTextEtyName });
            return out;
          })
        );
      console.debug(
        "showEtymologies: showing text etymology? ",
        { n, nthTextEtyName, nthTextEtyDescr, textEtyShouldBeShown, etys }
      );
      if (textEtyShouldBeShown) {
        etys.push({
          name: nthTextEtyName,
          description: nthTextEtyDescr,
          from_osm: true,
          from_osm_type: props.from_osm_type,
          from_osm_id: props.from_osm_id,
        });
      }
    }
    return etys;
  }, [props.from_osm_id, props.from_osm_type, props.other_etymologies, props.text_etymology, props.text_etymology_descr]);

  return (
    <>
      {detailedEntities?.map((ety, i) => (
        <EtymologyView key={i} etymology={ety} />
      ))}
    </>
  );
};
