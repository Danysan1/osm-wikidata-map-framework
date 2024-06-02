import styles from "./page.module.css";
import OwmfMap from "./components/OwmfMap/OwmfMap";

export default function Home() {
  return (
    <main className={styles.main}>
      <OwmfMap />
    </main>
  );
}
