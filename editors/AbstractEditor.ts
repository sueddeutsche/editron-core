import { JSONData, JSONPointer, JSONSchema } from "../src/types";
import Controller from "../src/Controller";


function getTypeClass(schema: JSONSchema): string {
    return schema.type === "array" || schema.type === "object" ? schema.type : "value";
}


/**
 * This is an optional base class for a custom editor. Inheriting from AbstractEditor will setup most required
 * editor-methods to work by default, while still allowing custom implementations. Most of all, it removes
 * the tedious and redundant controller/serivce/pointer bootstraping.
 *
 * Still required is
 *
 *      1. a custom `static editorOf(p, c, o)`-method, to register on a schema
 *      2. an `update(patch)`-method to respond to changes of the data at _pointer_
 *      3. a custom `updatePointer(newPointer)`-method to respond to changes in the location of the editor. Most of
 *          times, the pointer will be used in rendering and/or when creating child-editors. Dont forget to call
 *          `super.updatePointer(newPointer)`
 *
 * and optionally an `updateErrors(errors)`-method to handle new (or removed) errors.
 *
 * Convenience methods are
 *
 *      - `getData()` to fetch the associated data of the current _pointer_
 *      - `setData(newValue)` to update the associated data of the current _pointer_
 *      - `getSchema()` returning the json-schema of the current _pointer_
 *      - `getErrors()` returning a list of current errors
 *      - `toElement()` gives you the root dom-node for this editor (aka render target)
 *      - `focus()` and `blur()` to manage the selection state of the current input (requires correct placement of _id_)
 *
 * @param {String} pointer          - pointer referencing the current data and schema
 * @param {Controller} controller   - editron controller instance
 * @param {Object} options          - resolved options object
 */
export default class AbstractEditor {
    pointer: JSONPointer;
    controller: Controller;
    options: any;
    errors: Array<any>;
    dom: HTMLElement;
    updateErrors: Function;
    _addError: Function;
    _clearErrors: Function;

    static editorOf(pointer: JSONPointer, controller: Controller, options) { // eslint-disable-line
        throw new Error("Missing editorOf-method in custom editor");
    }

    constructor(pointer: JSONPointer, controller: Controller, options: any) {
        this.pointer = pointer;
        this.controller = controller;
        this.options = options;

        this.dom = this.controller
            .createElement(`.editron-container.editron-container--${getTypeClass(this.getSchema())}`, options.attrs);

        this.update = controller.data()
            .observe(pointer, this.update.bind(this), options.notifyNestedChanges === true);

        this.setErrors = controller.validator()
            .observe(pointer, this.setErrors.bind(this), options.notifyNestedErrors === true);

        this.errors = this.controller.validator()
            .getErrorsAndWarnings(pointer);
    }

    update() {
        throw new Error("Missing implemented of method 'update' in custom editor");
    }

    updatePointer(newPointer: JSONPointer): [JSONPointer, JSONPointer] {
        const oldPointer = this.pointer;

        this.controller.data().removeObserver(oldPointer, this.update);
        this.controller.validator().removeObserver(oldPointer, this.setErrors);

        this.pointer = newPointer;

        this.controller.data().observe(newPointer, this.update, this.options.notifyNestedChanges === true);
        this.setErrors = this.controller.validator().observe(newPointer, this.setErrors);

        return [newPointer, oldPointer];
    }

    getData(): any {
        return this.controller.data().get(this.pointer);
    }

    setData(data: JSONData) {
        return this.controller.data().set(this.pointer, data);
    }

    getErrors() {
        return this.errors;
    }

    getSchema(): JSONSchema {
        return this.controller.schema().get(this.pointer);
    }

    getPointer(): JSONPointer {
        return this.pointer;
    }

    focus(): void {
        this.controller.location().setCurrent(this.pointer);
    }

    blur(): void {
        this.controller.location().blur(this.pointer);
    }

    toElement(): HTMLElement {
        return this.dom;
    }

    destroy(): void {
        this.controller.removeInstance(this); // remove editor from editron and our html-element (dom) from the DOM
        this.controller.data().removeObserver(this.pointer, this.update);
        this.controller.validator().removeObserver(this.pointer, this._addError);
        this.controller.validator().off("beforeValidation", this._clearErrors);
    }

    setErrors(errors): void {
        this.errors = errors;
        if (this.updateErrors) {
            this.updateErrors(this.errors);
        }
    }
}