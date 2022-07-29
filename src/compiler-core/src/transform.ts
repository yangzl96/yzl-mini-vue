export function transform(root, options) {
  const context = createTransformContext(root, options)
  // 1. 深度优先搜索
  tranverseNode(root, context)
  // 2. 修改 text content
}

function tranverseNode(node: any, context) {
  const children = node.children

  // 执行外部的插件逻辑
  const nodeTransforms = context.nodeTransforms
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i]
    transform(node)
  }

  // 处理孩子
  tranverseChildren(children, context)
}

function tranverseChildren(children: any, context: any) {
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const node = children[i]
      tranverseNode(node, context)
    }
  }
}

function createTransformContext(root: any, options: any) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
  }

  return context
}
