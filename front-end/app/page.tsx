import { OwmfMapIfSupported } from "@/src/components/map/OwmfMapIfSupported";
import styles from "./page.module.css";

export default function RootHome() {
    return (
        <main className={styles.main}>
            <OwmfMapIfSupported />
        </main>
    );
}
