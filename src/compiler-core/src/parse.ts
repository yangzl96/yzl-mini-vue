import { NodeTypes } from './ast'

export function baseParse(content) {
  const context = createParserContext(content)

  return createRoot(parseChildren(context))
}

function parseChildren(context) {
  const nodes: any = []

  let node
  if (context.source.startsWith('{{')) {
    node = parseInterpolation(context)
  }
  nodes.push(node)
  return nodes
}

function parseInterpolation(context) {
  //{{message}}

  const openDelimiter = '{{'
  const closeDelimiter = '}}'

  // {{message}} 查找 }} 从索引为2的地方开始，也就是排除了前面的 {{，算是优化，结果与不加2一样
  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  )

  // 剔除前面的 {{
  advanceBy(context, openDelimiter.length)

  // 计算内容长度
  const rawContentLength = closeIndex - openDelimiter.length
  // 获取内容
  const rawContent = context.source.slice(0, rawContentLength)
  const content = rawContent.trim()

  // 处理完删除
  advanceBy(context, rawContentLength + closeDelimiter.length)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content,
    },
  }
}

function createParserContext(content: any) {
  return {
    source: content,
  }
}

function createRoot(children) {
  return {
    children,
  }
}

// 切割
function advanceBy(context: any, length: number) {
  context.source = context.source.slice(length)
}
