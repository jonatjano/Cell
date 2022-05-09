/**
 * try to transform the provided string into a skewer-case string
 * @param {string} input
 * @return {string} the input in skewer-case capitalisation
 */
export const toSkewerCase = input => input.replaceAll(/[A-Z]/g, (found, i) => (i === 0 ? "" : "-") + found.toLowerCase())

/**
 * deep freeze the input
 * @param {*} obj the value to freeze
 * @returns {*} the deeply frozen input
 */
export const deepFreeze = (obj) => {
	if (obj === null || obj === undefined || Object.isFrozen(obj) || Object.isSealed(obj)) {
		return obj
	}

	if (obj instanceof Object && ! Object.isFrozen(obj)) {
		obj = Object.seal(obj)
		Object.keys(obj).forEach(key => {
			obj[key] = deepFreeze(obj[key])
		})
	}

	return Object.freeze(obj)
}

const innerDeepMerge = (obj1, obj2) => {
	const properties = [...Object.getOwnPropertyNames(obj2), ...Object.getOwnPropertySymbols(obj2)]

	for(const prop of properties) {
		if (typeof obj1[prop] !== "undefined" && typeof obj1[prop] !== typeof obj2[prop]) {
			throw new TypeError("can't merge incompatibles objects")
		} else if (typeof obj2[prop] === "object") {
			if (obj2[prop] === null) {
				if (obj1[prop] === null || obj1[prop] === undefined) {
					obj1[prop] = null
				} else {
					throw new TypeError("can't merge incompatibles objects")
				}
			} else {
				if (Array.isArray(obj2[prop])) {
					if (obj1[prop] === undefined) {
						obj1[prop] = []
					} else if (! Array.isArray(obj1[prop])) {
						throw new TypeError("can't merge incompatibles objects")
					}
				} else if (obj2[prop].__proto__ === undefined) {
					if (obj1[prop] === undefined) {
						obj1[prop] = Object.create(null)
					} else if (obj1[prop].__proto__ !== undefined) {
						throw new TypeError("can't merge incompatibles objects")
					}
				} else {
					if (obj1[prop] === undefined) {
						obj1[prop] = new obj2[prop].__proto__.constructor()
					} else if (obj1[prop].__proto__.constructor !== obj2[prop].__proto__.constructor) {
						throw new TypeError("can't merge incompatibles objects")
					}
				}
				innerDeepMerge(obj1[prop], obj2[prop])
			}
		} else {
			obj1[prop] = obj2[prop]
		}
	}
}

/**
 * @param {Object} inputs
 * @return {Object}
 */
export const deepMerge = (...inputs) => {
	const result = {}

	for (const object of inputs) {
		innerDeepMerge(result, object)
	}

	return result;
}

/**
 * @param {Object} target
 * @param {Object} inputs
 * @return {Object}
 */
export const inPlaceDeepMerge = (target, ...inputs) => {
	for (const object of inputs) {
		innerDeepMerge(target, object)
	}

	return target;
}

/**
 * @param {Object} inputs
 * @return {Object}
 */
export const nullDeepMerge = (...inputs) => {
	const result = Object.create(null)

	for (const object of inputs) {
		innerDeepMerge(result, object)
	}

	return result;
}