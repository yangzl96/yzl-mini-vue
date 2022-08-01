import { NodeTypes } from '../src/ast'
import { CREATE_ELEMENT_VNODE } from '../src/runtimeHelpers'

export function transformElement(node, context) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      context.helper(CREATE_ELEMENT_VNODE)
      // 中间处理层

      // tag
      const vnodeTag = `'${node.tag}'`

      // props
      let vnodeProps

      //children
      const children = node.children
      let vnodeChildren = children[0]

      const vnodeElement = {
        type: NodeTypes.ELEMENT,
        tag: vnodeTag,
        props: vnodeProps,
        children: vnodeChildren,
      }

      node.codegenNode = vnodeElement
    }
  }
}
