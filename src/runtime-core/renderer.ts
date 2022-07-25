import { createComponentInstance, setupComponent } from './component'
import { ShapeFlags } from '../shared/shapeFlags'
import { Fragment, Text } from './vnode'

export function render(vnode, container) {
  // patch
  patch(vnode, container)
}

function patch(vnode, container) {
  // 区分类型
  const { type, shapeFlag } = vnode

  // fragment -> 只渲染children

  switch (type) {
    case Fragment:
      processFragment(vnode, container)
      break
    case Text:
      processText(vnode, container)
      break
    default:
      // 查找确认类型 用 &
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(vnode, container)
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(vnode, container)
      }
      break
  }
}

// 处理文本
function processText(vnode, container) {
  const { children } = vnode
  const textNode = (vnode.el = document.createTextNode(children))
  container.append(textNode)
}

// 处理占位符
function processFragment(vnode, conrainer) {
  // fragment 只渲染子节点
  mountChildren(vnode, conrainer)
}

// 处理元素
function processElement(vnode, container) {
  mountElement(vnode, container)
}

// 处理组件
function processComponent(vnode, container) {
  mountComponent(vnode, container)
}

// 挂载元素
function mountElement(vnode, container) {
  // 获取 el 存 el
  const el = (vnode.el = document.createElement(vnode.type))

  // string | array
  const { children, shapeFlag } = vnode

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // text_children
    el.textContent = children
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // array_children
    mountChildren(vnode, el)
  }
  // props
  const { props } = vnode
  for (const key in props) {
    const val = props[key]
    const isOn = (key) => /^on[A-Z]/.test(key)
    if (isOn(key)) {
      const event = key.slice(2).toLowerCase()
      el.addEventListener(event, val)
    }
    el.setAttribute(key, val)
  }

  container.append(el)
}

function mountChildren(vnode, container) {
  vnode.children.forEach((v) => {
    patch(v, container)
  })
}

// 挂载组件
function mountComponent(initialVNode, container) {
  // 创建组件实例
  const instance = createComponentInstance(initialVNode)
  setupComponent(instance)
  // 调用render
  setupRenderEffect(instance, initialVNode, container)
}

function setupRenderEffect(instance, initialVNode, container) {
  // 取出上下文
  const { proxy } = instance
  // 给render绑定上下文
  const subTree = instance.render.call(proxy)

  patch(subTree, container)

  // 所有的element初始化完成后
  // 根的el 赋值给组件
  initialVNode.el = subTree.el
}
