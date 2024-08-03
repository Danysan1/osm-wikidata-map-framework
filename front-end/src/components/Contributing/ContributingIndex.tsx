import { SourcePreset } from "@/src/model/SourcePreset";
import { FC } from "react";
import { Contributing } from "./Contributing";
import { getActiveSourcePresetIDs } from "@/src/SourcePreset/common";
import { loadServerI18n } from "@/src/i18n/server";
import { readSourcePreset } from "@/src/SourcePreset/server";
import Link from "next/link";

interface ContributingIndexProps {
    lang?: string;
}

export const ContributingIndex: FC<ContributingIndexProps> = async ({ lang }) => {
    const { t, i18n } = await loadServerI18n(lang);
    const presets = getActiveSourcePresetIDs();
    return <>
        {!presets.length && "ERROR: No presets found"}
        {presets.length === 1 && <Contributing lang={i18n.language} sourcePreset={readSourcePreset(presets[0])} />}
        {presets.length > 1 && (<>
            <h1>{t("preset.choose_preset")}</h1>
            <ul>
                {presets.map((preset) => (
                    <li key={preset}>
                        <Link href={`/contributing/${i18n.language}/${preset}`}>
                            {t(`preset.${preset}`)}
                        </Link>
                    </li>
                ))}
            </ul>
        </>)}
    </>;
};