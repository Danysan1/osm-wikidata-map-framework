import { Contributing } from "@/src/components/Contributing/Contributing";
import { LANGUAGES } from "@/src/i18n/common";
import { getActiveSourcePresetIDs } from "@/src/SourcePreset/common";
import { readSourcePreset } from "@/src/SourcePreset/server";
import styles from "../../../page.module.css";

// https://nextjs.org/docs/app/building-your-application/routing/internationalization#static-generation
export function generateStaticParams() {
  return LANGUAGES.flatMap(
    (lang) => getActiveSourcePresetIDs().map((preset) => ({ lang, preset }))
  );
}

interface PresetContributingProps {
  params: {
    lang: string;
    preset: string;
  }
}

export default function PresetContributing({ params: { lang, preset } }: PresetContributingProps) {
  return (
    <main className={`${styles.main} ${styles.text}`}>
      <Contributing lang={lang} sourcePreset={readSourcePreset(preset)} />
    </main>
  );
}
