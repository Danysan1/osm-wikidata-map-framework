import { DropdownControl, DropdownItem } from './DropdownControl';
import { setFragmentParams } from './fragment';
import { SourceID, sources } from './source.model';

/**
 * Let the user choose the map style.
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/example/toggle-layers/
 **/
export class SourceControl extends DropdownControl {
    constructor(onSourceChange: (sourceID: SourceID) => void, startSourceID: SourceID) {
        const dropdownItems: DropdownItem[] = Object.entries(sources).map(([sourceID, text]) => ({
            id: sourceID,
            text: text,
            onSelect: () => {
                onSourceChange(sourceID as SourceID);
                setFragmentParams(undefined, undefined, undefined, undefined, sourceID as SourceID);
            }
        }));
        super(
            '⚙️',
            dropdownItems,
            startSourceID,
            'Choose source'
        );
    }
}
