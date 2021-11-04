import {deepFreeze, toSkewerCase} from "./utils.js";

/**
 * import an html document
 * @param {string | URL} url
 * @return {Promise<HTMLDocument>}
 */
export const importHtml = url => {
    return fetch(url.toString())
        .then(res => res.text())
        .then(text => {
            const doc = document.createDocumentFragment()
            const el = document.createElement("div")
            el.innerHTML = text
            doc.append(...el.childNodes)
            return doc
        })
}

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
     * array of names of attributes to observe
     * @type {string[]}
     */
    static attributes = []
    /**
     * content of the default style tag
     * @type {string | null}
     */
    static styleSheet = null
    /**
     * content of the element before any modification
     * @type {string | HTMLElement | HTMLDocument | null}
     */
    static template = null

    /**
     * @type {this | ShadowRoot}
     */
    #body

    /**
     * @type {State | null}
     */
    #state

    /**
     * @param {{} | null} state the initial state of the component
     */
    constructor(state = null) {
        super()

        console.log(this)
        if (this.__proto__.constructor.shadowRootType) {
            this.#body = this.attachShadow({mode: this.__proto__.constructor.shadowRootType})
        }
        this.#body ??= this

        importHtml("src/truc.html").then(result => this.#body.append(result))

        this.state = state
    }

    /**
     * get the element's body
     * @return {this | ShadowRoot}
     */
    get body() { return this.#body }

    /**
     * remove every child of the body
     * add a <style> with it's content set to class.styleSheet if defined and class.shadowRootType !== null
     */
    resetBody() {
        this.#body.innerHTML = ""
        if (this.#body instanceof ShadowRoot && this.__proto__.constructor.styleSheet) {
            const style = document.createElement("style")
            style.innerHTML = this.__proto__.constructor.styleSheet
            this._body.appendChild(style)
        }
    }

    /**
     * @param {{} | null} newState
     */
    set state(newState) {
        // TODO
    }

    /**
     * @return {State | null}
     */
    get state() {
        // TODO
    }

    /**
     * callback called when the element is connected to a document
     */
    connectedCallback() {
        // TODO
        return;
        if (this.isConnected) {
            this.render?.()
            this._flatStateCb = this._generateFlatStateCb(this.observers.state)
            if (Cell.CellState.get(this) === undefined) {
                Cell.CellState.register(this, this.state)
            }
            Cell.CellState.get(this)._rebuildCallbackObject()
        }
    }
    /**
     * callback called when the element is disconnected from a document
     */
    disconnectedCallback() {
        // TODO
        return;
        this.ondisconnect?.()
        this.dispatchEvent(disconnectEvent)

        Cell.CellState.unregister(this)
        this.clear?.()
    }
    /**
     * callback called when the element is moved from a document to another
     */
    adoptedCallback() {}
    /**
     * callback called when an attribute contained in class.attributes is changed
     *  - will call this.observers.attributes[name] if it exists
     *  - else will call this.render
     * @param {string} name the attribute's name
     * @param {string} oldValue the attribute's old value
     * @param {string} newValue the attribute's new value
     */
    attributeChangedCallback(name, oldValue, newValue) {
        // TODO
        return;
        const callback = (
            Object.entries(this.observers.attributes)
                .find(([key,]) => key.toLowerCase() === name.toLowerCase())
            ?? [])
            [1]
        if (typeof callback === "function") {
            callback.call(this, name, oldValue, newValue)
        } else {
            this.render?.call(this, name, oldValue, newValue)
        }
    }
    /**
     * function used by the customElementRegistry to know which attributes our element observe
     * set the attributes name to lowercase because uppercase mess with the mecanism
     * @return {string[]}
     */
    static get observedAttributes() { return this.prototype.constructor.attributes.map(attributeName => attributeName.toLowerCase()) }

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

        if (Object.hasOwn(customElementDefinition, "template") && typeof customElementDefinition.template === "string") {
            importHtml(customElementDefinition.template)
                .then(result => {
                    Object.defineProperty(customElementDefinition, "template", {
                        value: deepFreeze(result),
                        writable: false
                    })
                })
        }

        const attributes = Object.hasOwn(customElementDefinition, "attributes") ? customElementDefinition.attributes : Cell.attributes
        const styleSheet = Object.hasOwn(customElementDefinition, "styleSheet") ? customElementDefinition.styleSheet : Cell.styleSheet
        const template = Object.hasOwn(customElementDefinition, "template") ? customElementDefinition.template : Cell.template
        Object.defineProperties(customElementDefinition, {
            tagName: {
                value: deepFreeze(tagName),
                writable: false
            },
            attributes: {
                value: deepFreeze(attributes),
                writable: false
            },
            styleSheet: {
                value: deepFreeze(styleSheet),
                writable: false
            }
        });

        return customElementDefinition
    }
}
