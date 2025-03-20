import { CollectionItems, Manifest } from "@iiif/presentation-3";
import { FC, useEffect, useState } from "react";
import { IIIFImage } from "./IIIFImage";

interface IIIFImageProps {
  /**
   * IIIF manifest URL
   *
   * @example "https://api.dc.library.northwestern.edu/api/v2/collections/c373ecd2-2c45-45f2-9f9e-52dc244870bd?as=iiif"
   * @example "https://api.dc.library.northwestern.edu/api/v2/works/8a833741-74a8-40dc-bd1d-c416a3b1bb38?as=iiif"
   * @example "https://damsssl.llgc.org.uk/iiif/2.0/1130163/manifest.json"
   * @example "https://www.nga.gov/api/v1/iiif/presentation/manifest.json?cultObj:id=26"
   */
  manifestURL: string;
  className?: string;
}

/**
 * Display a IIIF image and its attribution
 *
 * @link https://commons.wikimedia.org/wiki/Commons:International_Image_Interoperability_Framework#IIIF_tools_and_software_for_Wikimedia_projects
 * @link https://iiif.io/get-started/how-iiif-works/
 * @link https://iiif.io/guides/using_iiif_resources/
 */
export const IIIFImages: FC<IIIFImageProps> = ({ manifestURL, className }) => {
  const [manifest, setManifest] = useState<CollectionItems>();
  useEffect(() => {
    fetchManifest(manifestURL).then(setManifest).catch(console.error);
  }, [manifestURL]);

  if (!manifest) return null;

  if (manifest?.type === "Collection") {
    return (
      <>
        {manifest?.items?.map(
          (image) =>
            image.type === "Manifest" && (
              <IIIFImage key={image.id} manifest={image} className={className} />
            )
        )}
      </>
    );
  }

  return <IIIFImage manifest={manifest} className={className} />;
};

/**
 * Fetch the attribution text for a IIIF file
 */
async function fetchManifest(manifestURL: string): Promise<CollectionItems> {
  const res = await fetch(manifestURL),
    manifest = (await res.json()) as unknown;
  console.debug("IIIF manifest fetched", { manifestURL, manifest });
  if (!manifest || typeof manifest !== "object")
    throw new Error("Manifest response is not a valid JSON object");
  if ("@type" in manifest)
    throw new Error("Received IIIF v2.0 manifest, only v3.0+ is supported");
  if (!("type" in manifest)) throw new Error("Invalid IIIF manifest (missing type)");
  if (manifest.type !== "Collection" && manifest.type !== "Manifest")
    throw new Error("Invalid IIIF manifest type");
  return manifest as Manifest;
}
