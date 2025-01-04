import Image from "next/image";
import styles from "./Image.module.css";

interface ImageWithAttributionProps {
  previewUrl: string;
  originalUrl: string;
  attribution?: string;
  className?: string;
  title: string;
}

/**
 * Display an image and its attribution
 */
export const ImageWithAttribution: React.FC<ImageWithAttributionProps> = ({
  previewUrl,
  originalUrl,
  attribution,
  className,
  title,
}) => {
  return (
    <div className={className}>
      <a className={styles.pic_link} href={originalUrl} title={title} aria-label={title}>
        <Image
          className={styles.pic_img}
          src={previewUrl}
          alt={title}
          width={350}
          height={350}
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
