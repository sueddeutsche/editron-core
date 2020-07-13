import m from "mithril";
import gp from "gson-pointer";
import Select from "mithril-material-forms/components/select";
import getId from "../../utils/getID";
import View from "../../components/container";
import UISchema from "../../utils/UISchema";
import { JSONSchema, JSONPointer } from "../../src/types";
import Controller from "../../src/Controller";

const { UI_PROPERTY } = UISchema;


export type ViewModel = {
    description?: string;
    disabled?: boolean;
    id: string;
    onchange?: Function;
    options?: any;
    pointer: JSONPointer;
    title?: string;
    value?: any;
};

export type Options = {
    renderOneOf?: boolean;
};


export default class OneOfEditor {
    $childContainer: HTMLElement;
    $element: HTMLElement;
    childEditor: any;
    childSchema: JSONSchema;
    controller;
    pointer: JSONPointer;
    schema: JSONSchema;
    viewModel: ViewModel;

    static editorOf(pointer: JSONPointer, controller: Controller, options: Options) {
        const schema = controller.schema().get(pointer);
        return schema.oneOfSchema && !schema.items && !options.renderOneOf;
    }

    constructor(pointer: JSONPointer, controller: Controller, options: Options) {
        const childSchema = controller.schema().get(pointer);
        // @special case. Our options lie in `schema.oneOfSchema`
        const schema = childSchema.oneOfSchema;
        const attrs = gp.get(schema, `#/${UI_PROPERTY}/attrs`);

        this.schema = schema;
        this.childSchema = childSchema;

        // ensure requried titles are set
        schema.oneOf.forEach((oneOfSchema, index) => (oneOfSchema.title = oneOfSchema.title || `${index}.`));

        this.$element = controller.createElement(".editron-container.editron-container--oneof", attrs);
        this.controller = controller;
        this.pointer = pointer;
        this.viewModel = {
            id: getId(pointer),
            pointer,
            options: schema.oneOf.map((oneOf, index) => ({ title: oneOf.title, value: index })),
            onchange: (oneOfIndex: number) => this.changeChild(schema.oneOf[oneOfIndex]),
            value: this.getIndexOf(childSchema),
            title: schema.title,
            description: schema.description
        };

        // use bubble=true to catch inner changes (changes are compared by a diff which may not notify parent pointer)
        this.update = controller.data().observe(pointer, this.update.bind(this), true);

        this.render();
        this.$childContainer = this.$element.querySelector(View.childContainerSelector);
        this.rebuild();
    }

    setActive(active = true): void {
        this.viewModel.disabled = active === false;
        this.render();
    }

    changeChild(schema): void {
        this.childEditor && this.childEditor.destroy();
        const data = this.controller.schema().getTemplate(schema);
        this.controller.data().set(this.pointer, data);
    }

    getIndexOf(currentSchema): number {
        for (let i = 0, l = this.schema.oneOf.length; i < l; i += 1) {
            if (this.schema.oneOf[i].title === currentSchema.title) {
                return i;
            }
        }
        return 0;
    }

    updatePointer(newPointer: JSONPointer): void {
        const oldPointer = this.getPointer();
        if (oldPointer === newPointer) {
            return;
        }

        this.controller.changePointer(newPointer, this);

        this.pointer = newPointer;
        this.viewModel.id = getId(newPointer);
        this.viewModel.pointer = newPointer;
        this.$element.id = newPointer;
        this.controller.data().removeObserver(oldPointer, this.update);
        this.controller.data().observe(newPointer, this.update, true);

        if (this.childEditor) {
            this.childEditor.updatePointer(newPointer);
        }

        this.render();
    }

    update(): void {
        const currentSchema = this.controller.schema().get(this.pointer);
        delete currentSchema.oneOfSchema; // is recreated each time
        if (currentSchema.title === this.childSchema.title) {
            return;
        }

        this.viewModel.value = this.getIndexOf(currentSchema);
        this.childSchema = currentSchema;
        this.rebuild();
    }

    rebuild(): void {
        this.childEditor && this.childEditor.destroy();
        this.$childContainer.innerHTML = "";
        this.childEditor = this.controller.createEditor(this.pointer, this.$childContainer, {
            // @attention this is very important or else we create an infinite loop through selectEditor
            renderOneOf: true
        });

        this.render();
    }

    render(): void {
        m.render(this.$element, m(View, this.viewModel,
            m(".editron-value",
                m(Select, this.viewModel)
            )
        ));
    }

    toElement(): HTMLElement {
        return this.$element;
    }

    getPointer(): JSONPointer {
        return this.pointer;
    }

    destroy(): void {
        if (this.viewModel == null) {
            return;
        }
        this.controller.removeInstance(this);

        this.viewModel = null;
        m.render(this.$element, "i");
        this.controller.data().removeObserver(this.pointer, this.update);
    }
}