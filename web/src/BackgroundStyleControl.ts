import { logErrorMessage } from './sentry';
import { Map } from 'mapbox-gl';

interface BackgroundStyle {
    id: string;
    text: string;
    styleUrl: string;
}

/**
 * @see https://cloud.maptiler.com/maps/
 */
function maptilerBackgroundStyle(id: string, text: string, maptilerId: string, maptilerKey: string): BackgroundStyle {
    return {
        id: id,
        text: text,
        styleUrl: 'https://api.maptiler.com/maps/' + maptilerId + '/style.json?key=' + maptilerKey
    };
}

/**
 * @see https://docs.mapbox.com/api/maps/vector-tiles/
 * @see https://docs.mapbox.com/api/maps/styles/#mapbox-styles
 */
function mapboxBackgroundStyle(id: string, text: string, mapboxUser: string, mapboxId: string, mapboxToken: string): BackgroundStyle {
    return {
        id: id,
        text: text,
        styleUrl: 'https://api.mapbox.com/styles/v1/' + mapboxUser + '/' + mapboxId + '/?access_token=' + mapboxToken
    };
}

/**
 * Let the user choose the map style.
 * 
 * Control implemented as ES6 class
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 **/
class BackgroundStyleControl {
    private _backgroundStyles: BackgroundStyle[];
    private _startBackgroundStyleId: string;
    private _map: Map|null;
    private _container: HTMLDivElement|null;
    private _ctrlDropDown: HTMLSelectElement|null;
    
    constructor(backgroundStyles:BackgroundStyle[], startBackgroundStyleId:string) {
        this._backgroundStyles = backgroundStyles;
        this._startBackgroundStyleId = startBackgroundStyleId;

        this._map = null;
        this._container = null;
        this._ctrlDropDown = null;
    }

    onAdd(map: Map): HTMLElement {
        this._map = map;

        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl background-style-ctrl';

        const table = document.createElement('table');
        this._container.appendChild(table);

        const tr = document.createElement('tr');
        table.appendChild(tr);

        const td1 = document.createElement('td'),
            td2 = document.createElement('td');
        tr.appendChild(td1);
        tr.appendChild(td2);

        const ctrlBtn = document.createElement('button');
        ctrlBtn.className = 'background-style-ctrl-button';
        ctrlBtn.title = 'Choose background style';
        ctrlBtn.textContent = '🌐';
        // https://stackoverflow.com/questions/36489579/this-within-es6-class-method
        ctrlBtn.onclick = this.btnClickHandler.bind(this);
        td2.appendChild(ctrlBtn);

        this._ctrlDropDown = document.createElement('select');
        this._ctrlDropDown.className = 'hiddenElement';
        this._ctrlDropDown.title = 'Background style';
        this._ctrlDropDown.onchange = this.dropDownChangeHandler.bind(this);
        td1.appendChild(this._ctrlDropDown);

        this._backgroundStyles.forEach(style => {
            const option = document.createElement('option');
            option.innerText = style.text;
            option.value = style.id;
            if (style.id == this._startBackgroundStyleId) {
                option.selected = true;
            }
            this._ctrlDropDown?.appendChild(option);
        })

        return this._container;
    }

    onRemove() {
        this._container?.parentNode?.removeChild(this._container);
        this._map = null;
    }

    btnClickHandler(event: MouseEvent) {
        console.info("BackgroundStyleControl button click", event);
        if (this._ctrlDropDown)
            this._ctrlDropDown.className = 'visibleDropDown';
    }

    dropDownChangeHandler(event: Event) {
        if (!(event.target instanceof HTMLSelectElement))
            throw new Error("Bad event target");
        const backgroundStyleId = event.target.value,
            backgroundStyleObj = this._backgroundStyles.find(style => style.id === backgroundStyleId);
        console.info("BackgroundStyleControl dropDown click", { backgroundStyleObj, event });
        if (backgroundStyleObj) {
            this._map?.setStyle(backgroundStyleObj.styleUrl);
            if (this._ctrlDropDown)
                this._ctrlDropDown.className = 'hiddenElement';
        } else {
            logErrorMessage("Invalid selected background style", "error", { backgroundStyleId });
        }
    }

}

export { BackgroundStyle, BackgroundStyleControl, maptilerBackgroundStyle, mapboxBackgroundStyle };