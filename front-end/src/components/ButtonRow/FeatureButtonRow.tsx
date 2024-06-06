import { EtymologyFeature } from "@/src/model/EtymologyResponse";
import { Position } from "geojson";
import { ButtonRow } from "./ButtonRow";

interface FeatureButtonRowProps {
    feature: EtymologyFeature;
    destinationZoomLevel: number;
    className?: string;
    setLon: (lon: number) => void;
    setLat: (lat: number) => void;
    setZoom: (zoom: number) => void;
}

export const FeatureButtonRow: React.FC<FeatureButtonRowProps> = ({ feature, destinationZoomLevel, className, setLon, setLat, setZoom }) => {
    const osm_full_id = feature.properties?.osm_type && feature.properties?.osm_id ? feature.properties.osm_type + '/' + feature.properties?.osm_id : null,
        openstreetmap = osm_full_id ? `https://www.openstreetmap.org/${osm_full_id}` : undefined,
        wikidata = feature.properties?.wikidata && feature.properties?.wikidata !== 'null' ? `https://www.wikidata.org/wiki/${feature.properties?.wikidata}` : undefined;

    let commons = feature.properties?.commons && feature.properties?.commons !== 'null' ? feature.properties?.commons : undefined;
    if (commons?.startsWith("Category:")) commons = `https://commons.wikimedia.org/wiki/${commons}`;
    if (commons && !commons.startsWith("http") && !commons.includes("File:")) commons = `https://commons.wikimedia.org/wiki/Category:${commons}`;

    let wikipedia = feature.properties?.wikipedia && feature.properties?.wikipedia !== 'null' ? feature.properties?.wikipedia : undefined;
    if (wikipedia && !wikipedia.startsWith("http")) wikipedia = `https://www.wikipedia.org/wiki/${wikipedia}`;

    let wikispore = feature.properties?.wikispore && feature.properties?.wikispore !== 'null' ? feature.properties?.wikispore : undefined;
    if (wikispore && !wikispore.startsWith("http")) wikispore = `https://wikispore.wmflabs.org/wiki/${wikispore}`;

    let pos: Position | undefined;
    if (feature.geometry.type === "Point") {
        pos = feature.geometry.coordinates;
    } else if (feature.geometry.type === "LineString") {
        pos = feature.geometry.coordinates[0];
    } else if (feature.geometry.type === "Polygon") {
        pos = feature.geometry.coordinates[0][0];
    } else if (feature.geometry.type === "MultiPolygon") {
        pos = feature.geometry.coordinates[0][0][0];
    }
    const lon = pos?.at(0),
        lat = pos?.at(1),
        zoomOnLocation = lon !== undefined && lat !== undefined ? () => { setLon(lon); setLat(lat); setZoom(destinationZoomLevel); } : undefined;

    let osmWikidataMatcher;
    if (osm_full_id && !feature.properties?.wikidata && lat !== undefined && lon !== undefined) osmWikidataMatcher = `https://map.osm.wikidata.link/map/18/${lat}/${lon}`;
    if (feature.properties?.wikidata && !osm_full_id) osmWikidataMatcher = `https://map.osm.wikidata.link/item/${feature.properties.wikidata}`;

    const mapcomplete_theme = process.env.owmf_mapcomplete_theme,
        mapcomplete = osm_full_id && mapcomplete_theme && lat !== undefined && lon !== undefined && !feature.properties?.boundary ? `https://mapcomplete.org/${mapcomplete_theme}?z=18&lat=${lat}&lon=${lon}#${osm_full_id}` : undefined,
        iD = feature.properties?.osm_type && feature.properties?.osm_id && !feature.properties?.boundary ? `https://www.openstreetmap.org/edit?editor=id&${feature.properties.osm_type}=${feature.properties.osm_id}` : undefined;

    return <ButtonRow commons={commons}
        iD={iD}
        location={zoomOnLocation}
        mapcomplete={mapcomplete}
        openstreetmap={openstreetmap}
        osmWikidataMatcher={osmWikidataMatcher}
        website={feature.properties?.website_url}
        wikidata={wikidata}
        wikipedia={wikipedia}
        wikispore={wikispore}
        className={className} />;
}
