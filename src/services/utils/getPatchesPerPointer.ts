import diffpatch, { Delta } from "./diffpatch";
import gp from "gson-pointer";
import getParentPointer from "./getParentPointer";
import { JSONPointer } from "../../types";


function sortByPointer(a, b) {
    if (a.pointer < b.pointer) {
        return -1;
    } else if (a.pointer > b.pointer) {
        return 1;
    }
    return 0;
}

export { Delta };

export type SearchResult = {
    pointer: JSONPointer;
    patch: Delta;
    /** if patch is a patch on array */
    isArrayItem: boolean;
    /** true, if element-property was added or removed */
    changedKey: boolean;
};

function findPatches(pointer, diff, result = []): Array<SearchResult> {
    // for a diff: { a: { '0': [ 'modifiedString' ], _t: 'a', _0: [ 'string', 0, 0 ] } }
    // return diff[a] as patch and ".../a" as pointer
    Object.keys(diff).forEach((key) => {
        if (key === "_t") {
            return;
        }

        if (Array.isArray(diff[key])) {
            const entry = {
                pointer: `${pointer}/${key}`,
                patch: diff[key],
                isArrayItem: false,
                changedKey: false
            };

            const propertyAdded = diff[key].length === 1;
            const propertyRemoved = diff[key][2] === 0;

            if (diff._t === "a") {
                entry.isArrayItem = true;
            } else if (propertyAdded || propertyRemoved) {
                entry.changedKey = true;
            }

            result.push(entry);

        } else {
            findPatches(`${pointer}/${key}`, diff[key], result);
        }
    });

    return result;
}


export type Patch = {
    pointer: JSONPointer;
    parentPointer: JSONPointer;
    patch: {
        [property: string]: Delta;
    }
}

/*
    Between two objects, returns the json-pointer of the edit

    - for now, returns common pointer of multiple changes (if any)
    - returns parent pointer for any array-items or object-properties that are added or removed. this ensures a
        container, array or object, receives a notification of changed children.
*/
export default function getPatchesPerPointer<T extends any>(previousValue: T, newValue: T): Array<Patch> {
    const diff = diffpatch.diff(previousValue, newValue);
    if (diff == null) {
        return [];
    }

    const patches = findPatches("#", diff);
    // merge all item patches by their parent-pointer
    const map = {};
    // @todo this should be directly resolved in 'findPatches'
    patches.forEach((entry) => {
        if (entry.isArrayItem) {
            const parent = gp.join(entry.pointer, "..");
            const key = entry.pointer.replace(`${parent}/`, "");
            map[parent] = map[parent] || { _t: "a" };
            map[parent][key] = entry.patch;
        } else if (entry.changedKey) {
            const parent = gp.join(entry.pointer, "..");
            const key = entry.pointer.replace(`${parent}/`, "");
            map[parent] = map[parent] || {};
            map[parent][key] = entry.patch;
        } else {
            map[entry.pointer] = entry.patch;
        }
    });

    return Object.keys(map)
        .map(pointer => ({ pointer, parentPointer: getParentPointer(pointer), patch: map[pointer] }))
        .sort(sortByPointer);
};