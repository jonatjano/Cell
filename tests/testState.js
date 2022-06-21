import State from "../src/State.js"

const expect = chai.expect

describe("state", () => {
	it("should exists", () => {
		expect(State).to.not.be.undefined
	})

	it("everything", () => {
		const myObj = {y: {a: 16}}
		const state = State.get(myObj)
		state.x = 42
		expect(myObj.x).to.be.equal(42)
		const state2 = State.get(myObj.y)
		expect(state.y).to.be.equal(state2)
	})

})
