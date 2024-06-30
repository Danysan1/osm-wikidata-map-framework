
import { EtymologyFeature } from '@/src/model/EtymologyResponse';
import { WikidataDescriptionService } from '@/src/services/WikidataDescriptionService';
import { WikidataLabelService } from '@/src/services/WikidataLabelService';
import { WikidataStatementService } from '@/src/services/WikidataStatementService';
import { useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import { FeatureButtonRow } from '../ButtonRow/FeatureButtonRow';
import { EtymologyList } from '../EtymologyList/EtymologyList';
import { CommonsImage } from '../ImageWithAttribution/CommonsImage';

interface FeatureViewProps {
    feature: EtymologyFeature;
}

export const FeatureView: React.FC<FeatureViewProps> = ({ feature }) => {
    const { t, i18n } = useTranslation(),
        props = feature.properties,
        osm_full_id = props?.osm_type && props.osm_id ? props.osm_type + '/' + props.osm_id : null,
        fromOsmUrl = props?.from_osm && osm_full_id ? `https://www.openstreetmap.org/${osm_full_id}` : undefined,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        fromWdEntity = props?.from_wikidata_entity || props?.wikidata,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        fromWdProperty = props?.from_wikidata_prop || "P625",
        fromWikidataUrl = props?.from_wikidata && fromWdEntity ? `https://www.wikidata.org/wiki/${fromWdEntity}#${fromWdProperty}` : undefined,
        [mainName, setMainName] = useState<string>(),
        [altNames, setAltNames] = useState<string[]>(),
        [description, setDescription] = useState<string>(),
        [commons, setCommons] = useState<string[]>();
    useEffect(() => {
        const local_name = props?.["name:" + i18n.language],
            default_name = props?.["name:en"];

        if (typeof local_name === "string" && local_name !== 'null') {
            setMainName(local_name);
        } else if (props?.name && props.name !== 'null') {
            setMainName(props.name);
        } else if (typeof default_name === "string" && default_name !== 'null') {
            setMainName(default_name);
        } else if (props?.official_name && props.official_name !== 'null') {
            setMainName(props.official_name);
        } else if (props?.alt_name && props.alt_name !== 'null') {
            setMainName(props.alt_name);
        } else if (props?.wikidata) {
            const labelService = new WikidataLabelService();
            labelService.getSomeLabelFromWikidataID(props.wikidata, i18n.language).then((label) => {
                if (label) {
                    if (process.env.NODE_ENV === 'development') console.debug("Found label from Wikidata", { qid: props.wikidata, label });
                    setMainName(label);
                }
            }).catch(() => {
                if (process.env.NODE_ENV === 'development') console.warn("Failed getting label from Wikidata", { qid: props.wikidata });
            });
        }
    }, [i18n.language, props]);

    useEffect(() => {
        const alt_name_set = new Set<string>();
        [props?.name, props?.official_name, props?.alt_name]
            .flatMap(name => name?.split(";"))
            .map(name => name?.trim())
            .filter(name => name && name !== 'null' && (!mainName || name.toLowerCase() !== mainName.toLowerCase()))
            .forEach(name => alt_name_set.add(name!)); // deduplicates alt names
        if (alt_name_set.size > 0) {
            setAltNames(Array.from(alt_name_set));
        }
    }, [mainName, props?.alt_name, props?.name, props?.official_name]);

    useEffect(() => {
        if (props?.description && props.description !== 'null') {
            setDescription(props.description);
        } else if (props?.wikidata) {
            const descriptionService = new WikidataDescriptionService();
            descriptionService.getDescriptionFromWikidataID(props.wikidata, i18n.language).then((desc) => {
                if (desc) {
                    if (process.env.NODE_ENV === 'development') console.debug("Found description from Wikidata", { qid: props.wikidata, desc });
                    setDescription(desc);
                }
            }).catch(() => {
                if (process.env.NODE_ENV === 'development') console.warn("Failed getting description from Wikidata", { qid: props.wikidata });
            });
        }
    }, [i18n.language, props]);

    useEffect(() => {
        if (props?.commons?.includes("File:")) {
            setCommons([props.commons]);
        } else if (props?.picture?.includes("File:")) {
            setCommons([props.picture]);
        } else if (props?.wikidata) {
            const statementService = new WikidataStatementService();
            statementService.getCommonsImageFromWikidataID(props.wikidata).then((image) => {
                if (image) {
                    if (process.env.NODE_ENV === 'development') console.debug("Found image from Wikidata", { props, image });
                    setCommons([image]);
                }
            }).catch(() => {
                console.warn("Failed getting image from Wikidata", props);
            });
        }
    }, [props]);

    return <div className="detail_container">
        <h3 className="element_name">📍 {mainName}</h3>
        {altNames?.length && <p className="element_alt_names">
            {altNames.map(name => '"' + name + '"').join(" / ")}
        </p>}
        {description && <p className="element_description">{description}</p>}
        <div className="feature_buttons_placeholder"><FeatureButtonRow feature={feature} /></div>
        {commons?.length && <div className="feature_pictures column">
            {commons.map((img, i) => <CommonsImage key={i} name={img} />)}
        </div>}

        {props?.etymologies && <EtymologyList etymologies={props.etymologies} />}

        <a title={t("feature_details.report_problem")} role="button" className="k-button w3-button w3-white w3-border w3-round-large button-6 ety_error_button title_i18n_report_problem" href={process.env.owmf_element_issue_url} >
            <span className="button_img">⚠️</span> &nbsp;
            <span>{t("feature_details.report_problem")}</span>
        </a>

        <div className="feature_src_wrapper">
            <span>{t("feature_details.source")}</span>
            {fromOsmUrl && <a className="feature_src_osm" href={fromOsmUrl}>OpenStreetMap</a>}
            {fromOsmUrl && fromWikidataUrl && <span className="src_osm_and_wd">&</span>}
            {fromWikidataUrl && <a className="feature_src_wd" href={fromWikidataUrl}>Wikidata</a>}
        </div>
    </div>;
}
