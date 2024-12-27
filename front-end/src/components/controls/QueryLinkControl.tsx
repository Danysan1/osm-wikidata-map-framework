import { OsmInstance, OwmfResponse } from '@/src/model/OwmfResponse';
import { ControlPosition, MapSourceDataEvent } from 'maplibre-gl';
import { StaticImport } from 'next/dist/shared/lib/get-img-props';
import { FC, useCallback, useState } from 'react';
import { LinkControl } from './LinkControl/LinkControl';

interface QueryLinkControlProps {
    sourceIDs: string[];
    mapEventField: keyof OwmfResponse;
    baseURL: string;
    icon: string | StaticImport;
    title: string;
    minZoomLevel?: number;
    position?: ControlPosition;
    className?: string;
    site?: OsmInstance;
}

/**
 * Let the user open the query used to fetch the data shown in the current view inside their native editor.
 */
export const QueryLinkControl: FC<QueryLinkControlProps> = ({
    sourceIDs, mapEventField, baseURL, icon, title, minZoomLevel, position, className, site
}) => {
    const [url, setUrl] = useState<string | undefined>(undefined);
    const onSourceDataHandler = useCallback((e: MapSourceDataEvent) => {
        if (!e.isSourceLoaded || e.dataType !== "source" || !sourceIDs.includes(e.sourceId)) {
            // console.debug("QueryLinkControl: Source not loaded or not in list, hiding", e, sourceIDs);
            return;
        }

        if (e.source.type !== "geojson") {
            console.debug("QueryLinkControl: Source type is not geojson, hiding", e.source);
            setUrl(undefined);
            return;
        }

        const content = typeof e.source?.data === "object" ? e.source.data as OwmfResponse : undefined;
        if (!content) {
            console.debug("Source data is not an object, hiding", e.source);
            setUrl(undefined);
            return;
        }

        if(!!site && content.site !== site) {
            console.debug("QueryLinkControl: Wrong site, hiding", { content, mapEventField });
            setUrl(undefined);
            return;
        }

        const query = content[mapEventField];
        if (typeof query !== "string" || !query.length) {
            console.debug("QueryLinkControl: Missing query field, hiding", { content, mapEventField });
            setUrl(undefined);
            return;
        }

        const encodedQuery = encodeURIComponent(query),
            linkUrl = baseURL + encodedQuery;
        console.debug("QueryLinkControl: Setting link URL", { query, linkUrl, mapEventField });
        setUrl(linkUrl);

    }, [baseURL, mapEventField, site, sourceIDs]);

    return <LinkControl
        linkURL={url}
        icon={icon}
        title={title}
        minZoomLevel={minZoomLevel}
        position={position}
        className={className}
        onSourceData={onSourceDataHandler} />;
}
