/**
 * Editron-Core. Depending on your build setup, use
 *
 * ```js
 * import { Editron } from "editron";
 * // or
 * const Editron = require("editron").Editron;
 * ```
 *
 * to get the editron core entry point for a enjoyable formular world
 *
 * @type exported methods and utilities
 * @property Editron    - the main Editron-Class you want to start all form applications
 * @property components        - mithril components, for default html-generation of headers and containers
 * @property editors           - basic editron editors for object, array and simple value reprensentation
 * @property services          - services to work on data, json-schema, validation and more
 * @property utils             - utility functions, to generate ids, translate strings and resolve editors
 * @property plugin            - basic plugin implementation for editor registration
 */
import Editron from "./src/Editron";
export default Editron;
export { Editron };
import * as components_1 from "./src/components";
export { components_1 as components };
import * as utils_1 from "./src/utils";
export { utils_1 as utils };
export { translate } from "./src/utils/i18n";
export { default as render } from "./src/utils/render";
// editors
export { default as AbstractEditor, getTypeClass } from "./src/editors/AbstractEditor";
export { default as AbstractValueEditor } from "./src/editors/AbstractValueEditor";
export { default as ArrayEditor } from "./src/editors/arrayeditor";
export { default as ObjectEditor } from "./src/editors/objecteditor";
export { default as OneOfEditor } from "./src/editors/oneofeditor";
export { default as ValueEditor } from "./src/editors/valueeditor";
export { default as AutocompleteEditor } from "./src/editors/autocompleteeditor";
export { default as MinimapEditor } from "./src/editors/minimapeditor";
// services
export { default as DataService } from "./src/services/dataservice";
export { default as LocationService } from "./src/services/LocationService";
export { default as SchemaService } from "./src/services/SchemaService";
export { default as ValidationService } from "./src/services/ValidationService";
export { default as OverlayService } from "./src/services/OverlayService";
export { default as SessionService } from "./src/services/SessionService";
// plugins
export { default as plugin } from "./src/plugin";
export { default as DelegationPlugin } from "./src/plugin/delegationplugin";
export { default as RemoteDataPlugin } from "./src/plugin/remotedataplugin";
export { default as SelectionPlugin } from "./src/plugin/selectionplugin";
export { default as SortablePlugin, onAddSortable, onEndSortable } from "./src/plugin/sortableplugin";
export { default as SyncPlugin } from "./src/plugin/syncplugin";
export { default as diffpatch } from "./src/services/utils/diffpatch";
