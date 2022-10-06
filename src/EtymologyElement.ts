import { ImageResponse, imageToDomElement } from "./ImageElement";

interface Etymology {
    birth_date: string | null;
    birth_date_precision: number | null;
    birth_place: string | null;
    citizenship: string | null;
    commons: string | null;
    death_date: string | null;
    death_date_precision: number | null;
    death_place: string | null;
    description: string | null;
    end_date: string | null;
    end_date_precision: number | null;
    et_id: number | null;
    event_date: string | null;
    event_date_precision: number | null;
    event_place: string | null;
    from_osm: boolean | null;
    from_osm_id: number | null;
    from_osm_type: string | null;
    from_parts_of_wikidata_cod: string | null;
    from_wikidata: boolean | null;
    from_wikidata_cod: string | null;
    from_wikidata_prop: string | null;
    gender: string | null;
    name: string | null;
    occupations: string | null;
    pictures: ImageResponse[] | null;
    prizes: string | null;
    propagated: boolean | null;
    recursion_depth: number | null;
    start_date: string | null;
    start_date_precision: number | null;
    wd_id: string | null;
    wikidata: string | null;
    wikipedia: string | null;
    wkt_coords: string | null;
}

/**
 * 
 * @param {number} precision as documented in https://www.wikidata.org/wiki/Help:Dates#Precision
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
 */
function formatDate(date: string | Date, precision: number | null): string {
    let dateObject: Date;
    const options: Intl.DateTimeFormatOptions = {};

    if (date instanceof Date)
        dateObject = date;
    else if (typeof date === 'string')
        dateObject = new Date(date);
    else if (typeof date === 'number')
        dateObject = new Date(date * 1000); // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#the_ecmascript_epoch_and_timestamps
    else
        throw new Error("Invalid date parameter");

    if (precision) {
        if (precision >= 14) options.second = 'numeric';
        if (precision >= 13) options.minute = 'numeric';
        if (precision >= 12) options.hour = 'numeric';
        if (precision >= 11) options.day = 'numeric';
        if (precision >= 10) options.month = 'numeric';
        options.year = 'numeric';
    }

    if (dateObject < new Date('0000-01-01T00:00:00')) {
        options.era = "short";
    }

    const out = dateObject.toLocaleDateString(document.documentElement.lang, options);
    //console.info("formatDate", { date, precision, dateObject, options, out });
    return out;
}

function etymologyToDomElement(ety: Etymology): HTMLElement {
    const etymology_template = document.getElementById('etymology_template');
    if (!(etymology_template instanceof HTMLTemplateElement))
        throw new Error("Missing etymology template");

    const etyDomElement = etymology_template.content.cloneNode(true) as HTMLElement;
    //etyDomElement.dataset.et_id = ety.et_id?.toString();
    //etyDomElement.dataset.wd_id = ety.wd_id?.toString();

    /*console.info("etymologyToDomElement", {
        et_id: ety.et_id,
        wd_id: ety.wd_id,
        ety,
        etyDomElement
    });*/

    const etymology_name = etyDomElement.querySelector<HTMLElement>('.etymology_name');
    if (!etymology_name) {
        console.warn("Missing etymology_name");
    } else if (ety.name) {
        etymology_name.innerText = ety.name;
        etymology_name.style.display = 'block';
    } else {
        etymology_name.style.display = 'none';
    }

    const etymology_description = etyDomElement.querySelector<HTMLElement>('.etymology_description');
    if (!etymology_description) {
        console.warn("Missing etymology_description");
    } else if (ety.description) {
        etymology_description.innerText = ety.description;
        etymology_description.style.display = 'block';
    } else {
        etymology_description.style.display = 'none';
    }

    const wikidata_button = etyDomElement.querySelector<HTMLAnchorElement>('.wikidata_button');
    if (!wikidata_button) {
        console.warn("Missing wikidata_button");
    } else if (ety.wikidata) {
        wikidata_button.href = 'https://www.wikidata.org/wiki/' + ety.wikidata
        wikidata_button.style.display = 'inline-flex';
    } else {
        wikidata_button.style.display = 'none';
    }

    const wikipedia_button = etyDomElement.querySelector<HTMLAnchorElement>('.wikipedia_button');
    if (!wikipedia_button) {
        console.warn("Missing wikipedia_button");
    } else if (ety.wikipedia) {
        wikipedia_button.href = ety.wikipedia;
        wikipedia_button.style.display = 'inline-flex';
    } else {
        wikipedia_button.style.display = 'none';
    }

    const commons_button = etyDomElement.querySelector<HTMLAnchorElement>('.commons_button');
    if (!commons_button) {
        console.warn("Missing commons_button");
    } else if (ety.commons) {
        commons_button.href = "https://commons.wikimedia.org/wiki/Category:" + ety.commons;
        commons_button.style.display = 'inline-flex';
    } else {
        commons_button.style.display = 'none';
    }

    const location_button = etyDomElement.querySelector<HTMLAnchorElement>('.subject_location_button');
    if (!location_button) {
        console.warn("Missing location_button");
    } else if (ety.wkt_coords) {
        const coords = /Point\(([-\d.]+) ([-\d.]+)\)/i.exec(ety.wkt_coords),
            coordsOk = !!coords && coords.length > 1;
        if (coordsOk) {
            location_button.href = "#" + coords.at(1) + "," + coords.at(2) + ",12.5";
            location_button.style.display = 'inline-flex';
        } else {
            location_button.style.display = 'none';
            console.warn("Failed converting wkt_coords:", { et_id: ety.et_id, coords, wkt_coords: ety.wkt_coords });
        }
    }

    const start_end_date = etyDomElement.querySelector<HTMLElement>('.start_end_date')
    if (!start_end_date) {
        console.warn("Missing start_end_date");
    } else if (ety.birth_date || ety.birth_place || ety.death_date || ety.death_place) {
        const birth_date = ety.birth_date ? formatDate(ety.birth_date, ety.birth_date_precision) : "?",
            birth_place = ety.birth_place ? ety.birth_place : "?",
            death_date = ety.death_date ? formatDate(ety.death_date, ety.death_date_precision) : "?",
            death_place = ety.death_place ? ety.death_place : "?";
        start_end_date.innerText = `📅 ${birth_date} (${birth_place}) - ${death_date} (${death_place})`;
    } else if (ety.start_date || ety.end_date) {
        const start_date = ety.start_date ? formatDate(ety.start_date, ety.start_date_precision) : "?",
            end_date = ety.end_date ? formatDate(ety.end_date, ety.end_date_precision) : "?";
        start_end_date.innerText = `📅 ${start_date} - ${end_date}`;
    } else if (ety.event_date) {
        const event_date = formatDate(ety.event_date, ety.event_date_precision);
        start_end_date.innerText = `📅 ${event_date}`
    } else {
        start_end_date.style.display = 'none';
    }

    const event_place = etyDomElement.querySelector<HTMLElement>('.event_place');
    if (!event_place) {
        console.warn("Missing event_place");
    } else if (ety.event_place) {
        event_place.innerText = '📍 ' + ety.event_place;
    } else {
        event_place.style.display = 'none';
    }

    const citizenship = etyDomElement.querySelector<HTMLElement>('.citizenship');
    if (!citizenship) {
        console.warn("Missing citizenship");
    } else if (ety.citizenship) {
        citizenship.innerText = '🌍 ' + ety.citizenship;
    } else {
        citizenship.style.display = 'none';
    }

    const gender = etyDomElement.querySelector<HTMLElement>('.gender');
    if (!gender) {
        console.warn("Missing gender");
    } else if (ety.gender) {
        gender.innerText = '⚧️ ' + ety.gender;
    } else {
        gender.style.display = 'none';
    }

    const occupations = etyDomElement.querySelector<HTMLElement>('.occupations');
    if (!occupations) {
        console.warn("Missing occupations");
    } else if (ety.occupations) {
        occupations.innerText = '🛠️ ' + ety.occupations;
    } else {
        occupations.style.display = 'none';
    }

    const prizes = etyDomElement.querySelector<HTMLElement>('.prizes');
    if (!prizes) {
        console.warn("Missing prizes");
    } else if (ety.prizes) {
        prizes.innerText = '🏆 ' + ety.prizes;
    } else {
        prizes.style.display = 'none';
    }

    const pictures = etyDomElement.querySelector<HTMLDivElement>('.pictures');
    if (!pictures) {
        console.warn("Missing pictures");
    } else if (ety.pictures) {
        ety.pictures.forEach(function (img: ImageResponse, n: number) {
            if (n < 5) {
                pictures.appendChild(imageToDomElement(img));
            }
        });
    } else {
        pictures.style.display = 'none';
    }

    const src_osm = etyDomElement.querySelector<HTMLAnchorElement>('.etymology_src_osm'),
        src_wd = etyDomElement.querySelector<HTMLAnchorElement>('.etymology_src_wd'),
        src_wd_wrapper = etyDomElement.querySelector<HTMLElement>('.etymology_src_wd_wrapper'),
        src_part_of_wd = etyDomElement.querySelector<HTMLAnchorElement>('.etymology_src_part_of_wd'),
        src_part_of_wd_wrapper = etyDomElement.querySelector<HTMLElement>('.etymology_src_part_of_wd_wrapper');
    if (src_osm) {
        if (ety.from_osm_type && ety.from_osm_id) {
            src_osm.href = 'https://www.openstreetmap.org/' + ety.from_osm_type + '/' + ety.from_osm_id;
        } else {
            src_osm.href = 'https://www.openstreetmap.org/';
            console.warn("Bad etymology, missing OSM source");
        }
    }
    if (ety.from_wikidata_cod && src_wd_wrapper && src_wd) {
        src_wd.href = 'https://www.wikidata.org/wiki/' + ety.from_wikidata_cod + '#' + ety.from_wikidata_prop;
        src_wd_wrapper.style.display = 'inline';
    } else if (src_wd_wrapper) {
        src_wd_wrapper.style.display = 'none';
    }
    if (ety.from_parts_of_wikidata_cod && src_part_of_wd_wrapper && src_part_of_wd) {
        src_part_of_wd.href = 'https://www.wikidata.org/wiki/' + ety.from_parts_of_wikidata_cod + '#P527';
        src_part_of_wd_wrapper.style.display = 'inline';
    } else if (src_part_of_wd_wrapper) {
        src_part_of_wd_wrapper.style.display = 'none';
    }


    const propagated = etyDomElement.querySelector<HTMLElement>('.etymology_propagated');
    if (propagated && ety.recursion_depth) {
        propagated.style.display = 'inline';
    } else if (propagated) {
        propagated.style.display = 'none';
    }

    return etyDomElement;
}

export { Etymology, etymologyToDomElement }
