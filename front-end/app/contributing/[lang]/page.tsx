import { Contributing } from "@/src/components/Contributing/Contributing";
import { parseStringArrayConfig } from "@/src/config";
import { LANGUAGES } from "@/src/i18n/common";
import { loadServerI18n } from "@/src/i18n/server";
import { readSourcePreset } from "@/src/SourcePreset/server";
import Link from "next/link";

// https://nextjs.org/docs/app/building-your-application/routing/internationalization#static-generation
export function generateStaticParams() {
    return LANGUAGES.map((lang) => ({ lang }));
}

interface LanguageContributingProps {
    params: { lang: string; }
}

export default async function LanguageContributing({ params: { lang } }: LanguageContributingProps) {
    const { t } = await loadServerI18n(lang);
    const presets = process.env.owmf_source_presets ? parseStringArrayConfig(process.env.owmf_source_presets) : ["custom"];
    return (
        <main>
            {!presets.length && "ERROR: No presets found"}
            {presets.length === 1 && <Contributing lang={lang} sourcePreset={readSourcePreset(presets[0])} />}
            {presets.length > 1 && (<>
                <h1>{t("preset.choose_preset")}</h1>
                <ul>
                    {presets.map((preset) => (
                        <li key={preset}>
                            <Link href={`/contributing/${lang}/${preset}`}>{t(`preset.${preset}`)}</Link>
                        </li>
                    ))}
                </ul>
            </>)}
        </main>
    );
}
