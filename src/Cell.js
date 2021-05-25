/**
 * try to transform the provided string into a skewer-case string
 * @param {string} input
 * @return {string} the input in skewer-case capitalisation
 */
const toSkewerCase = input => input.replaceAll(/[A-Z]/g, (found, i) => (i === 0 ? '' : '-') + found.toLowerCase())
/**
 * used by Cell.CellState to detect if the object is already proxied
 * @type {symbol}
 */
const isProxy = Symbol("isProxy")
/**
 * even dispatched when the Cell is detached
 * @type {Event}
 */
const disconnectEvent = new Event("disconnect")

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
     * @type {string | null}
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
     * the values you want to observe and their callback
     * @type { { attributes: { [string]: function | Object }, state: { [string]: function | Object } } }
     */
    observers = {}

    /**
     * the symbol used to tell observers that the delete keyword was used
     * @type {symbol}
     */
    static deleted = Symbol("deleted")
    /**
     * the state observers reduced to a flat array
     * @type { { [string]: function } }
     */
    _flatStateCb = {}
    /**
     * the element were you add the children elements
     *  - if class.shadowRootType = null, _body is the Element itself
     *  - else _body is the shadowRoot
     * @type {this | ShadowRoot}
     */
    _body = null

    /**
     * @param {object} state
     */
    constructor(state = {}) {
        super()

        if (this.__proto__.constructor.shadowRootType) {
            this._body = this.attachShadow({mode: this.__proto__.constructor.shadowRootType})
        }
        this._body ??= this
        this.clearBody()

        this.state = state
    }

    /**
     * get the element's body
     * @return {Cell|ShadowRoot}
     */
    get body() { return this._body }
    /**
     * remove every child of the body
     * add a <style> with it's content set to class.styleSheet if defined and class.shadowRootType !== null
     */
    clearBody() {
        this._body.innerHTML = ""
        if (this._body instanceof ShadowRoot && this.__proto__.constructor.styleSheet) {
            const style = document.createElement("style")
            style.innerHTML = this.__proto__.constructor.styleSheet
            this._body.appendChild(style)
        }
    }

    /**
     * return the element's state
     * @return {object}
     */
    get state() { return Cell.CellState.get(this).getStateFor(this) }
    /**
     * change the element's state to the provided object
     * @param {object} newState
     */
    set state(newState) {
        if (typeof newState !== "object") { throw new TypeError("Cell state must be an object") }
        Cell.CellState.register(this, newState)
    }

    /**
     * recursive fonction used to transform the observers.state object into a flat object
     * binds the function to this, to help this handling when called
     * @param {object} subObject the current object we're flatting
     * @param {string} path the path to follow to attain the current object from the original call
     * @return { { [string]: function } }
     */
    _generateFlatStateCb(subObject = {}, path = "") {
        return Object.keys(subObject).reduce((acc, key) => {
            if (typeof subObject[key] === "object") {
                acc = {...acc, ...this._generateFlatStateCb(subObject[key], `${path}.${key}`)}
            } else if (typeof subObject[key] === "function") {
                acc[`${path}.${key}`] = subObject[key].bind(this)
            }
            return acc
        }, {})
    }

    /**
     * callback called when the element is connected to a document
     */
    connectedCallback() {
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
     * import an external HTML file into a usable DocumentFragment
     * @param {string} filePath the path to the HTML file
     * @return {Promise<DocumentFragment>}
     */
    static async importHTML(filePath) {
        return fetch(filePath)
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
     * register a new Cell class as an Element
     *  - customElementDefinition.tagName will be modified if needed to be compatible with the HTML customElement standard
     *      - will be transformed to skewer-case using {@link toSkewerCase}
     *      - if only one word, will prepend "custom-"
     *      - spec : https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
     * @param {class} customElementDefinition a class extending Cell (the class itself, not an instance of it)
     * @throws {TypeError} if customElementDefinition is not a class extending Cell
     * @throws {TypeError} if shadowRootType is not a valid value
     * @return {class} the customElementDefinition parameter with the tagName corrected if needed
     */
    static register(customElementDefinition) {
        if (! customElementDefinition.prototype instanceof Cell) {
            throw new TypeError(`The given class must extends Cell`)
        }

        let tagName = customElementDefinition.tagName ?? toSkewerCase(customElementDefinition.prototype.constructor.name)
        if (! tagName) {throw new TypeError("You must define at least one way to name your new element tag")}
        if (! tagName.includes("-")) {tagName = `custom-${tagName}`}

        tagName = tagName[0].toLowerCase() + tagName.substring(1)

        if (customElementDefinition.shadowRootType !== null && ! ["open", "closed"].includes(customElementDefinition.shadowRootType)) {
            throw new TypeError(`Cell shadowRootType must be "open", "closed" or null`)
        }

        customElements.define(tagName, customElementDefinition)

        Object.defineProperty(customElementDefinition, "tagName", {
            value: tagName,
            writable: false
        })
        Object.defineProperty(customElementDefinition, "attributes", {
            value: Object.freeze(customElementDefinition.attributes ?? Cell.attributes),
            writable: false
        })
        Object.defineProperty(customElementDefinition, "styleSheet", {
            value: customElementDefinition.styleSheet ?? Cell.styleSheet,
            writable: false
        })

        return customElementDefinition
    }

    /**
     * subclass used for state management
     * @class
     */
    static CellState = class {
        /**
         * the map linking Cells to their state
         * @type {Map<Cell, Cell.CellState>}
         */
        static _registry = new Map()
        /**
         * the symbol used to say we want to access the target of the proxy
         * @type {symbol}
         */
        static proxyTarget = Symbol("CellStateProxyTarget")

        /**
         * a map where keys are the cells linked to that particular state to their path inside the state
         * @type {Map<Cell, string>}
         */
        _elements = new Map()
        /**
         * a flat object linking every path to the callbacks
         * @type {Object<string, function[]>}
         */
        _callbackObject = {}
        /**
         * the object hidden behind the state, this one is not proxied
         * @type {object}
         */
        _raw

        /**
         * @param {object} object
         */
        constructor(object) {
            this._raw = object
        }

        /**
         * get the proxy related to the CellState
         * @return {Proxy}
         */
        get state() {
            return this._attachProxy(this._raw)
        }

        /**
         * get the proxy related to the CellState at a specific subvalue after having followed the path defined is this._elements
         * @param {Cell} cell the cell we want to get the state for
         * @return {Proxy}
         */
        getStateFor(cell) {
            let ret = this.state
            const path = this._elements.get(cell)
            path.split(".").forEach(pathPart => {
                if (pathPart.length === 0) {return}
                ret = ret?.[pathPart]
            })
            return ret
        }

        /**
         * link the Cell to the CellState
         * @param {Cell} element
         * @param {string} path
         */
        _addElement(element, path) {
            this._elements.set(element, path)
            this._rebuildCallbackObject()
        }

        /**
         * unlink the Cell from the CellState
         * @param {Cell} element
         */
        _deleteElement(element) {
            this._elements.delete(element)
            this._rebuildCallbackObject()
        }

        /**
         * update this._callbackObject to contain every callback from the cells in this._elements
         */
        _rebuildCallbackObject() {
            this._callbackObject = [...this._elements.entries()]
                .reduce((acc, [cell, path]) => {
                    Object.entries(cell._flatStateCb).forEach(([key, cb]) => {
                        if (!acc[`${path}${key}`]) {acc[`${path}${key}`] = []}
                        acc[`${path}${key}`].push(cb)
                    })
                    return acc
                }, {})
        }

        /**
         * get the CellState linked to the cell
         * @param {Cell} element
         * @return {Cell.CellState}
         */
        static get(element) {
            return Cell.CellState._registry.get(element)
        }

        /**
         * search if target is deep child of an existing CellState's {@link _raw}
         * if it is, returns that CellState and the path to get the target
         * @param {object} target the object we're trying to find
         * @return {?{state: Cell.CellState, path: string}} the found state and path or undefined if none found
         */
        static _getExistingState(target) {
            const contenders = Array.from(new Set([...Cell.CellState._registry.values()]))
                .map(state => ({state, value: state._raw, path: ""}))
            while(contenders.length !== 0) {
                const current = contenders.shift()
                if (current.value === target ||
                    current.value === target[Cell.CellState.proxyTarget]
                ) {
                    return {state: current.state, path: current.path}
                }

                if (typeof current.value === "object") {
                    Object.getOwnPropertyNames(current.value).forEach(key => {
                        contenders.push({state: current.state, value: current.value[key], path: `${current.path}.${key}`})
                    })
                }
            }
            return undefined
        }

        /**
         * search if the target deep contains one or more already existing CellStates {@link _raw}
         * @param {object} target
         * @return { {state: Cell.CellState, path: string}[] } array of found CellStates and path
         */
        static _isParentState(target) {
            const found = []
            const contenders = [{target, path: ""}]
            while(contenders.length !== 0) {
                const current = contenders.shift()
                const state = [...Cell.CellState._registry.values()].find(state =>
                    state._raw === current.target ||
                    state._raw === current.target[Cell.CellState.proxyTarget]
                )

                if (state) { found.push( {state: state, path: current.path} ) }
                else {
                    if (typeof current.target === "object") {
                        Object.getOwnPropertyNames(current.target).forEach(key => {
                            contenders.push({target: current.target[key], path: `${current.path}.${key}`})
                        })
                    }
                }
            }
            return found
        }

        /**
         * create a new CellState using parentRaw as it's {@link _raw}
         * the new CellState links itself to the children Cells, these Cells state is replaced by the newly created CellState
         * @param {object} parentRaw the {@link _raw} of the new CellState
         * @param { {state: Cell.CellState, path: string}[] } children the CellStates to absorb, get them using {@link CellState._isParentState}(parentRaw)
         * @return {Cell.CellState} the new CellState
         */
        static _createParent(parentRaw, children) {
            const newState = new Cell.CellState(parentRaw)
            children.forEach( ({state, path: pathPrefix}) => {
                [...state._elements.entries()].forEach( ([element, path]) => {
                    newState._elements.set(element, `${pathPrefix}${path}`)
                    Cell.CellState._registry.set(element, newState)
                })
            })
            return newState
        }

        /**
         * register a Cell and it's state
         * if the state is already registered in a CellState, the Cell will be linked to the already existing CellState
         * @param {Cell} element the Cell
         * @param {object} object the Cell state (used as CellState's {@link raw}
         */
        static register(element, object) {
            if (object !== Cell.CellState.get(element)?._raw) {
                Cell.CellState.unregister(element)
                let {state, path} = Cell.CellState._getExistingState(object) ?? {}
                if (state === undefined) {

                    let children = Cell.CellState._isParentState(object)
                    if (children.length === 0) {
                        state = new Cell.CellState(object)
                    } else {
                        state = Cell.CellState._createParent(object, children)
                    }
                    path = ""
                }
                state._addElement(element, path)
                Cell.CellState._registry.set(element, state)
            }
        }

        /**
         * remove the link from a Cell to a CellState
         * @param {Cell} element
         * @return {boolean}
         */
        static unregister(element) {
            const currentState = Cell.CellState.get(element)
            if (currentState) {
                currentState._deleteElement(element)
            }
            return Cell.CellState._registry.delete(element)
        }

        /**
         * attach a proxy to the target, used in {@link state}
         * the get handler contains a recursive call to this function
         * @param {object} target the target to wrap in the Proxy
         * @param {string} path the path to follow from the root object to get to the current target
         * @return {*} a Proxy if the target is an Object, otherwise target
         */
        _attachProxy(target, path = "") {
            let handler = {}
            if (target === undefined) {return target}
            if (target[isProxy] === true) {
                return target
            } else if (typeof target === "object") {
                /**
                 * get handler of the Proxy
                 * hardcode return for some symbols
                 * @param {object} target the object wrapped by the Proxy
                 * @param {string|symbol} prop
                 * @return {*}
                 */
                handler.get = (target, prop) => {
                    if (prop === Cell.CellState.proxyTarget) { return target }
                    if (prop === isProxy) { return true }
                    if (typeof prop !== "symbol") {
                        return this._attachProxy(target[prop], `${path}.${prop}`)
                    }
                    return target[prop]
                }
                /**
                 * call the callbacks set for this path
                 * @param {object} target the object wrapped by the Proxy
                 * @param {string|symbol} prop
                 * @param {*} value the value
                 * @return {boolean} true means the set worked
                 */
                handler.set = (target, prop, value) => {
                    const oldValue = target[prop]
                    if (oldValue !== value) {
                        target[prop] = value

                        if (Array.isArray(this._callbackObject[path])) {
                            this._callbackObject[path].forEach(cb => cb(prop, oldValue, value))
                        } else if (Array.isArray(this._callbackObject[`${path}.${prop}`])) {
                            this._callbackObject[`${path}.${prop}`].forEach(cb => cb(prop, oldValue, value))
                        }
                    }
                    return true
                }
                /**
                 * call the callbacks set for this path
                 * @param {object} target the object wrapped by the Proxy
                 * @param {string|symbol} prop
                 * @return {boolean} true means the delete worked
                 */
                handler.deleteProperty = (target, prop) => {
                    if (! prop in target) { return false }

                    const oldValue = target[prop]
                    delete target[prop]
                    if (Array.isArray(this._callbackObject[path])) {
                        this._callbackObject[path].forEach(cb => cb(prop, oldValue, Cell.deleted))
                    } else if (Array.isArray(this._callbackObject[`${path}.${prop}`])) {
                        this._callbackObject[`${path}.${prop}`].forEach(cb => cb(prop, oldValue, Cell.deleted))
                    }
                    return true
                }
                return new Proxy(target, handler)
            }
            return target
        }
    }
}
