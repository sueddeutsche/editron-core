import m from "mithril";
import { CheckboxForm, InputForm, SwitchForm, SelectForm, TextareaForm } from "mithril-material-forms";
// import SwitchForm, { Attrs as SwitchAttrs } from "mithril-material-forms/components/switchform";
// import SelectForm, { Attrs as SelectAttrs } from "mithril-material-forms/components/selectform";
// import TextareaForm, { Attrs as TextareaAttrs } from "mithril-material-forms/components/textareaform";
// import InputForm, { Attrs as InputAttrs, InputType } from "mithril-material-forms/components/inputform";
import UISchema from "../../utils/UISchema";
const TYPES = {
    string: "text",
    integer: "number",
    number: "number"
};
function getInputType(schema) {
    return TYPES[schema.type] || "text";
}
const Component = {
    view(vnode) {
        const { schema, options = {}, onblur, onfocus, onchange, errors, value, pointer } = vnode.attrs;
        if (schema.enum && schema.enum.length > 0) {
            const selectFormModel = {
                id: pointer,
                title: options.title,
                description: options.description,
                disabled: options.disabled,
                theme: options.theme,
                errors,
                invertOrder: options.invertOrder,
                value,
                options: UISchema.enumOptions(schema),
                onchange,
                onblur,
                onfocus
            };
            return m(SelectForm, selectFormModel, vnode.children);
        }
        if (schema.type === "boolean" && schema.format === "switch") {
            const switchModel = {
                id: pointer,
                title: options.title,
                description: options.description,
                disabled: options.disabled,
                theme: options.theme,
                errors,
                value,
                onchange,
                onblur,
                onfocus
            };
            return m(SwitchForm, switchModel, vnode.children);
        }
        if (schema.type === "boolean") {
            const checkBoxModel = {
                id: pointer,
                title: options.title,
                description: options.description,
                disabled: options.disabled,
                theme: options.theme,
                errors,
                value,
                onchange,
                onblur,
                onfocus
            };
            return m(CheckboxForm, checkBoxModel, vnode.children);
        }
        if (schema.type === "string" && schema.format === "html") {
            const textareaModel = {
                id: pointer,
                title: options.title,
                description: options.description,
                placeholder: options.placeholder,
                disabled: options.disabled,
                theme: options.theme,
                errors,
                value,
                onchange,
                onblur,
                onfocus
            };
            return m(TextareaForm, textareaModel, vnode.children);
        }
        if (schema.type === "string" && schema.format === "textarea") {
            const textareaModel = {
                id: pointer,
                title: options.title,
                description: options.description,
                placeholder: options.placeholder,
                disabled: options.disabled,
                theme: options.theme,
                errors,
                rows: options["textarea:rows"] || 1,
                value,
                onchange,
                onblur,
                onfocus
            };
            return m(TextareaForm, textareaModel, vnode.children);
        }
        const inputModel = {
            id: pointer,
            title: options.title,
            description: options.description,
            placeholder: options.placeholder,
            disabled: options.disabled,
            theme: options.theme,
            errors,
            instantUpdate: options.instantUpdate,
            type: getInputType(schema),
            value,
            onchange,
            onblur,
            onfocus
        };
        return m(InputForm, inputModel, vnode.children);
    }
};
export default Component;
