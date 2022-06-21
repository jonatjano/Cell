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
 * @typedef {Object} stateProxy
 */

export default class State {
	static leaf = Symbol("leaf") // Leaf indicator for State observers
	static state = Symbol("getState") // Symbol to get state from proxy
	static isState = Symbol("isState")

	/**
	 * @type {stateProxy}
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
	 * @return {stateProxy}
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
	 * @returns {stateProxy}
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
}