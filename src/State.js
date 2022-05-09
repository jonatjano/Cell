import {inPlaceDeepMerge} from "./utils.js";

/**
 * @callback State~observerMethod
 * @param {any} newValue
 * @param {any} oldValue
 */

/**
 * @typedef { {
 *     [key: string]: State~observerTree | State~observerMethod,
 *     [State.leaf]?: State~observerMethod
 * } } State~observerTree
 */

/**
 * @typedef {Object} proxyObject
 */

export default class State {
	static leaf = Symbol("leaf") // Leaf indicator for State observers
	static state = Symbol("getState") // Symbol to get state from proxy
	static isState = Symbol("isState")

	/**
	 * @type {proxyObject}
	 */
	#proxy

	/**
	 * @type {State~observerTree}
	 */
	#observerTree

	/**
	 * @type {Object}
	 */
	#data

	constructor() {
		this.#data = {}
		this.resetObservers()
		Object.seal(this)
	}

	/**
	 * @param {Object} data
	 * @param {State~observerTree} [observerTree={}]
	 * @return {proxyObject}
	 */
	static create(data = {}, observerTree = {}) {
		let state = new State()
		state.#data = data
		state.#observerTree = observerTree
		return state.proxy
	}

	/**
	 * @param {State~observerTree} [observerTree={}]
	 * @return this
	 */
	addObservers(observerTree = {}) {
		this.#observerTree = inPlaceDeepMerge(this.#observerTree, observerTree)
		return this
	}

	/**
	 * @returns this
	 */
	resetObservers() {
		this.#observerTree = {}
		return this
	}

	/**
	 * @returns {proxyObject}
	 */
	get proxy() {
		if (! this.#proxy) {
			/**
			 * @type {State}
			 */
			const that = this
			/**
			 * @type {Object}
			 */
			const thatData = this.#data
			/**
			 * @type {State~observerTree}
			 */
			const thatObservers = this.#observerTree
			/**
			 * @type {string[]}
			 */
			const stateMethods = ["addObservers", "resetObservers"]
			/**
			 * @type {Symbol[]}
			 */
			const stateSymbols = [State.isState, State.state]
			/**
			 * @type {Map<string, {state: State, observers: State~observerTree}>}
			 */
			const subStateMap = new Map()

			const handler = {
				defineProperty(target, key, descriptor) {
					//: forward to data + call observer
					throw new Error("WIP, this is not implemented yet, State.defineProperty")
				},
				deleteProperty(target, prop) {
					//: forward to data
					throw new Error("WIP, this is not implemented yet, State.deleteProperty")
				},
				get(target, prop, receiver) {
					if (prop === State.isState) {
						return true
					} else if (prop === State.state) {
						return that
					} else if (stateMethods.includes(prop)) {
						return that[prop].bind(that)
					} else {
						if (typeof thatData[prop] === "object" && ! thatData[prop][State.isState]) {
							thatData[prop] = State.create(thatData[prop], thatObservers[prop])
						}
						return thatData[prop]
					}
				},
				getOwnPropertyDescriptor(target, prop) {
					//: forward to data
					throw new Error("WIP, this is not implemented yet, State.getOwnPropertyDescriptor")
				},
				getPrototypeOf(target) {
					//: forward to data
					throw new Error("WIP, this is not implemented yet, State.getPrototypeOf")
				},
				has(target, key) {
					//: forward to data
					throw new Error("WIP, this is not implemented yet, State.has")
				},
				isExtensible(target) {
					//: forward to data
					throw new Error("WIP, this is not implemented yet, State.isExtensible")
				},
				ownKeys(target) {
					return [
						...Object.keys(thatData),
						...stateMethods,
						...stateSymbols
					]
				},
				preventExtensions(target) {
					//: forward to data
					throw new Error("WIP, this is not implemented yet, State.preventExtensions")
				},
				set(obj, prop, value) {
					if (stateMethods.includes(prop)) {
						throw new TypeError(`Can't set one of ${stateMethods} on a state`)
					} else if (stateSymbols.includes(prop)) {
						throw new TypeError(`Can't set one of ${stateMethods} on a state`)
					} else {
						if (typeof thatObservers[prop] === "function") {
							thatObservers[prop](value, thatData[prop])
						} else if (typeof thatObservers[prop] === "object" && typeof thatObservers[prop][State.leaf] === "function") {
							thatObservers[prop][State.leaf](value, thatData[prop])
						}
						if (typeof value === "object") {
							if (subStateMap.has(prop)) {
								// TODO
							} else {
								thatData[prop] = State.create(value, thatObservers[prop])
							}
						} else {
							thatData[prop] = value
						}
					}
					return true
				},
				setPrototypeOf(target, prototype) {
					//: forward to data
					throw new Error("WIP, this is not implemented yet, State.setPrototypeOf")
				}
			}
			this.#proxy = new Proxy(this.#data, handler)
		}
		return this.#proxy
	}

	// /**
	//  * get the State proxy
	//  * @return {Proxy}
	//  */
	// get state() {
	// 	this.#proxied ??= State.#attachProxy(this.#raw)
	// 	return this.#proxied
	// }
	//
	// static get(key) {
	// 	return this.#registry.get(key)
	// }
	//
	// /**
	//  * register a new state for the given key
	//  * if the object is child or parent of an existing state {@link #raw}, will return that state will the link done to the new key
	//  * @param {any} key the State key
	//  * @param {object} object the State object (used as State's {@link raw}
	//  * @param {State~stateObserver} observers the State object (used as State's {@link raw}
	//  * @throws {Error} when the key is already linked to a state
	//  */
	// static register(key, object, observers) {
	// 	if (State.get(key)) {
	// 		throw new Error(`Trying to register a State with an already used key`)
	// 	}
	// 	let state = State.#getByObject(object)
	// 	if (state) {
	// 		return state
	// 	}
	//
	// 	/*
	// 	if (object !== State.get(key)?.#raw) {
	// 		State.unregister(key)
	// 		let {state, path} = State._getExistingState(object) ?? {}
	// 		if (state === undefined) {
	//
	// 			let children = State._isParentState(object)
	// 			if (children.length === 0) {
	// 				state = new State(object)
	// 			} else {
	// 				state = State._createParent(object, children)
	// 			}
	// 			path = ""
	// 		}
	// 		state._addElement(key, path)
	// 		State._registry.set(key, state)
	// 	}
	// 	*/
	// }
	//
	// /**
	//  * remove the link from a Cell to a CellState
	//  * @param {any} key
	//  * @return {boolean}
	//  */
	// static unregister(key) {
	// 	const currentState = State.get(key)
	// 	if (currentState) {
	// 		currentState.#deleteElement(key)
	// 	}
	// 	return State.#registry.delete(key)
	// }
	//
	// static #getStateList() {
	// 	return [...new Set(this.#registry.values())]
	// }
	//
	// /**
	//  * @param {object} object
	//  */
	// static #getByObject(object) {
	// 	return State.#getStateList().find(state => state.#raw === object)
	// }
	//
	// /**
	//  * @param {any} object
	//  * @return Proxy
	//  */
	// static #attachProxy(object) {}
}



/**
 * subclass used for state management
 * @class
 */
const CellState = class {
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
			 * @param {string|Symbol} prop
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
			 * @param {string|Symbol} prop
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
