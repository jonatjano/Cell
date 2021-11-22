import Cell from "../src/Cell.js"

const expect = chai.expect

describe("cell", function () {
	it("should exists", function () {
		expect(Cell).not.to.be.undefined
	})
	it("should not able to create instance", function () {
		expect(() => new Cell()).to.throw(TypeError, "Illegal constructor")
	})
	describe("register", function () {
		it("should be illegal constructor until registered", function () {
			class TestRegisterIllegalConstructor extends Cell {}
			expect(() => {new TestRegisterIllegalConstructor()}).to.throw(TypeError, "Illegal constructor")
			expect(() => Cell.register(TestRegisterIllegalConstructor)).not.to.throw()
			expect(() => {new TestRegisterIllegalConstructor()}).not.to.throw()
		})
	})
	describe("extending classes", function () {
		it("should work", function () {
			class TestExtendingWorks extends Cell {}
			expect(() => Cell.register(TestExtendingWorks)).not.to.throw()
			let instance = null
			expect(() => {instance = new TestExtendingWorks()}).not.to.throw()
			expect(instance).not.to.be.null
			expect(instance).to.be.instanceof(TestExtendingWorks)
			expect(instance).to.be.instanceof(Cell)
			expect(instance).to.be.instanceof(HTMLElement)
		})
		describe("tagname", function () {
			it("should default to class name", function () {
				class TestTagnameFromClassName extends Cell {}
				expect(() => Cell.register(TestTagnameFromClassName)).not.to.throw()
				let instance = null
				expect(() => {instance = new TestTagnameFromClassName()}).not.to.throw()
				expect(instance).not.to.be.null
				expect(TestTagnameFromClassName.tagName).to.be.equal("test-tagname-from-class-name")
				expect(instance.tagName).to.be.equal(TestTagnameFromClassName.tagName.toUpperCase())
			})
			it("should be personnalisable", function () {
				class TestTagnameFromAttribute extends Cell {static tagName = "test-tagname-from-attribute"}
				expect(() => Cell.register(TestTagnameFromAttribute)).not.to.throw()
				let instance = null
				expect(() => {instance = new TestTagnameFromAttribute()}).not.to.throw()
				expect(instance).not.to.be.null
				expect(TestTagnameFromAttribute.tagName).to.be.equal("test-tagname-from-attribute")
				expect(instance.tagName).to.be.equal(TestTagnameFromAttribute.tagName.toUpperCase())
			})
			it("should be transformed from Pascal/Camel to skewer case", function () {
				class TestTagnameSkewerTranformation extends Cell {static tagName = "TestSkewerTransformation"}
				expect(() => Cell.register(TestTagnameSkewerTranformation)).not.to.throw()
				let instance = null
				expect(() => {instance = new TestTagnameSkewerTranformation()}).not.to.throw()
				expect(instance).not.to.be.null
				expect(TestTagnameSkewerTranformation.tagName).to.be.equal("test-skewer-transformation")
				expect(instance.tagName).to.be.equal(TestTagnameSkewerTranformation.tagName.toUpperCase())
			})
			it("should be not writable after register", function () {
				class TestTagnameCantChangeAfterRegister extends Cell {static tagName = "test-tagname-cant-change-after-register"}
				expect(() => Cell.register(TestTagnameCantChangeAfterRegister)).not.to.throw()
				expect(() => {TestTagnameCantChangeAfterRegister.tagName = "something-else"}).to.throw()
				expect(TestTagnameCantChangeAfterRegister.tagName).to.equal("test-tagname-cant-change-after-register")
			})
			it("should auto prepend \"cell-\" if one word only", function () {
				class TestTagnameAutoPrependCellIfOneWord extends Cell {static tagName = "oneword"}
				expect(() => Cell.register(TestTagnameAutoPrependCellIfOneWord)).not.to.throw()
				let instance = null
				expect(() => {instance = new TestTagnameAutoPrependCellIfOneWord()}).not.to.throw()
				expect(instance).not.to.be.null
				expect(TestTagnameAutoPrependCellIfOneWord.tagName).to.be.equal("cell-oneword")
				expect(instance.tagName).to.be.equal(TestTagnameAutoPrependCellIfOneWord.tagName.toUpperCase())
			})
		})
		describe("stylesheet", function () {
			it("should default to Cell.stylesheet", function () {
				class TestStylesheetDefault extends Cell {}
				expect(() => Cell.register(TestStylesheetDefault)).not.to.throw()
				expect(TestStylesheetDefault.stylesheet).to.be.equal(Cell.stylesheet)
			})
			it("should be personnalisable", function () {
				class TestStylesheetFromAttribute extends Cell {static stylesheet = "body {background: red;}"}
				expect(() => Cell.register(TestStylesheetFromAttribute)).not.to.throw()
				let instance = null
				expect(() => {instance = new TestStylesheetFromAttribute()}).not.to.throw()
				expect(instance).not.to.be.null
				expect(TestStylesheetFromAttribute.stylesheet).to.be.instanceof(CSSStyleSheet)
				expect(TestStylesheetFromAttribute.stylesheet.rules).to.have.lengthOf(1)
				expect(TestStylesheetFromAttribute.stylesheet.rules[0].selectorText).to.be.equal("body")
				expect(TestStylesheetFromAttribute.stylesheet.rules[0].style.color).to.be.equal("red")
			})
		})
		describe("template", function () {
		})
	})
})
