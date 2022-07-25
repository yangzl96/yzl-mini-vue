import { createComponentInstance, setupComponent } from './component'
import { ShapeFlags } from '../shared/shapeFlags'
import { Fragment, Text } from './vnode'
import { createAppAPI } from './createApp'

// 自定义渲染函数
export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
  } = options

  function render(vnode, container) {
    // patch 初始没有parent
    patch(vnode, container, null)
  }

  function patch(vnode, container, parentComponent) {
    // 区分类型
    const { type, shapeFlag } = vnode

    // fragment -> 只渲染children

    switch (type) {
      case Fragment:
        processFragment(vnode, container, parentComponent)
        break
      case Text:
        processText(vnode, container)
        break
      default:
        // 查找确认类型 用 &
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(vnode, container, parentComponent)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(vnode, container, parentComponent)
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
  function processFragment(vnode, conrainer, parentComponent) {
    // fragment 只渲染子节点
    mountChildren(vnode, conrainer, parentComponent)
  }

  // 处理元素
  function processElement(vnode, container, parentComponent) {
    mountElement(vnode, container, parentComponent)
  }

  // 处理组件
  function processComponent(vnode, container, parentComponent) {
    mountComponent(vnode, container, parentComponent)
  }

  // 挂载元素
  function mountElement(vnode, container, parentComponent) {
    // 获取 el 存 el
    const el = (vnode.el = hostCreateElement(vnode.type))

    // string | array
    const { children, shapeFlag } = vnode

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // text_children
      el.textContent = children
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // array_children
      mountChildren(vnode, el, parentComponent)
    }
    // props
    const { props } = vnode
    for (const key in props) {
      const val = props[key]
      hostPatchProp(el, key, val)
    }

    // container.append(el)
    hostInsert(el, container)
  }

  function mountChildren(vnode, container, parentComponent) {
    vnode.children.forEach((v) => {
      patch(v, container, parentComponent)
    })
  }

  // 挂载组件
  function mountComponent(initialVNode, container, parentComponent) {
    // 创建组件实例
    const instance = createComponentInstance(initialVNode, parentComponent)
    setupComponent(instance)
    // 调用render
    setupRenderEffect(instance, initialVNode, container)
  }

  function setupRenderEffect(instance, initialVNode, container) {
    // 取出上下文
    const { proxy } = instance
    // 给render绑定上下文
    const subTree = instance.render.call(proxy)

    patch(subTree, container, instance)

    // 所有的element初始化完成后
    // 根的el 赋值给组件
    initialVNode.el = subTree.el
  }

  return {
    createApp: createAppAPI(render),
  }
}
