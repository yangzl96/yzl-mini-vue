import { NodeTypes } from './ast'

const enum TagType {
  Start,
  End,
}

export function baseParse(content) {
  const context = createParserContext(content)
  return createRoot(parseChildren(context, []))
}

function parseChildren(context, ancestors) {
  const nodes: any = []

  while (!isEnd(context, ancestors)) {
    let node
    const s = context.source
    if (s.startsWith('{{')) {
      // 处理插值
      node = parseInterpolation(context)
    } else if (s[0] === '<') {
      // 解析元素
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors)
      }
    }
    // 没有值 当成文本处理
    if (!node) {
      node = parseText(context)
    }

    nodes.push(node)
  }
  return nodes
}

// 是否终止
function isEnd(context, ancestors) {
  const s = context.source
  // </div>
  if (s.startsWith('</')) {
    // 从后往前查找对应的相同的tag
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const tag = ancestors[i].tag
      if (startsWithEndTagOpen(s, tag)) {
        return true
      }
    }
  }
  // // 2. 遇到结束标签 同时只剩下闭合标签了
  // if (parentTag && s.startsWith(`</${parentTag}>`)) {
  //   console.log('--------------------isover')
  //   return true
  // }

  // // 1. source有值
  return !s
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
  const rawContent = parseTextData(context, rawContentLength)
  const content = rawContent.trim()

  // 处理完删除 尾部的 }}
  advanceBy(context, closeDelimiter.length)
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

function parseTextData(context, length) {
  const content = context.source.slice(0, length)

  advanceBy(context, length)
  return content
}

// 解析element
function parseElement(context: any, ancestors) {
  // 解析开始标签
  const element: any = parseTag(context, TagType.Start)
  // 入栈
  ancestors.push(element)
  // 处理孩子
  element.children = parseChildren(context, ancestors)
  // 处理完出栈
  ancestors.pop()

  // 解析结束标签 标签相互匹配才处理
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End)
  } else {
    throw new Error(`缺少结束标签:${element.tag}`)
  }

  return element
}

function startsWithEndTagOpen(source, tag) {
  return (
    source.startsWith('</') &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  )
}

// 解析标签
function parseTag(context: any, type: TagType) {
  // <div></div>
  // 匹配开始或者结束标签
  const match: any = /^<\/?([a-z]*)/i.exec(context.source)
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
  let endIndex = context.source.length
  let endTokens = ['{{', '<']

  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i])
    if (index !== -1 && endIndex > index) {
      // 碰到文本中的 插值就结束
      endIndex = index
    }
  }
  // 获取内容
  const content = parseTextData(context, endIndex)

  return {
    type: NodeTypes.TEXT,
    content,
  }
}
