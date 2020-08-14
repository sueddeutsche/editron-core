import m from "mithril";
import Controller from "../../Controller";
import AbstractEditor from "../../editors/AbstractEditor";
import { JSONPointer } from "../../types";
import { Editor } from "../../editors/Editor";
import { Button } from "mithril-material-forms/index";
import { Plugin } from "../index";


export type Options = {
    onSelect({ pointer, editor, options }): void;
    onDeselect({ pointer, editor, options }): void;
}

interface ModifiedEditor extends Editor {
    __selectionPlugin?: {
        select: (editor) => void;
        options: any;
    }
}


export default class SelectionPlugin implements Plugin {
    id = "selection-plugin";

    dom: HTMLElement;
    current: Editor;
    controller: Controller;
    // onDelegation: Options["onDelegation"];

    currentSelection: ModifiedEditor;
    onSelect: Options["onSelect"];
    onDeselect: Options["onDeselect"];

    constructor(options: Options) {
        // this.onDelegation = options.onDelegation;
        this.dom = document.createElement("div");
        this.onSelect = options.onSelect;
        this.onDeselect = options.onDeselect;
    }

    initialize(controller: Controller): Plugin {
        this.controller = controller;
        document.body.addEventListener("click", () => this.deselect());
        return this;
    }

    deselect() {
        if (this.currentSelection) {
            const editor = this.currentSelection;
            editor.toElement().classList.remove("selected");
            this.onDeselect({ pointer: editor.getPointer(), editor, options: editor.__selectionPlugin.options });
            this.currentSelection = null;
        }
    }

    select(event, editor: ModifiedEditor) {
        event.stopPropagation();
        if (this.currentSelection === editor) {
            return;
        }
        this.deselect();
        this.currentSelection = editor;
        this.currentSelection.toElement().classList.add("selected");
        // console.log("add class to ", this.currentSelection.toElement());
        this.onSelect({ pointer: editor.getPointer(), editor, options: editor.__selectionPlugin.options });
    }

    onCreateEditor(pointer, editor: ModifiedEditor, options?) {
        if (options && options.selectable) {
            // console.log("add selection", pointer, options);
            editor.__selectionPlugin = {
                options,
                select: event => this.select(event, editor)
            }
            editor.toElement().addEventListener("click", editor.__selectionPlugin.select);
        }
    }

    onDestroyEditor(pointer, editor: ModifiedEditor) {
        if (editor.__selectionPlugin) {
            editor.toElement().removeEventListener("click", editor.__selectionPlugin.select);
            editor.__selectionPlugin = undefined;

            if (this.currentSelection === editor) {
                this.currentSelection = null;
            }
        }
    }
}