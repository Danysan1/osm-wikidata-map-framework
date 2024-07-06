import { OsmType } from "@/src/model/Etymology";
import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { FC } from "react";
import { EtymologyView } from "./EtymologyView";

export interface TextEtymologiesProps {
  text_etymology?: string;
  text_etymology_descr?: string;
  other_etymologies?: EtymologyDetails[];
  from_osm_id?: number;
  from_osm_type?: OsmType;
}

export const TextEtymologies: FC<TextEtymologiesProps> = (props) => {
  const textEtyName = props.text_etymology === "null" ? undefined : props.text_etymology,
    textEtyNames = textEtyName ? textEtyName.split(";") : [],
    textEtyDescr =
      props.text_etymology_descr === "null" ? undefined : props.text_etymology_descr,
    textEtyDescrs = textEtyDescr ? textEtyDescr.split(";") : [];

  const etymologies: EtymologyDetails[] = [];
  for (let n = 0; n < Math.max(textEtyNames.length, textEtyDescrs.length); n++) {
    const nthTextEtyNameExists = n < textEtyNames.length,
      nthTextEtyDescrExists = n < textEtyDescrs.length,
      // If the text etymology has only the name and it's already shown by one of the Wikidata etymologies' name/description, hide it
      textEtyShouldBeShown =
        nthTextEtyDescrExists ||
        (nthTextEtyNameExists &&
          props.other_etymologies?.every(
            (etymology) =>
              !etymology?.name
                ?.toLowerCase()
                ?.includes(textEtyNames[n].trim().toLowerCase()) &&
              !etymology?.description
                ?.toLowerCase()
                ?.includes(textEtyNames[n].trim().toLowerCase())
          )),
      nthTextEtyName = nthTextEtyNameExists ? textEtyNames[n] : undefined,
      nthTextEtyDescr = nthTextEtyDescrExists ? textEtyDescrs[n] : undefined;
    if (process.env.NODE_ENV === "development") console.debug(
      "showEtymologies: showing text etymology? ",
      { n, nthTextEtyName, nthTextEtyDescr, textEtyShouldBeShown, etymologies }
    );
    if (textEtyShouldBeShown) {
      etymologies.push({
        name: nthTextEtyName,
        description: nthTextEtyDescr,
        from_osm: true,
        from_osm_type: props.from_osm_type,
        from_osm_id: props.from_osm_id,
      });
    }
  }

  return (
    <>
      {etymologies?.map((ety, i) => (
        <EtymologyView key={i} etymology={ety} />
      ))}
    </>
  );
};
