import {deepFreeze, toSkewerCase} from "./utils.js"

/**
 * @typedef {object} Cell~Observer
 * @property {Object.<string, Cell~attributeChangedCallbackType>} attributes
 * @property {State~stateObserver} states
 */
/**
 * @typedef {object} Cell~MultiObserver
 * @property {Object.<string, (Node | Cell~attributeChangedCallbackType)[]>} attributes
 * @property {Object.<string, State~stateObserver[]>} states
 */
/**
 * @callback Cell~attributeChangedCallbackType
 * @param {string} oldValue
 * @param {string} newValue
 */

const reactiveSlot = Symbol("cellReactiveSlot")

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
     * content of the default style tag
     * @type {string | CSSStyleSheet | null}
     */
	static stylesheet = null
	/**
     * content of the element before any modification
     * @type {string | HTMLElement | HTMLDocument | null}
     */
	static template = null

	/**
	 * @type {Cell~Observer}
	 */
	static observers = {
		attributes: {},
		states: {}
	}
	/**
	 * list of attribute names to observe, but not defined in the observers array
	 * @type {string[]}
	 */
	static attributes = []
	/**
	 * @type {Cell~MultiObserver}
	 */
	reactiveObservers = {
		attributes: {},
		states: {}
	}

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

		if (this.__proto__.constructor.shadowRootType) {
			this.#body = this.attachShadow({mode: this.__proto__.constructor.shadowRootType})
		}
		this.#body ??= this

		if (this.constructor.template) {
			this.#body.append(this.constructor.template.cloneNode(true))
		}
		this.generateReactiveObservers()
		this.generateReactiveObservers()
		this.generateReactiveObservers()
		this.generateReactiveObservers()

		this.state = state
	}

	/**
     * get the element's body
     * @return {this | ShadowRoot}
     */
	get body() { return this.#body }

	/**
     * remove every child of the body
     * add a <style> with it's content set to class.stylesheet if defined and class.shadowRootType !== null
     */
	resetBody() {
		this.#body.innerHTML = ""
		if (this.#body instanceof ShadowRoot && this.__proto__.constructor.stylesheet) {
			const style = document.createElement("style")
			style.innerHTML = this.__proto__.constructor.stylesheet
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
		return null
	}

	/**
     * callback called when the element is connected to a document
     */
	connectedCallback() {
		// TODO
		return
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
		return
		this.ondisconnect?.()

		Cell.CellState.unregister(this)
		this.clear?.()
	}
	/**
     * callback called when the element is moved from a document to another
     */
	adoptedCallback() {}
	/**
     * callback called when an attribute contained in class.attributes is changed
     * will call this.observers.attributes[name] if it exists
     * @param {string} attributeName the attribute's name
     * @param {string} oldValue the attribute's old value
     * @param {string} newValue the attribute's new value
     */
	attributeChangedCallback(attributeName, oldValue, newValue) {
		this?.constructor?.observers?.attributes?.[attributeName]?.call?.(this, oldValue, newValue)
		this?.reactiveObservers?.attributes?.[attributeName]?.forEach(entry => typeof entry === "function" ? entry(oldValue, newValue) : entry.textContent = newValue)
	}

	/**
     * function used by the customElementRegistry to know which attributes our element observe
     * set the attributes name to lowercase because uppercase mess with the mechanism
     * @return {string[]}
     */
	static get observedAttributes() {
		return [
			...Object.keys(this.prototype.constructor.observers.attributes),
			...this.prototype.constructor.attributes
		].map(attributeName => attributeName.toLowerCase())
	}
	/**
	 * @param node
	 * @return void
	 */
	registerReactiveObserversFor(node) {
		const attributeRegex = /(\\+)?(@([\w-]+))/g
		/**
		 * @type {RegExpExecArray}
		 */
		let regexResult
		if (node instanceof Cell) {
			return
		} else if (node instanceof Text) {
			const text = node.textContent
			/**
			 * @type {{start: number, end: number, type: "attribute" | "removeBackslash", value: string}[]}
			 */
			const matched = []
			while((regexResult = attributeRegex.exec(text)) !== null) {
				if (! regexResult[1]) {
					matched.push({start: regexResult.index, end: regexResult.index + regexResult[0].length, type: "attribute", value: regexResult[3]})
				} else {
					matched.push({start: regexResult.index, end: regexResult.index + regexResult[0].length, type: "removeBackslash", value: regexResult[0]})
				}
			}
			let lastIndex = 0
			const func = {
				attribute: (acc, match) => {
					if (lastIndex < match.start) {
						acc.push(document.createTextNode(text.substring(lastIndex, match.start)))
					}
					lastIndex = match.end
					const reactiveNode = document.createElement("slot")
					reactiveNode.textContent = match.value
					reactiveNode[reactiveSlot] = true
					this.reactiveObservers.attributes[match.value] ??= []
					this.reactiveObservers.attributes[match.value].push(reactiveNode)
					acc.push(reactiveNode)
					return acc
				},
				removeBackslash: (acc, match) => {
					const textNode = document.createTextNode(
						text.substring(lastIndex, match.start) +
						match.value.substring(1)
					)
					lastIndex = match.end
					acc.push(textNode)
					return acc
				}
			}
			node.before(
				...matched.reduce((acc, match) => func[match.type](acc, match), []),
				document.createTextNode(text.substring(lastIndex))
			)
			node.remove()
		} else if (node instanceof HTMLElement) {
			for (const attr of node.attributes) {
				attributeRegex.lastIndex = -1
				console.log(attr, attr.textContent)

				const text = attr.textContent
				/**
				 * @type {{start: number, end: number, type: "attribute" | "removeBackslash", value: string}[]}
				 */
				const matched = []
				while((regexResult = attributeRegex.exec(text)) !== null) {
					if (! regexResult[1]) {
						matched.push({start: regexResult.index, end: regexResult.index + regexResult[0].length, type: "attribute", value: regexResult[3]})
					} else {
						matched.push({start: regexResult.index, end: regexResult.index + regexResult[0].length, type: "removeBackslash", value: regexResult[0]})
					}
				}

				matched.forEach(match => {
					if (match.type === "attribute") {
						this.reactiveObservers.attributes[match.value] ??= []
						this.reactiveObservers.attributes[match.value].push(() => {
							let builtValue = ""
							let lastIndex = 0
							matched.forEach(match2 => {
								builtValue += text.substring(lastIndex, match2.start)
								if (match2.type === "attribute") {
									builtValue += this.getAttribute(match2.value)
								} else if (match2.type === "removeBackslash") {
									builtValue += match2.value.substring(1)
								}
								lastIndex = match2.end
							})
							builtValue += text.substring(lastIndex)
							node.setAttribute(attr.name, builtValue)
						})
					}
				})
			}
		}
	}
	generateReactiveObservers() {
		const firstTime = Object.keys(this.reactiveObservers.attributes).length === 0
		const recursiveVisit = node => {
			this.registerReactiveObserversFor(node)
			let children = [...node.childNodes]
			if (!firstTime) {
				children.forEach(child => {if (child instanceof Text) {child.textContent = child.textContent.replaceAll("@", "\\@")}})
			}
			children.forEach(child => recursiveVisit(child))
		}
		if (this.shadowRoot) {this.registerReactiveObserversFor(this)}
		recursiveVisit(this.body)
	}

	/**
     * register a new Cell class as an Element
     *  - customElementDefinition.tagName will be modified if needed to be compatible with the HTML customElement standard
     *      - will be transformed to skewer-case using {@link toSkewerCase}
     *      - if only one word, will prepend "cell-"
     *      - spec : https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
     * @param {typeof Cell} customElementDefinition a class extending Cell (the class itself, not an instance of it)
     * @throws {TypeError} if customElementDefinition is not a class extending Cell
     * @throws {TypeError} if shadowRootType is not a valid value
     * @return {Promise<typeof Cell>} the customElementDefinition parameter with the tagName corrected if needed
     */
	static async register(customElementDefinition) {
		let tagName = Object.hasOwn(customElementDefinition, "tagName") ?
			toSkewerCase(customElementDefinition.tagName) :
			toSkewerCase(customElementDefinition.prototype.constructor.name)

		if (! (customElementDefinition.prototype instanceof Cell)) {
			throw new TypeError("The given class must extends Cell")
		}

		if (! tagName) {throw new TypeError("You must define at least one way to name your new element tag")}
		if (! tagName.includes("-")) {tagName = `cell-${tagName}`}

		tagName = tagName.toLowerCase()

		if (customElementDefinition.shadowRootType !== null && ! ["open", "closed"].includes(customElementDefinition.shadowRootType)) {
			throw new TypeError("Cell shadowRootType must be \"open\", \"closed\" or null")
		}

		if (Object.hasOwn(customElementDefinition, "template") && typeof customElementDefinition.template === "string") {
			await importHtml(customElementDefinition.template)
				.then(result => {
					Object.defineProperty(customElementDefinition, "template", {
						value: deepFreeze(result),
						writable: false
					})
				})
		}

		const styleSheet = Object.hasOwn(customElementDefinition, "stylesheet") ? customElementDefinition.stylesheet : Cell.stylesheet
		const observers = Object.hasOwn(customElementDefinition, "observers") ? customElementDefinition.observers : Cell.observers
		Object.defineProperties(customElementDefinition, {
			tagName: {
				value: deepFreeze(tagName),
				writable: false
			},
			styleSheet: {
				value: deepFreeze(styleSheet),
				writable: false
			},
			observers: {
				value: deepFreeze(observers),
				writable: false
			}
		})

		customElements.define(tagName, customElementDefinition)

		return customElementDefinition
	}
}
