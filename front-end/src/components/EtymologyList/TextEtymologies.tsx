import { OsmInstance, OsmType } from "@/src/model/Etymology";
import { EtymologyDetails } from "@/src/model/EtymologyDetails";
import { FC, useMemo } from "react";
import { EtymologyView } from "../EtymologyView/EtymologyView";

export interface TextEtymologiesProps {
  text_etymology?: string;
  text_etymology_descr?: string;
  other_etymologies?: EtymologyDetails[];
  from_osm_instance?: OsmInstance;
  from_osm_id?: number;
  from_osm_type?: OsmType;
}

export const TextEtymologies: FC<TextEtymologiesProps> = ({
  text_etymology,
  text_etymology_descr,
  other_etymologies,
  from_osm_instance,
  from_osm_id,
  from_osm_type,
}) => {
  const detailedEntities = useMemo(() => {
    const textEtyName = text_etymology === "null" ? undefined : text_etymology,
      textEtyNames = textEtyName ? textEtyName.split(";") : [],
      textEtyDescr = text_etymology_descr === "null" ? undefined : text_etymology_descr,
      textEtyDescrs = textEtyDescr ? textEtyDescr.split(";") : [],
      etys: EtymologyDetails[] = [];
    for (let n = 0; n < Math.max(textEtyNames.length, textEtyDescrs.length); n++) {
      const nthTextEtyName = n < textEtyNames.length ? textEtyNames[n].trim() : undefined,
        nthTextEtyDescr = n < textEtyDescrs.length ? textEtyDescrs[n].trim() : undefined,
        // If the text etymology has only the name and it's already shown by one of the Wikidata linked entities' name/description, hide it
        textEtyShouldBeShown =
          !!nthTextEtyDescr ||
          (nthTextEtyName &&
            other_etymologies?.every((ety) => {
              const a = !ety.name?.toLowerCase()?.includes(nthTextEtyName?.toLowerCase()),
                b = !ety.description
                  ?.toLowerCase()
                  ?.includes(nthTextEtyName?.toLowerCase()),
                out = a && b;
              console.debug("showEtymologies: should show text etymology? ", {
                a,
                b,
                ety,
                nthTextEtyName,
              });
              return out;
            }));
      console.debug("showEtymologies: showing text etymology? ", {
        n,
        nthTextEtyName,
        nthTextEtyDescr,
        textEtyShouldBeShown,
        etys,
      });
      if (textEtyShouldBeShown) {
        etys.push({
          name: nthTextEtyName,
          description: nthTextEtyDescr,
          from_osm_instance: from_osm_instance,
          from_osm_type: from_osm_type,
          from_osm_id: from_osm_id,
        });
      }
    }
    return etys;
  }, [
    from_osm_id,
    from_osm_instance,
    from_osm_type,
    other_etymologies,
    text_etymology,
    text_etymology_descr,
  ]);

  return (
    <>
      {detailedEntities?.map((ety, i) => (
        <EtymologyView key={i} etymology={ety} />
      ))}
    </>
  );
};
