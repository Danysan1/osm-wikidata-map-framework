import Image from "next/image";
import { useTranslation } from "react-i18next";
import styles from "./Image.module.css";

interface ImageWithAttributionProps {
  previewUrl: string;
  originalUrl: string;
  attribution?: string;
  className?: string;
}

/**
 * Display an image and its attribution
 */
export const ImageWithAttribution: React.FC<ImageWithAttributionProps> = ({
  previewUrl,
  originalUrl,
  attribution,
  className,
}) => {
  const { t } = useTranslation();
  const title = t(
    "feature_details.picture_via_commons",
    "Picture from Wikimedia Commons"
  );
  return (
    <div className={className}>
      <a className={styles.pic_link} href={originalUrl} title={title} aria-label={title}>
        <Image
          className={styles.pic_img}
          src={previewUrl}
          alt={title}
          width={300}
          height={300}
        />
      </a>
      {attribution && (
        <p
          className={styles.pic_attr}
          dangerouslySetInnerHTML={{ __html: attribution }}
        ></p>
      )}
    </div>
  );
};
