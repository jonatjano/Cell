/**
 * try to transform the provided string into a skewer-case string
 * @param {string} input
 * @return {string} the input in skewer-case capitalisation
 */
export const toSkewerCase = input => input.replaceAll(/[A-Z]/g, (found, i) => (i === 0 ? '' : '-') + found.toLowerCase())

/**
 * deep freeze the input
 * @param {*} obj the value to freeze
 * @returns {*} the deeply frozen input
 */
export const deepFreeze = obj => {
    if (obj === null || obj === undefined) {
        return obj
    }
    Object.keys(obj).forEach(key => {
        obj[key] = deepFreeze(obj[key])
    })
    return Object.freeze(obj)
}
