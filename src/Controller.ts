import _createElement from "./utils/createElement";
import addItem from "./utils/addItem";
import addValidator from "json-schema-library/lib/addValidator";
import createProxy from "./utils/createProxy";
import DataService from "./services/DataService";
import gp from "gson-pointer";
import i18n from "./utils/i18n";
import InstanceService from "./services/InstanceService";
import jsonSchemaLibrary from "json-schema-library";
import LocationService from "./services/LocationService";
import plugin, { Plugin } from "./plugin";
import SchemaService from "./services/SchemaService";
import selectEditor from "./utils/selectEditor";
import State from "./services/State";
import UISchema from "./utils/UISchema";
import ValidationService from "./services/ValidationService";
import { Editor, EditorPlugin, SetEnabledEvent } from "./editors/Editor";
import { Foxy, Options as ProxyOptions } from "@technik-sde/foxy";
import { JSONPointer, JSONSchema, JSONData, FormatValidator, KeywordValidator } from "./types";

import oneOfEditor from "./editors/oneofeditor";
import arrayEditor from "./editors/arrayeditor";
import objectEditor from "./editors/objecteditor";
import valueEditor from "./editors/valueeditor";


const { JsonEditor: Core } = jsonSchemaLibrary.cores;


export type Options = {
    log?: boolean;
    editors?: Array<EditorPlugin>;
    proxy?: ProxyOptions|Foxy;
    plugins?;
};


export type Services = {
    instances: InstanceService;
    data: DataService;
    validation: ValidationService;
    schema: SchemaService;
    location: LocationService;
}


/**
 * Main component to build editors. Each editor should receive the controller, which carries all required services
 * for editor initialization
 *
 * ### Usage
 *
 * Instantiate the controller
 *
 * ```js
 * import Controller from "editron";
 * // jsonSchema = { type: "object", required: ["title"], properties: { title: { type: "string" } } }
 * const editron = new Controller(jsonSchema);
 * ```
 *
 * or, using all parameters
 *
 * ```js
 *  import Controller from "editron";
 *  // jsonSchema = { type: "object", required: ["title"], properties: { title: { type: "string" } } }
 *  // data = { title: "Hello" } - or simply use {}
 *  // options = { editors: [ complete list of custom editors ] }
 *  const editron = new Controller(jsonSchema, data, options);
 * ```
 *
 * and start rendering editors
 *
 * ```js
 *  const editor = editron.createEditor("#", document.querySelector("#editor"));
 *  // render from title only: editron.createEditor("#/title", document.querySelector("#title"));
 * ```
 *
 * to fetch the generated data use
 *
 * ```js
 *  const data = editron.getData();
 * ```
 *
 * @param [schema] - json schema describing required data/form template
 * @param [data] - initial data for given json-schema
 * @param [options] - configuration options
 * @param [options.editors] - list of editron-editors/widgets to use. Order defines editor to use
 *      (based on editorOf-method)
 */
export default class Controller {
    #proxy: Foxy;
    core;
    destroyed = false;
    disabled = false;
    editors: Array<EditorPlugin>;
    options: Options;
    plugins: Array<Plugin> = [];
    services: Services;
    state: State;

    constructor(schema: JSONSchema = { type: "object" }, data: JSONData = {}, options: Options = {}) {
        schema = UISchema.extendSchema(schema);

        this.options = {
            editors: [
                ...plugin.getEditors(),
                oneOfEditor,
                arrayEditor,
                objectEditor,
                valueEditor
            ],
            ...options,
        };

        this.editors = this.options.editors;
        this.state = new State();
        this.core = new Core();
        this.#proxy = createProxy(this.options.proxy);

        plugin.getValidators().forEach(([validationType, ...validator]) => {
            try {
                if (validationType === "format") {
                    // @ts-ignore
                    return this.addFormatValidator(...validator);
                } else if (validationType === "keyword") {
                    // @ts-ignore
                    return this.addKeywordValidator(...validator);
                }
                throw new Error(`Unknown validation type '${validationType}'`);

            } catch (e) {
                console.log("Error:", e.message);
            }

            return false;
        });

        // merge given data with template data
        const schemaService = new SchemaService(schema, data, this.core);
        data = schemaService.addDefaultData(data, schema);

        this.services = {
           instances: new InstanceService(this),
           location: new LocationService(),
           data: new DataService(this.state, data),
           schema: schemaService,
           validation: new ValidationService(this.state, schema, this.core)
        };

        this.service("data").watch(event => {
            switch (event.type) {
                // update container will be called before any editor change-notification this gives us time,
                // to manage update-pointer and destory events of known editors
                case "data:update:container":
                    this.services.instances.updateContainer(event.value.pointer, this, event.value.changes);
                    break;

                // sync latest data and start validation
                case "data:update:after": {
                    let { pointer } = event.value;
                    this.service("schema").setData(this.service("data").get());
                    // @feature selective-validation
                    if (pointer.includes("/")) {
                        // @attention validate parent-object or array, in order to support parent-validators.
                        // any higher validators will still be ignore
                        pointer = pointer.replace(/\/[^/]+$/, "");
                    }
                    setTimeout(() => {
                        const data = this.service("data").getDataByReference();
                        this.destroyed !== true && this.service("validation").validate(data, pointer);
                    });
                    break;
                }
            }
        });

        // enable i18n error-translations
        this.service("validation").setErrorHandler(error => i18n.translateError(this, error));
        // run initial validation
        this.validateAll();

        // @lifecycle hook initialize on controller ready
        if (Array.isArray(options.plugins)) {
            this.plugins = options.plugins.map(plugin => plugin.initialize(this));
        }
    }

    service<T extends keyof Services>(serviceName: T): Services[T] {
        return this.services[serviceName];
    }

    getPlugin(pluginId: string): Plugin {
        return this.plugins.find(plugin => plugin.id === pluginId);
    }

    /**
     * @param format - value of _format_
     * @param validator  - validator function receiving (core, schema, value, pointer). Return `undefined`
     *      for a valid _value_ and an object `{type: "error", message: "err-msg", data: { pointer }}` as error. May
     *      als return a promise
     */
    addFormatValidator(format: string, validator: FormatValidator): void {
        addValidator.format(this.core, format, validator);
    }

    /**
     * @param datatype - JSON-Schema datatype to register attribute, e.g. "string" or "object"
     * @param keyword - custom keyword
     * @param validator - validator function receiving (core, schema, value, pointer). Return `undefined`
     *      for a valid _value_ and an object `{type: "error", message: "err-msg", data: { pointer }}` as error. May
     *      als return a promise
     */
    addKeywordValidator(datatype: string, keyword: string, validator: KeywordValidator): void {
        addValidator.keyword(this.core, datatype, keyword, validator);
    }

    /** reset undo history */
    resetUndoRedo(): void {
        this.service("data").resetUndoRedo();
    }

    /**
     * enable or disable the editor input-interaction
     * @param active if false, deactivates editor
     */
    setActive(active = true) : void{
        const disabled = active === false;
        if (this.disabled === disabled) {
            return;
        }
        this.disabled = disabled;
        this.service("instances").setActive(!this.disabled);
    }

    /** returns the editors active state */
    isActive(): boolean {
        return !this.disabled;
    }

    /**
     * Helper to create dom elements via mithril syntax
     * @param selector - a css selector describing the desired element
     * @param attributes - a map of dom attribute:value of the element (reminder className = class)
     * @returns the resulting dom-element (not attached)
     */
    createElement(selector: string, attributes?): HTMLElement { // eslint-disable-line class-methods-use-this
        return _createElement(selector, attributes);
    }

    /**
     * @throws
     * The only entry point to create editors.
     * Use in application and from editors to create (delegate) child editors
     *
     * @param pointer - data pointer to editor in current state
     * @param element - parent element of create editor. Will be appended automatically
     * @param [options] - individual editor options
     * @returns created editor-instance or undefined;
     */
    createEditor(pointer: JSONPointer, element: HTMLElement, options?): Editor|undefined {
        assertValidPointer(pointer);
        if (element == null) {
            throw new Error(`Missing ${pointer == null ? "pointer" : "element"} in createEditor`);
        }

        // merge schema["editron:ui"] object with options. options precede
        const instanceOptions = {
            pointer,
            disabled: this.disabled,
            ...UISchema.copyOptions(pointer, this),
            ...options
        };

        instanceOptions.attrs = {
            "data-title": instanceOptions.title,
            ...instanceOptions.attrs
        };

        // find a matching editor
        const EditorConstructor = selectEditor(this.editors, pointer, this, instanceOptions);
        if (EditorConstructor === false) {
            return undefined;
        }

        if (EditorConstructor === undefined) {
            this.options.log && console.warn(`Could not resolve an editor for ${pointer}`, this.service("schema").get(pointer));
            return undefined;
        }

        // iniitialize editor and notify instance manager
        const editor = new EditorConstructor(pointer, this, instanceOptions);
        const dom = editor.getElement();
        element.appendChild(dom);
        this.services.instances.add(editor);
        editor.update(<SetEnabledEvent>{ type: "active", value: !instanceOptions.disabled });

        // @lifecycle hook create widget
        this.plugins.filter(plugin => plugin.onCreateEditor)
            .forEach(plugin => plugin.onCreateEditor(pointer, editor, instanceOptions));

        return editor;
    }

    /**
     * Call this method, to destroy your editors, deregistering its instance on editron
     * @param editor - editor instance to remove
     */
    destroyEditor(editor: Editor): void {
        if (!editor) {
            return;
        }

        // @lifecycle hook destroy widget
        this.plugins.filter(plugin => plugin.onDestroyEditor)
            .forEach(plugin => plugin.onDestroyEditor(editor.getPointer(), editor));

        this.services.instances.remove(editor);

        // controller inserted child and removes it here again
        const $element = editor.getElement();
        $element?.parentNode?.removeChild($element);
        editor.destroy();
    }

    /**
     * Request to insert a child item (within the data) at the given pointer. If multiple options are present, a
     * dialogue is opened to let the user select the appropriate type of child (oneof).
     * @param pointer - to array on which to insert the child
     * @param index - index within array, where the child should be inserted (does not replace). Default: 0
     */
    addItemTo(pointer: JSONPointer, index = 0): void {
        addItem(this.service("data"), this.service("schema"), this.services.location, pointer, index);
        this.services.location.goto(gp.join(pointer, index, true));
    }

    /**
     * @returns proxy instance
     */
    proxy(): Foxy { return this.#proxy; }

    /**
     * Set the application data
     * @param data - json data matching registered json-schema
     */
    setData(data: JSONData): void {
        data = this.service("schema").addDefaultData(data);
        this.service("data").set("#", data);
    }

    /**
     * @param [pointer="#"] - location of data to fetch. Defaults to root (all) data
     * @returns data at the given location
     */
    getData(pointer: JSONPointer = "#"): JSONData {
        return this.service("data").get(pointer);
    }

    /**
     * Change the new schema for the current data
     * @param schema   - a valid json-schema
     */
    setSchema(schema: JSONSchema): void {
        schema = UISchema.extendSchema(schema);
        this.service("validation").set(schema);
        this.service("schema").setSchema(schema);
    }

    /**
     * Starts validation of current data
     */
    validateAll(): void {
        setTimeout(() =>
            this.destroyed !== true && this.service("validation").validate(this.service("data").getDataByReference())
        );
    }

    /** Destroy the editor, its widgets and services */
    destroy(): void {
        this.destroyed = true;
        Object.keys(this.services).forEach(id => this.services[id].destroy());
    }
}


/** throws an error, when given pointer is not a valid jons-pointer */
function assertValidPointer(pointer: JSONPointer): void {
    if (pointer == null || pointer[0] !== "#") {
        throw new Error(`Invalid json(schema)-pointer: ${pointer}`);
    }
}
