import { generate } from '../src/codegen'
import { baseParse } from '../src/parse'
import { transform } from '../src/transform'
import { transformExpression } from '../transforms/transformExpresion'
import { transformElement } from '../transforms/transformElement'
import { transformText } from '../transforms/transformText'

describe('codegen', () => {
  it('string', () => {
    const ast = baseParse('hi')
    transform(ast)
    const { code } = generate(ast)

    expect(code).toMatchSnapshot()
  })

  it('interpolation', () => {
    const ast = baseParse('{{message}}')
    console.log(ast)
    transform(ast, {
      nodeTransforms: [transformExpression],
    })
    const { code } = generate(ast)

    expect(code).toMatchSnapshot()
  })

  it('element', () => {
    const ast = baseParse('<div>hi,{{message}}</div>')
    transform(ast, {
      nodeTransforms: [transformExpression, transformElement, transformText],
    })
    console.log(ast)
    const { code } = generate(ast)

    expect(code).toMatchSnapshot()
  })

  // it('interpolation', () => {
  //   const ast = baseParse('{{message}}')
  //   console.log(ast)
  //   transform(ast, {
  //     nodeTransforms: [transformExpression],
  //   })
  //   const { code } = generate(ast)

  //   expect(code).toMatchSnapshot()
  // })

  // it('interpolation', () => {
  //   const ast = baseParse('{{message}}')
  //   console.log(ast)
  //   transform(ast, {
  //     nodeTransforms: [transformExpression],
  //   })
  //   const { code } = generate(ast)

  //   expect(code).toMatchSnapshot()
  // })
})
