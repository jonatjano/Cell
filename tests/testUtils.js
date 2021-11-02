import {deepFreeze, toSkewerCase} from "../src/utils.js";

const expect = chai.expect

describe("utils", () => {
    describe("toSkewerCase", () => {
        it("should work with valid input", () => {
            expect(toSkewerCase("lol")).to.equal("lol")
            expect(toSkewerCase("LOL")).to.equal("l-o-l")
            expect(toSkewerCase("LoL")).to.equal("lo-l")
        })
        it("should accept no letter input", function () {
            expect(toSkewerCase("123")).to.equal("123")
            expect(toSkewerCase("1A2B3C")).to.equal("1-a2-b3-c")
        })
        it('should throw for non string input', function () {
            expect(() => toSkewerCase(true)).to.throw(TypeError)
            expect(() => toSkewerCase(42)).to.throw(TypeError)
            expect(() => toSkewerCase({})).to.throw(TypeError)
            expect(() => toSkewerCase([])).to.throw(TypeError)
            expect(() => toSkewerCase(new Date())).to.throw(TypeError)
        })
    })

    describe("deepFreeze", () => {
        it("should never throw with any input", () => {
            expect(() => deepFreeze({})).not.to.throw()
            expect(() => deepFreeze([])).not.to.throw()
            expect(() => deepFreeze("")).not.to.throw()
            expect(() => deepFreeze(42)).not.to.throw()
            expect(() => deepFreeze(new Date())).not.to.throw()
            expect(() => deepFreeze(true)).not.to.throw()
            expect(() => deepFreeze(null)).not.to.throw()
            expect(() => deepFreeze(undefined)).not.to.throw()
        })
        it("should return input object", () => {
            let obj = {}
            expect(deepFreeze(obj)).to.equal(obj)
            obj = ""
            expect(deepFreeze(obj)).to.equal(obj)
            obj = 42
            expect(deepFreeze(obj)).to.equal(obj)
            obj = []
            expect(deepFreeze(obj)).to.equal(obj)
            obj = new Date()
            expect(deepFreeze(obj)).to.equal(obj)
            obj = true
            expect(deepFreeze(obj)).to.equal(obj)
            obj = null
            expect(deepFreeze(obj)).to.equal(obj)
            obj = undefined
            expect(deepFreeze(obj)).to.equal(obj)
        })
        it("deep freeze object", () => {
            const input = deepFreeze({a: {b: {c: 42}}})
            expect(Object.isFrozen(input)).to.be.true
            expect(Object.hasOwn(input, "a")).to.be.true
            expect(Object.isFrozen(input.a)).to.be.true
            expect(Object.hasOwn(input.a, "b")).to.be.true
            expect(Object.isFrozen(input.a.b)).to.be.true
            expect(Object.hasOwn(input.a.b, "c")).to.be.true

            expect(() => {input.a.b.c = 53}).to.throw(TypeError)
            expect(input.a.b.c).to.equal(42)
        })
        it("deep freeze array", () => {
            const input = deepFreeze([[[42]]])
            expect(Object.isFrozen(input)).to.be.true
            expect(Object.hasOwn(input, "0")).to.be.true
            expect(Object.isFrozen(input[0])).to.be.true
            expect(Object.hasOwn(input[0], "0")).to.be.true
            expect(Object.isFrozen(input[0][0])).to.be.true
            expect(Object.hasOwn(input[0][0], "0")).to.be.true

            expect(() => {input[0][0][0] = 53}).to.throw(TypeError)
            expect(input[0][0][0]).to.equal(42)
        })
    })
})
