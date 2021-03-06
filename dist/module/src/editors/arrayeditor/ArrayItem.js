import { renderAction } from "../../components/actions";
import arrayUtils from "../../utils/array";
import gp from "gson-pointer";
import Header from "../../components/header";
import m from "mithril";
const ActionsView = {
    view(vnode) {
        const { disabled, actions } = vnode.attrs;
        return m(".ed-actions", {
            class: disabled ? "is-disabled" : "is-enabled"
        }, m("i.mmf-icon.interactive", "more_vert"), m("ul", actions === null || actions === void 0 ? void 0 : actions.map(action => m("li", renderAction(action)))));
    }
};
export const EditorTarget = ".ed-item";
export default class ArrayItemEditor {
    constructor(pointer, editron, options) {
        // eslint-disable-next-line max-len
        this.$element = editron.createElement(".ed-child", options.attrs);
        this.editron = editron;
        this.passActions = (options === null || options === void 0 ? void 0 : options.passActions) === true;
        this.viewModel = {
            ...options,
            insert: undefined,
            pointer,
            length: options.length,
            index: ArrayItemEditor.getIndex(pointer),
            actions: this.createActions(options)
        };
        if (options === null || options === void 0 ? void 0 : options.insert) {
            this.viewModel.insert = {
                icon: "add",
                title: options.insertTitle,
                disabled: () => options.disabled,
                action: this.add.bind(this)
            };
        }
        this.updatePointer(pointer);
        this.render();
        const editorOptions = {
            hideTitle: options.header === true
        };
        if (this.passActions) {
            editorOptions.actions = this.viewModel.actions;
        }
        const $target = this.$element.querySelector(EditorTarget);
        this.editor = editron.createEditor(pointer, $target, editorOptions);
    }
    createActions(controls) {
        const actions = [];
        const { move, remove, clone, add, minItems, maxItems, moveUpTitle, moveDownTitle, removeTitle, cloneTitle, addTitle } = controls;
        if (move) {
            actions.push({
                icon: "arrow_upward",
                title: moveUpTitle,
                disabled: () => this.index === 0,
                action: () => this.move(this.index - 1)
            });
            actions.push({
                icon: "arrow_downward",
                title: moveDownTitle,
                disabled: () => this.index >= this.getLength() - 1,
                action: () => this.move(this.index + 1)
            });
        }
        if (remove) {
            actions.push({
                icon: "delete",
                title: removeTitle,
                disabled: () => this.getLength() <= minItems,
                action: () => this.remove()
            });
        }
        if (clone) {
            actions.push({
                icon: "content_copy",
                title: cloneTitle,
                disabled: () => this.getLength() >= maxItems,
                action: () => this.clone()
            });
        }
        if (add) {
            actions.push({
                icon: "add",
                title: addTitle,
                disabled: () => this.getLength() >= maxItems,
                action: () => this.add()
            });
        }
        return actions;
    }
    add() {
        arrayUtils.addItem(this.parentPointer, this.editron, this.index);
    }
    clone() {
        arrayUtils.cloneItem(this.parentPointer, this.editron, this.index);
    }
    remove() {
        arrayUtils.removeItem(this.parentPointer, this.editron, this.index);
    }
    move(to) {
        arrayUtils.moveItem(this.parentPointer, this.editron, this.index, to);
    }
    getLength() {
        const list = this.editron.service("data").get(this.parentPointer);
        if (Array.isArray(list)) {
            return list.length;
        }
        console.warn(`Invalid array at ${this.parentPointer} for element ${this.index}`);
        return 0;
    }
    disable(isDisabled = false) {
        if (this.viewModel.disabled !== isDisabled) {
            this.viewModel.disabled = isDisabled;
            this.render();
        }
    }
    updatePointer(newPointer) {
        var _a;
        this.index = ArrayItemEditor.getIndex(newPointer);
        this.parentPointer = gp.join(newPointer, "..", true);
        this.viewModel.index = ArrayItemEditor.getIndex(newPointer);
        this.viewModel.pointer = newPointer;
        this.viewModel.length = this.getLength();
        this.render();
        // @todo improve missing update of passed header actions
        // @ts-ignore
        this.passActions && ((_a = this.editor) === null || _a === void 0 ? void 0 : _a.render) && this.editor.render();
    }
    getElement() {
        return this.$element;
    }
    getPointer() {
        return this.viewModel.pointer;
    }
    destroy() {
        if (this.viewModel == null) {
            return;
        }
        this.viewModel = null;
        this.editron.destroyEditor(this.editor);
        this.$element.parentNode && this.$element.parentNode.removeChild(this.$element);
    }
    render() {
        const { showIndex, title, length, disabled, insert, header, actions } = this.viewModel;
        m.render(this.$element, [
            m(".ed-separator.mmf-row", insert && renderAction(insert)),
            // @todo consider to remove this option
            // optional array-item header (replacing child-header)
            header && m(Header, { title: title, actions }),
            // actions besides child-editor
            m(ActionsView, { disabled, actions }),
            // TARGET CONTAINER FOR EDITOR
            m(EditorTarget, {
                "data-index": `${this.index + 1} / ${length}`,
                "class": [
                    disabled ? "is-disabled" : "",
                    showIndex ? "with-index" : ""
                ].join(" ").trim()
            })
        ]);
    }
    static getIndex(pointer) {
        const parentPointer = gp.join(pointer, "..");
        return parseInt(pointer.replace(`${parentPointer}/`, ""));
    }
}
