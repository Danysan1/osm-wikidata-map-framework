import { DropdownControl, DropdownItem } from './DropdownControl';

export interface SourceItem {
    id: string;
    text: string;
}

/**
 * Let the user choose the map style.
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/example/toggle-layers/
 **/
export class SourceControl extends DropdownControl {
    constructor(sources: SourceItem[], onSourceChange: (sourceID: string) => void, startSourceID: string) {
        const dropdownItems: DropdownItem[] = sources.map(source => ({
            id: source.id,
            text: source.text,
            onSelect: () => { onSourceChange(source.id); }
        }));
        super(
            '⚙️',
            dropdownItems,
            startSourceID,
            'Choose source'
        );
    }
}
