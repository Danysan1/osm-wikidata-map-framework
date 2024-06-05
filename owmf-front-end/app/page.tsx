import OwmfMap from "@/src/components/OwmfMap/OwmfMap";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <OwmfMap />
    </main>
  );
}
