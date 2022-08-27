import { imageToDomElement } from "./ImageElement";

/**
 * 
 * @param {string|Date} date 
 * @param {int} precision https://www.wikidata.org/wiki/Help:Dates#Precision
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
 * @return {string}
 */
function formatDate(date, precision) {
    let dateObject, options = {};

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

/**
 * 
 * @param {object} ety 
 * @return {HTMLElement}
 */
export function etymologyToDomElement(ety) {
    const etymology_template = document.getElementById('etymology_template'),
        etyDomElement = etymology_template.content.cloneNode(true),
        etymology_name = etyDomElement.querySelector('.etymology_name'),
        etymology_description = etyDomElement.querySelector('.etymology_description'),
        wikidata_button = etyDomElement.querySelector('.wikidata_button'),
        wikipedia_button = etyDomElement.querySelector('.wikipedia_button'),
        commons_button = etyDomElement.querySelector('.commons_button'),
        location_button = etyDomElement.querySelector('.subject_location_button'),
        start_end_date = etyDomElement.querySelector('.start_end_date'),
        event_place = etyDomElement.querySelector('.event_place'),
        citizenship = etyDomElement.querySelector('.citizenship'),
        gender = etyDomElement.querySelector('.gender'),
        occupations = etyDomElement.querySelector('.occupations'),
        prizes = etyDomElement.querySelector('.prizes'),
        pictures = etyDomElement.querySelector('.pictures');

    if (ety.name) {
        etymology_name.innerText = ety.name;
        etymology_name.style.display = 'block';
    } else {
        etymology_name.style.display = 'none';
    }

    if (ety.description) {
        etymology_description.innerText = ety.description;
        etymology_description.style.display = 'block';
    } else {
        etymology_description.style.display = 'none';
    }

    if (ety.wikidata) {
        wikidata_button.href = 'https://www.wikidata.org/wiki/' + ety.wikidata
        wikidata_button.style.display = 'inline-flex';
    } else {
        wikidata_button.style.display = 'none';
    }

    if (ety.wikipedia) {
        wikipedia_button.href = ety.wikipedia;
        wikipedia_button.style.display = 'inline-flex';
    } else {
        wikipedia_button.style.display = 'none';
    }

    if (ety.commons) {
        commons_button.href = "https://commons.wikimedia.org/wiki/Category:" + ety.commons;
        commons_button.style.display = 'inline-flex';
    } else {
        commons_button.style.display = 'none';
    }

    let coords = null,
        coordsOk = false;
    if (ety.wkt_coords) {
        coords = /Point\(([-\d.]+) ([-\d.]+)\)/i.exec(ety.wkt_coords);
        coordsOk = coords && coords.length > 1 && coords.at;
        if (!coordsOk)
            console.warn("Failed converting wkt_coords:", { et_id: ety.et_id, coords, wkt_coords: ety.wkt_coords });
    }
    if (coordsOk) {
        location_button.href = "#" + coords.at(1) + "," + coords.at(2) + ",12.5";
        location_button.style.display = 'inline-flex';
    } else {
        location_button.style.display = 'none';
    }

    if (ety.birth_date || ety.birth_place || ety.death_date || ety.death_place) {
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

    if (ety.event_place) {
        event_place.innerText = '📍 ' + ety.event_place;
    } else {
        event_place.style.display = 'none';
    }

    if (ety.citizenship) {
        citizenship.innerText = '🌍 ' + ety.citizenship;
    } else {
        citizenship.style.display = 'none';
    }

    if (ety.gender) {
        gender.innerText = '⚧️ ' + ety.gender;
    } else {
        gender.style.display = 'none';
    }

    if (ety.occupations) {
        occupations.innerText = '🛠️ ' + ety.occupations;
    } else {
        occupations.style.display = 'none';
    }

    if (ety.prizes) {
        prizes.innerText = '🏆 ' + ety.prizes;
    } else {
        prizes.style.display = 'none';
    }

    if (ety.pictures) {
        ety.pictures.forEach(function (img, n) {
            if (n < 5) {
                pictures.appendChild(imageToDomElement(img));
            }
        });
    } else {
        pictures.style.display = 'none';
    }

    if (ety.from_osm) {
        etyDomElement.querySelector('.etymology_src_osm').href = 'https://www.openstreetmap.org/' + ety.from_osm_type + '/' + ety.from_osm_id;
        etyDomElement.querySelector('.etymology_src_wd_wrapper').style.display = 'none';
    } else if (ety.from_wikidata) {
        etyDomElement.querySelector('.etymology_src_osm').href = 'https://www.openstreetmap.org/' + ety.from_osm_type + '/' + ety.from_osm_id;
        etyDomElement.querySelector('.etymology_src_wd_wrapper').style.display = 'inline';
        etyDomElement.querySelector('.etymology_src_wd').href = 'https://www.wikidata.org/wiki/' + ety.from_wikidata_cod + '#' + ety.from_wikidata_prop;
    } else {
        etyDomElement.querySelector('.etymology_src_wrapper').style.display = 'none';
    }

    return etyDomElement;
}
