import * as utils from "./utils.js"

/**
 * @typedef {object} Cell~Observer
 * @property {Object.<string, Cell~attributeChangedCallbackType>} attributes
 * @property {State~observerTree} states
 */
/**
 * @typedef {object} Cell~MultiObserver
 * @property {Object.<string, (Node | Cell~attributeChangedCallbackType)[]>} attributes
 * @property {Object.<string, State~observerMethod[]>} states
 */
/**
 * @callback Cell~attributeChangedCallbackType
 * @param {string} newValue
 * @param {string} oldValue
 */

const reactiveSlot = Symbol("cellReactiveSlot")

/**
 * @param {string} type
 * @param {any} value
 * @return {string}
 */
function cleanAttributeValue(type, value) {
	switch (type) {
		case "color":
			return utils.color2hex(value)
		default:
			return value
	}
}

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
     * @param {State | stateProxy | Object | null} newState
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
		this?.constructor?.observers?.attributes?.[attributeName]?.call?.(this, newValue, oldValue)
		this?.reactiveObservers?.attributes?.[attributeName]?.forEach(entry => typeof entry === "function" ? entry(newValue, oldValue) : entry.textContent = newValue)
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
	#registerReactiveObserversFor(node) {
		/**
		 * example of matches :
		 * - @A.title
		 * - \@A.test
		 * - @S.a.b.c
		 * - @S[a].b.c
		 * - @S.a[b][c]
		 * - \@S.a.b.c
		 * - \@S[a].b.c
		 * - \@S.a[b][c]
		 * @type {RegExp}
		 */
		const regex = /(?<hasBackslash>\\)?(?:(?:(?<isState>@S)(?<statePath>(?:(?:\.[\p{Letter}\p{Number}]+)|(?:\[[\p{Letter}\p{Number}]+\]))+;?))|(?:(?<isAttribute>@A)\.(?<attributeName>[\w-]+)))/gu

		/**
		 * @param {string} text
		 * @return {{start: number, end: number, type: "attribute" | "state" | "removeBackslash", value: string}[]}
		 */
		function applyRegexOn(text) {
			regex.lastIndex = -1
			/**
			 * @type { {{start: number, end: number, type: "attribute" | "state" | "removeBackslash", value: string}[]} }
			 */
			const matched = []
			while((regexResult = regex.exec(text)) !== null) {
				if (regexResult.groups.hasBackslash) {
					matched.push({start: regexResult.index, end: regexResult.index + regexResult[0].length, type: "removeBackslash", value: regexResult[0]})
				} else if (regexResult.groups.isAttribute) {
					matched.push({start: regexResult.index, end: regexResult.index + regexResult[0].length, type: "attribute", value: regexResult.groups.attributeName})
				} else if (regexResult.groups.isState) {
					matched.push({start: regexResult.index, end: regexResult.index + regexResult[0].length, type: "state", value: regexResult.groups.statePath})
				} else {
					throw new Error(`Error while parsing, matched unknown construct : "${regexResult[0]}"`)
				}
			}
			return matched
		}

		/**
		 * transform an object path with square brackets and a starting dot to one with dots only
		 * e.g.
		 * [a].b[c] -> a.b.c
		 * .a[b].c -> a.b.c
		 * .a.b.c -> a.b.c
		 * [a][b][c] -> a.b.c
		 * @param {string} statePath
		 * @return {string}
		 */
		function cleanStatePath(statePath) {
			return statePath
				.replaceAll("]", "")
				.replaceAll("[", ".")
				.substring(1)
		}

		/**
		 * @type {RegExpExecArray}
		 */
		let regexResult
		if (node instanceof Cell) {
			// TODO
			return
		} else if (node instanceof Text) {
			const text = node.textContent
			/**
			 * @type {{start: number, end: number, type: "attribute" | "state" | "removeBackslash", value: string}[]}
			 */
			const matched = applyRegexOn(text)

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
				state: (acc, match) => {
					if (lastIndex < match.start) {
						acc.push(document.createTextNode(text.substring(lastIndex, match.start)))
					}
					lastIndex = match.end
					const reactiveNode = document.createElement("slot")
					reactiveNode.textContent = cleanStatePath(match.value)
					reactiveNode[reactiveSlot] = true
					this.reactiveObservers.states[match.value] ??= []
					this.reactiveObservers.states[match.value].push(reactiveNode)
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
				console.log(attr, attr.textContent)

				const text = attr.textContent
				/**
				 * @type {{start: number, end: number, type: "attribute" | "state" | "removeBackslash", value: string}[]}
				 */
				const matched = applyRegexOn(text)

				matched.forEach(match => {
					const attributeName = attr.name.startsWith("c-") ? attr.name.substring(2) : attr.name
					if (match.type === "attribute") {
						if (attributeName.startsWith("on")) {

							const eventName = attributeName.substring(2)
							if (attr.textContent.trim() === `@A.${match.value}`) {

								node.addEventListener(eventName, event => {
									this.setAttribute(match.value, cleanAttributeValue(node.type, node.value))
								}, {passive: true})

							} else if (attr.textContent.replaceAll(" ", "").startsWith(`@A.${match.value}=`)) {

								let newValue = attr.textContent.substring(attr.textContent.indexOf("=") + 1).trim()
								if (newValue.startsWith("'") && newValue.endsWith("'")) {newValue = newValue.substring(1, newValue.length - 1)}
								node.addEventListener(eventName, event => {
									this.setAttribute(match.value, newValue)
								}, {passive: true})

							} else {
								throw new Error(`Don't know how to process event attribute value "${attr.value}"`)
							}

							node.setAttribute(attr.name, `/* ${attr.value} */`)
							this.reactiveObservers.attributes[match.value] ??= []
							if (node instanceof HTMLInputElement) {
								node.setAttribute("value", cleanAttributeValue(node.type, this.getAttribute(match.value)))
								this.reactiveObservers.attributes[match.value].push(() => {
									const cleanValue = cleanAttributeValue(node.type, this.getAttribute(match.value))
									node.setAttribute("value", cleanValue)
									node.value = cleanValue
								})
							}

						} else {
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
								node.setAttribute(attributeName, builtValue)
							})
						}
					} else if (match.type === "state") {
						// TODO
					}
				})
			}
		}
	}
	generateReactiveObservers() {
		const firstTime = Object.keys(this.reactiveObservers.attributes).length === 0 && Object.keys(this.reactiveObservers.states).length === 0
		const recursiveVisit = node => {
			this.#registerReactiveObserversFor(node)
			let children = [...node.childNodes]
			if (!firstTime) {
				children.forEach(child => {if (child instanceof Text) {child.textContent = child.textContent.replaceAll("@", "\\@")}})
			}
			children.forEach(child => recursiveVisit(child))
		}
		if (this.shadowRoot) {this.#registerReactiveObserversFor(this)}
		recursiveVisit(this.body)
	}

	/**
     * register a new Cell class as an Element
     *  - customElementDefinition.tagName will be modified if needed to be compatible with the HTML customElement standard
     *      - will be transformed to skewer-case using {@link toSkewerCase}
     *      - if only one word, will prepend "cell-"
     *      - spec : https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
     * @param {Cell.constructor} customElementDefinition a class extending Cell (the class itself, not an instance of it)
     * @throws {TypeError} if customElementDefinition is not a class extending Cell
     * @throws {TypeError} if shadowRootType is not a valid value
     * @return {Promise<typeof Cell>} the customElementDefinition parameter with the tagName corrected if needed
     */
	static async register(customElementDefinition) {
		let tagName = Object.hasOwn(customElementDefinition, "tagName") ?
			utils.toSkewerCase(customElementDefinition.tagName) :
			utils.toSkewerCase(customElementDefinition.prototype.constructor.name)

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
						value: utils.deepFreeze(result),
						writable: false
					})
				})
		}

		const styleSheet = Object.hasOwn(customElementDefinition, "stylesheet") ? customElementDefinition.stylesheet : Cell.stylesheet
		const observers = Object.hasOwn(customElementDefinition, "observers") ? customElementDefinition.observers : Cell.observers
		Object.defineProperties(customElementDefinition, {
			tagName: {
				value: utils.deepFreeze(tagName),
				writable: false
			},
			styleSheet: {
				value: utils.deepFreeze(styleSheet),
				writable: false
			},
			observers: {
				value: utils.deepFreeze(observers),
				writable: false
			}
		})

		customElements.define(tagName, customElementDefinition)

		return customElementDefinition
	}
}

/*
start          | delete ']'  | replace '[' -> '.' | remove left dot | goal
.test          | .test       | .test              | test            | test
.test.a        | .test.a     | .test.a            | test.a          | test.a
.test.a.b      | .test.a.b   | .test.a.b          | test.a.b        | test.a.b
.test.b.0      | .test.b.0   | .test.b.0          | test.b.0        | test.b.0
.test.b[0]     | .test.b[0   | .test.b.0          | test.b.0        | test.b.0
[test].bia[0]  | [test.bia[0 | .test.bia.0        | test.bia.0      | test.bia.0
[test][bia][0] | [test[bia[0 | .test.bia.0        | test.bia.0      | test.bia.0
 */