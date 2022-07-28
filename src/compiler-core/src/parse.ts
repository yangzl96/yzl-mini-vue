import { NodeTypes } from './ast'

const enum TagType {
  Start,
  End,
}

export function baseParse(content) {
  const context = createParserContext(content)

  return createRoot(parseChildren(context))
}

function parseChildren(context) {
  const nodes: any = []

  let node
  const s = context.source
  if (s.startsWith('{{')) {
    node = parseInterpolation(context)
  } else if (s[0] === '<') {
    if (/[a-z]/i.test(s[1])) {
      node = parseElement(context)
    }
  }
  // 没有值 当成文本处理
  if (!node) {
    node = parseText(context)
  }

  nodes.push(node)
  return nodes
}

// 解析插值表达式
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

// 解析element
function parseElement(context: any) {
  // 解析开始标签
  const element = parseTag(context, TagType.Start)
  // 解析结束标签
  parseTag(context, TagType.End)
  console.log('-------------------', context.source)
  return element
}

// 解析标签
function parseTag(context: any, type: TagType) {
  // <div></div>
  // 匹配开始或者结束标签
  const match: any = /^<\/?([a-z]*)/i.exec(context.source)
  console.log(match)
  const tag = match[1]
  // 删除 <div
  advanceBy(context, match[0].length)
  // 删除 >
  advanceBy(context, 1)

  if (type === TagType.End) return

  return {
    type: NodeTypes.ELEMENT,
    tag,
  }
}

// 解析文本
function parseText(context: any): any {
  // 获取内容
  const content = context.source.slice(0, context.source.length)

  // 裁剪
  advanceBy(context, content.length)

  return {
    type: NodeTypes.TEXT,
    content,
  }
}
