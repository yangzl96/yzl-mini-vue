import { createComponentInstance, setupComponent } from './component'
import { ShapeFlags } from '../shared/shapeFlags'
import { Fragment, Text } from './vnode'
import { createAppAPI } from './createApp'
import { effect } from '../reactivity/effect'
import { EMPTY_OBJECT } from '../runtime-dom'

// 自定义渲染函数
export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
  } = options

  function render(vnode, container) {
    // patch 初始没有parent
    patch(null, vnode, container, null)
  }

  // n1:老的
  // n2:新的
  function patch(n1, n2, container, parentComponent) {
    // 区分类型
    const { type, shapeFlag } = n2

    // fragment -> 只渲染children

    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent)
        break
      case Text:
        processText(n1, n2, container)
        break
      default:
        // 查找确认类型 用 &
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent)
        }
        break
    }
  }

  // 处理文本
  function processText(n1, n2, container) {
    const { children } = n2
    const textNode = (n2.el = document.createTextNode(children))
    container.append(textNode)
  }

  // 处理占位符
  function processFragment(n1, n2, conrainer, parentComponent) {
    // fragment 只渲染子节点
    mountChildren(n2, conrainer, parentComponent)
  }

  // 处理元素
  function processElement(n1, n2, container, parentComponent) {
    if (!n1) {
      mountElement(n2, container, parentComponent)
    } else {
      patchElement(n1, n2, container)
    }
  }

  function patchElement(n1, n2, container) {
    console.log(n1)
    console.log(n2)
    const oldProps = n1.props || EMPTY_OBJECT
    const newProps = n2.props || EMPTY_OBJECT

    // n2一开始是没有el的，这里先复用n1的
    const el = (n2.el = n1.el)

    patchProps(el, oldProps, newProps)
  }

  function patchProps(el, oldProps, newProps) {
    if (oldProps !== newProps) {
      // 遍历新的 添加 覆盖
      for (const key in newProps) {
        const prevProp = oldProps[key]
        const nextProp = newProps[key]

        if (prevProp !== nextProp) {
          hostPatchProp(el, key, prevProp, nextProp)
        }
      }

      if (oldProps !== EMPTY_OBJECT) {
        // 遍历老的 删除不存在的
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null)
          }
        }
      }
    }
  }

  // 处理组件
  function processComponent(n1, n2, container, parentComponent) {
    mountComponent(n2, container, parentComponent)
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
      hostPatchProp(el, key, null, val)
    }

    // container.append(el)
    hostInsert(el, container)
  }

  // 挂载子节点 初始化
  function mountChildren(vnode, container, parentComponent) {
    vnode.children.forEach((v) => {
      patch(null, v, container, parentComponent)
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
    effect(() => {
      // 初始化
      if (!instance.isMounted) {
        // 取出上下文
        const { proxy } = instance
        // 给render绑定上下文
        // 存住subTree下次对比
        const subTree = (instance.subTree = instance.render.call(proxy))

        patch(null, subTree, container, instance)

        // 所有的element初始化完成后
        // 根的el 赋值给组件
        initialVNode.el = subTree.el
        instance.isMounted = true
      } else {
        // 更新
        const { proxy } = instance
        const subTree = instance.render.call(proxy)
        const prevSubTree = instance.subTree
        instance.subTree = subTree

        patch(prevSubTree, subTree, container, instance)
      }
    })
  }

  return {
    createApp: createAppAPI(render),
  }
}
