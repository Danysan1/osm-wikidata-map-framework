import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { FC, PropsWithChildren } from "react";
import { Source } from "react-map-gl/maplibre";

interface PMTilesSourceProps extends PropsWithChildren {
  id: string;
}

/**
 * Source and layers from a remote PMTiles file
 *
 * @see https://docs.protomaps.com/
 * @see https://docs.protomaps.com/pmtiles/maplibre
 */
export const PMTilesSource: FC<PMTilesSourceProps> = ({ id, children }) => {
  const { sourcePresetID } = useUrlFragmentContext();

  if (!process.env.NEXT_PUBLIC_OWMF_pmtiles_base_url) {
    console.warn("PMTilesSource: NEXT_PUBLIC_OWMF_pmtiles_base_url is not defined");
    return null;
  }

  const fullPMTilesURL = `pmtiles://${process.env.NEXT_PUBLIC_OWMF_pmtiles_base_url}${sourcePresetID}.pmtiles`; // Example: pmtiles://https://etymology.dsantini.it/etymology.pmtiles

  return (
    <Source id={id} type="vector" url={fullPMTilesURL}>
      {children}
    </Source>
  );
};
