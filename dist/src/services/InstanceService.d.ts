import { Editor } from "../editors/Editor";
import { JSONPointer } from "../types";
import { Change } from "./dataservice/change";
import Editron from "../Editron";
/**
 * manages editor instance events -
 * tracks and notifies instances over their lifetime on changes
 */
export default class InstanceService {
    editron: Editron;
    /** active editor instances */
    instances: Array<Editor>;
    constructor(editron: any);
    add(editor: Editor): void;
    findFrom(parentPointer: JSONPointer): Editor[];
    editorFromElement(dom: HTMLElement): Editor;
    find<T extends Editor>(test: (editor: T) => boolean): Array<T>;
    remove(editor: Editor): void;
    /**
     *  move or delete properties/items before upcoming editor updates
     *  - changes pointers and observers and
     *  - notifies editors
     */
    updateContainer(pointer: JSONPointer, editron: any, changes: Array<Change>): void;
    /** change all editors active-state */
    setActive(active: boolean): void;
    destroy(): void;
    /**
     * @debug
     * @returns currently active editor/widget instances sorted by pointer
     */
    getInstancesPerPointer(): {};
}
