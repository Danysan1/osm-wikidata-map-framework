import { FC } from "react";
import styles from "./Snackbar.module.css";

interface SnackbarProps {
    message: string;
    color: string;
    show?: boolean;
}

export const Snackbar: FC<SnackbarProps> = ({ message, color, show }) => {
    return (
        <div className={`${styles.snackbar} ${show ? styles.show : ''}`}
            style={{ backgroundColor: color }}
            role="alert">
            {message}
        </div>
    );
};