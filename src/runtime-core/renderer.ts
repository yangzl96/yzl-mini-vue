import { createComponentInstance, setupComponent } from './component'
import { isObject } from '../shared/index'
import { ShapeFlags } from '../shared/shapeFlags'

export function render(vnode, container) {
  // patch
  patch(vnode, container)
}

function patch(vnode, container) {
  // 区分类型
  const { shapeFlag } = vnode

  // 查找确认类型 用 &
  if (shapeFlag & ShapeFlags.ELEMENT) {
    processElement(vnode, container)
  } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    processComponent(vnode, container)
  }
}

function processElement(vnode, container) {
  mountElement(vnode, container)
}

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
