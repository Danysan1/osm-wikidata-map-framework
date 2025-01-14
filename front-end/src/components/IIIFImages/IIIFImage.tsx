import { Manifest } from "@iiif/presentation-3";
import { FC } from "react";
import { ImageWithAttribution } from "../ImageWithAttribution/ImageWithAttribution";

interface IIIFImageProps {
  manifest: Manifest;
  className?: string;
}

/**
 * Display a IIIF image and its attribution
 */
export const IIIFImage: FC<IIIFImageProps> = ({ manifest, className }) => {
  const imageURL = findImageURL(manifest);
  return (
    imageURL && (
      <ImageWithAttribution
        previewUrl={imageURL}
        originalUrl={imageURL}
        attribution={findImageAttribution(manifest)}
        title="Picture from IIIF"
        className={className}
      />
    )
  );
};

function findImageURL(manifest: Manifest): string | undefined {
  return manifest.items
    ?.map((canvas) => {
    //   const thumbnail = canvas.thumbnail?.find((t) => t.type === "Image");
    //   if (thumbnail) return thumbnail.id;

      return canvas.items
        ?.flatMap((annotationPage) =>
          annotationPage.items?.flatMap((annotation) => {
            if (Array.isArray(annotation.body)) {
              return annotation.body
                .map((body) => typeof body !== "string" && body.type === "Image" ? body.id : undefined)
                .find((url) => url);
            } else if (
              typeof annotation.body !== "string" &&
              annotation.body?.type === "Image"
            ) {
              return annotation.body.id;
            } else {
              return undefined;
            }
          })
        )
        .find((url) => url);
    })
    .find((url) => url);
}

function findImageAttribution(manifest:Manifest): string {
    const artist = manifest.metadata?.find(m => m.label?.en?.[0] === "Artist")?.value?.en?.[0];
    return artist ? "IIIF - " + artist : "IIIF";
}
