import {deepFreeze, toSkewerCase} from "./utils.js";

/**
 * abstract class defining cells
 */
export default class Cell extends HTMLElement {
    /**
     * the tag name of the element
     * @type {?string}
     */
    static tagName
    /**
     * the type of shadow root to attach to this class
     * @type {"open" | "closed" | ShadowRootInit | null}
     */
    static shadowRootType = null
    /**
     * array of attributes to observe
     * @type {string[]}
     */
    static attributes = []
    /**
     * content of the default style tag
     * @type {?string}
     */
    static styleSheet = undefined
    /**
     * content of the element before any modification
     * @type {string | HTMLElement | HTMLDocument}
     */
    static template = ""

    /**
     * register a new Cell class as an Element
     *  - customElementDefinition.tagName will be modified if needed to be compatible with the HTML customElement standard
     *      - will be transformed to skewer-case using {@link toSkewerCase}
     *      - if only one word, will prepend "cell-"
     *      - spec : https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
     * @param {string} [tagName] name of the created element (may be modified slightly if not valid with the spec)
     * @param {typeof Cell} customElementDefinition a class extending Cell (the class itself, not an instance of it)
     * @throws {TypeError} if customElementDefinition is not a class extending Cell
     * @throws {TypeError} if shadowRootType is not a valid value
     * @return {typeof Cell} the customElementDefinition parameter with the tagName corrected if needed
     */
    static register(tagName, customElementDefinition) {
        if (customElementDefinition === undefined && tagName.prototype instanceof Cell) {
            customElementDefinition = tagName
            tagName = Object.hasOwn(customElementDefinition, "tagName") ?
                customElementDefinition.tagName :
                toSkewerCase(customElementDefinition.prototype.constructor.name)
        }

        if (! customElementDefinition.prototype instanceof Cell) {
            throw new TypeError(`The given class must extends Cell`)
        }

        if (! tagName) {throw new TypeError("You must define at least one way to name your new element tag")}
        if (! tagName.includes("-")) {tagName = `cell-${tagName}`}

        tagName = tagName.toLowerCase()

        if (customElementDefinition.shadowRootType !== null && ! ["open", "closed"].includes(customElementDefinition.shadowRootType)) {
            throw new TypeError(`Cell shadowRootType must be "open", "closed" or null`)
        }

        customElements.define(tagName, customElementDefinition)

        Object.defineProperty(customElementDefinition, "tagName", {
            value: tagName,
            writable: false
        })
        Object.defineProperty(customElementDefinition, "attributes", {
            value: deepFreeze(Object.hasOwn(customElementDefinition, "attributes") ? customElementDefinition.attributes : Cell.attributes),
            writable: false
        })
        Object.defineProperty(customElementDefinition, "styleSheet", {
            value: deepFreeze(Object.hasOwn(customElementDefinition, "styleSheet") ? customElementDefinition.styleSheet : Cell.styleSheet),
            writable: false
        })

        return customElementDefinition
    }
}
