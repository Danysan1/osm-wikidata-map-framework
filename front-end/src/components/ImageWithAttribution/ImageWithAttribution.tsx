import { useTranslation } from 'next-i18next';
import Image from "next/image";
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
export const ImageWithAttribution: React.FC<ImageWithAttributionProps> = ({ previewUrl, originalUrl, attribution, className }) => {
    const { t } = useTranslation();
    const title = t("feature_details.picture_via_commons", "Picture from Wikimedia Commons");
    return <div className={styles["pic-container"]}>
        <a className={styles["pic-link"]} href={originalUrl} title={title} aria-label={title}>
            <Image className={styles["pic-img"]} src={previewUrl} alt={title} width={300} height={300} />
        </a>
        {attribution && <p className={`${styles["pic-attr"]} ${className}`} dangerouslySetInnerHTML={{ __html: attribution }}></p>}
    </div>;
}
