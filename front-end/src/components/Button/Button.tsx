import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import Link from "next/link";
import { FC, useMemo } from "react";
import styles from "./Button.module.css";

interface ButtonProps {
  href?: string;
  onClick?: () => void;
  title: string;
  text: string;
  showText?: boolean;
  icon?: string | StaticImport;
  iconText?: string;
  iconAlt: string;
  className?: string;
}

export const Button: FC<ButtonProps> = ({
  href, onClick, title, text, showText, icon, iconText, iconAlt, className
}) => {
  const content = useMemo(
    () => (
      <>
        {icon && (
          <Image
            className={styles.button_img}
            src={icon}
            alt={iconAlt}
            width={25}
            height={25}
          />
        )}
        {iconText && (
          <span className={styles.button_img} title={iconAlt}>
            {iconText}
          </span>
        )}
        &nbsp;
        <span className={showText ? "" : styles.no_text}>{text}</span>
      </>
    ),
    [icon, iconAlt, iconText, showText, text]
  );

  if (href) {
    return (
      <Link
        href={href}
        title={title}
        aria-label={title}
        role="button"
        className={`${styles.button} ${className}`}
      >
        {content}
      </Link>
    );
  } else if (onClick) {
    return (
      <a
        onClick={onClick}
        title={title}
        aria-label={title}
        role="button"
        className={`${styles.button} ${className}`}
      >
        {content}
      </a>
    );
  } else {
    throw new Error("Button: Either href or onClick must be passed");
  }
};
