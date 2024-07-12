import { Contributing } from "@/src/components/Contributing/Contributing";
import { parseStringArrayConfig } from "@/src/config";
import { LANGUAGES } from "@/src/i18n/common";
import { readSourcePreset } from "@/src/SourcePreset/server";

// https://nextjs.org/docs/app/building-your-application/routing/internationalization#static-generation
export function generateStaticParams() {
  const presets = process.env.owmf_source_presets ? parseStringArrayConfig(process.env.owmf_source_presets) : ["custom"];
  return LANGUAGES.flatMap(
    (lang) => presets.map((preset) => ({ lang, preset }))
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
    <main>
      <Contributing lang={lang} sourcePreset={readSourcePreset(preset)} />
    </main>
  );
}
