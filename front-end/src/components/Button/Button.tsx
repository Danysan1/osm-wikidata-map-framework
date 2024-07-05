import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import { FC } from "react";
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
  return (
    <a
      onClick={props.onClick}
      href={props.href}
      title={props.title}
      role="button"
      className={`w3-button w3-white w3-border w3-round-large button-6 ${styles.button} ${props.className}`}
    >
      {props.icon && (
        <Image
          className={styles.button_img}
          src={props.icon}
          alt={props.iconAlt}
          width={25}
          height={25}
        />
      )}
      {props.iconText && <span className={styles.button_img}>{props.iconText}</span>}
      &nbsp;
      <span className={props.showText ? "" : styles.no_text}>{props.text}</span>
    </a>
  );
};
