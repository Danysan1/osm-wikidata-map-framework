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

export const Button: FC<ButtonProps> = (props) => {
  const content = useMemo(
    () => (
      <>
        {props.icon && (
          <Image
            className={styles.button_img}
            src={props.icon}
            alt={props.iconAlt}
            width={25}
            height={25}
          />
        )}
        {props.iconText && (
          <span className={styles.button_img} title={props.iconAlt}>
            {props.iconText}
          </span>
        )}
        &nbsp;
        <span className={props.showText ? "" : styles.no_text}>{props.text}</span>
      </>
    ),
    [props.icon, props.iconAlt, props.iconText, props.showText, props.text]
  );

  if (props.href) {
    return (
      <Link
        href={props.href}
        title={props.title}
        aria-label={props.title}
        role="button"
        className={`${styles.button} ${props.className}`}
      >
        {content}
      </Link>
    );
  } else if (props.onClick) {
    return (
      <a
        onClick={props.onClick}
        title={props.title}
        aria-label={props.title}
        role="button"
        className={`${styles.button} ${props.className}`}
      >
        {content}
      </a>
    );
  } else {
    throw new Error("Button: Either href or onClick must be passed");
  }
};
