import { OwmfMapIfSupported } from "@/src/components/map/OwmfMapIfSupported";
import { generateOwmfMetadata } from "@/src/metadata";
import { Metadata } from "next";
import styles from "../page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return generateOwmfMetadata();
}

export default function RootHome() {
  return (
    <main className={`${styles.main} ${styles.map}`}>
      <OwmfMapIfSupported />
    </main>
  );
}
