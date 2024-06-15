import { EtymologyResponse } from '@/src/model/EtymologyResponse';
import { MapSourceDataEvent } from 'maplibre-gl';
import { FC, useCallback, useState } from 'react';
import { LinkControl } from './LinkControl';

interface QueryLinkControlProps {
    sourceIDs: string[];
    mapEventField: keyof EtymologyResponse;
    baseURL: string;
    iconURL: string;
    title: string;
    minZoomLevel?: number;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    className?: string;
}

export const QueryLinkControl: FC<QueryLinkControlProps> = (props) => {
    const [url, setUrl] = useState<string|undefined>(undefined);
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
            if (process.env.NODE_ENV === 'development') console.debug("Missing query field, hiding", { content, field:props.mapEventField });
            setUrl(undefined);
        } else {
            const encodedQuery = encodeURIComponent(query),
                linkUrl = props.baseURL + encodedQuery;
            setUrl(linkUrl);
        }
    }, [props.baseURL, props.mapEventField, props.sourceIDs]);

  return <LinkControl
    linkURL={url}
    iconURL={props.iconURL}
    title={props.title}
    minZoomLevel={props.minZoomLevel}
    position={props.position}
    className={props.className}
    onSourceData={onSourceDataHandler} />;
}
