import { isMoveChange, isDeleteChange } from "./dataservice/change";
/**
 * manages editor instance events -
 * tracks and notifies instances over their lifetime on changes
 */
export default class InstanceService {
    constructor(controller) {
        /** active editor instances */
        this.instances = [];
        this.controller = controller;
    }
    add(editor) {
        const pointer = editor.getPointer();
        editor.getElement().setAttribute("data-point", pointer);
        editor.update = editor.update.bind(editor);
        editor.pointer = pointer;
        this.controller.service("data").observe(pointer, editor.update, editor.notifyNestedChanges);
        this.controller.service("validation").observe(pointer, editor.update, editor.notifyNestedErrors);
        this.instances.push(editor);
    }
    findFrom(parentPointer) {
        return this.instances.filter(editor => editor.getPointer().startsWith(parentPointer));
    }
    editorFromElement(dom) {
        return this.instances.find(editor => editor.dom === dom);
    }
    find(test) {
        return this.instances.filter(test);
    }
    remove(editor) {
        this.controller.service("data").removeObserver(editor.pointer, editor.update);
        this.controller.service("validation").removeObserver(editor.pointer, editor.update);
        this.instances = this.instances.filter(ed => ed !== editor);
    }
    /**
     *  move or delete properties/items before upcoming editor updates
     *  - changes pointers and observers and
     *  - notifies editors
     */
    updateContainer(pointer, controller, changes) {
        const changePointers = [];
        for (let i = 0, l = changes.length; i < l; i += 1) {
            const change = changes[i];
            // we have to collect editors up front or patch-sequences get mangled
            // between update and not yet udpated editor
            if (isMoveChange(change)) {
                changePointers.push({
                    ...change,
                    editors: this.findFrom(change.pointer)
                });
                // destroy editor instances
            }
            else if (isDeleteChange(change)) {
                this.findFrom(change.pointer).forEach(ed => controller.destroyEditor(ed));
            }
        }
        // change pointer of instances
        changePointers.forEach(change => {
            const { pointer: prevPtr, to: nextPtr, editors } = change;
            editors.forEach((instance) => {
                const oldPointer = instance.pointer;
                const newPointer = instance.getPointer().replace(prevPtr, nextPtr);
                this.controller.service("data")
                    .removeObserver(instance.pointer, instance.update)
                    .observe(newPointer, instance.update, instance.notifyNestedChanges);
                this.controller.service("validation")
                    .removeObserver(instance.pointer, instance.update)
                    .observe(newPointer, instance.update, instance.notifyNestedChanges);
                instance.pointer = newPointer;
                instance.update({ type: "pointer", value: newPointer });
                instance.pointer = newPointer;
                instance.getElement().setAttribute("data-point", newPointer);
                controller.plugins.forEach(plugin => {
                    if (plugin.onChangePointer) {
                        plugin.onChangePointer(oldPointer, newPointer, instance);
                    }
                });
            });
        });
    }
    /** change all editors active-state */
    setActive(active) {
        this.instances.forEach(ed => ed.update({ type: "active", value: active }));
    }
    destroy() {
        this.instances.forEach(instance => instance.destroy());
        this.instances.length = 0;
    }
    /**
     * @debug
     * @returns currently active editor/widget instances sorted by pointer
     */
    getInstancesPerPointer() {
        const map = {};
        this.instances.forEach(editor => {
            const pointer = editor.getPointer();
            map[pointer] = map[pointer] || [];
            if (map[pointer].includes(editor) === false) {
                map[pointer].push(editor);
            }
            else {
                console.log("multiple instances on", editor.getPointer(), editor);
            }
        });
        return map;
    }
}