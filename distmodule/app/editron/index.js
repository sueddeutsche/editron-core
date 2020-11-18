import Controller from "../../src/Controller";
import DelegationPlugin from "../../src/plugin/delegationplugin";
import SortablePlugin from "../../src/plugin/sortableplugin";
import RemoteDataPlugin from "../../src/plugin/remotedataplugin";
import MinimapEditor from "../../src/editors/minimapeditor";
// import schema from "./schema";
import schema from "./schema-test";
import "./index.scss";
import "./index.html";
const data = {
// list: [{ type: "inline" }, { type: "external" }], simple: ["Lorem Linksrum"]
};
const editron = new Controller(schema, data, {
    plugins: [
        new SortablePlugin(),
        new RemoteDataPlugin(),
        new DelegationPlugin({
            onDelegation: (event) => {
                console.log("delegation", event);
                const dom = document.querySelector(".sidepanel");
                dom.appendChild(event.editor.getElement());
            }
        })
    ]
});
editron.editors.unshift(MinimapEditor);
editron.createEditor("#", document.querySelector(".editor"));
editron.createEditor("#", document.querySelector(".minimap"), {
    minimap: {
        use: true
        // filter: ["#/groups", "#/groups/*/content", "#/groups/*/content/title"]
    }
});
// @ts-ignore
window.controller = editron;
