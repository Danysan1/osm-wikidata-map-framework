import { EtymologyResponse } from '@/src/model/EtymologyResponse';
import { ControlPosition, MapSourceDataEvent } from 'maplibre-gl';
import { StaticImport } from 'next/dist/shared/lib/get-img-props';
import { FC, useCallback, useState } from 'react';
import { LinkControl } from './LinkControl/LinkControl';

interface QueryLinkControlProps {
    sourceIDs: string[];
    mapEventField: keyof EtymologyResponse;
    baseURL: string;
    icon: string | StaticImport;
    title: string;
    minZoomLevel?: number;
    position?: ControlPosition;
    className?: string;
}

/**
 * Let the user open the query used to fetch the data shown in the current view inside their native editor.
 */
export const QueryLinkControl: FC<QueryLinkControlProps> = (props) => {
    const [url, setUrl] = useState<string | undefined>(undefined);
    const onSourceDataHandler = useCallback((e: MapSourceDataEvent) => {
        if (!e.isSourceLoaded || e.dataType !== "source" || !props.sourceIDs.includes(e.sourceId))
            return;

        if (e.source.type !== "geojson") {
            setUrl(undefined);
            return;
        }

        const content = typeof e.source?.data === "object" ? e.source.data as EtymologyResponse : undefined;
        if (!content) {
            if (process.env.NODE_ENV === 'development') console.debug("Source data is not an object, hiding", e.source);
            setUrl(undefined);
            return;
        }

        const query = content[props.mapEventField];
        if (typeof query !== "string" || !query.length) {
            if (process.env.NODE_ENV === 'development') console.debug("Missing query field, hiding", { content, field: props.mapEventField });
            setUrl(undefined);
        } else {
            const encodedQuery = encodeURIComponent(query),
                linkUrl = props.baseURL + encodedQuery;
            setUrl(linkUrl);
        }
    }, [props.baseURL, props.mapEventField, props.sourceIDs]);

    return <LinkControl
        linkURL={url}
        icon={props.icon}
        title={props.title}
        minZoomLevel={props.minZoomLevel}
        position={props.position}
        className={props.className}
        onSourceData={onSourceDataHandler} />;
}
