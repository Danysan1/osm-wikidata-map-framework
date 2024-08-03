import styles from "../page.module.css";
import { ContributingIndex } from "@/src/components/Contributing/ContributingIndex";

export default async function LanguageContributing() {
    return (
        <main className={`${styles.main} ${styles.text}`}>
            <ContributingIndex />
        </main>
    );
}
