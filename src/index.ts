export * from './runtime-dom'

import { baseCompiler } from './compiler-core/src'
import * as runtimeDom from './runtime-dom'
import { registerRuntimeCompiler } from './runtime-core/component'

function compileToFunction(template) {
  const { code } = baseCompiler(template)

  const render = new Function('Vue', code)(runtimeDom)

  return render
}

registerRuntimeCompiler(compileToFunction)
