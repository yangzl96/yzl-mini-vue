import { createComponentInstance, setupComponent } from './component'
import { ShapeFlags } from '../shared/shapeFlags'
import { Fragment, Text } from './vnode'
import { createAppAPI } from './createApp'
import { effect } from '../reactivity/effect'
import { EMPTY_OBJECT } from '../runtime-dom'
import { isSameVNodeType } from '../shared'

// 自定义渲染函数
export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options

  function render(vnode, container) {
    // patch 初始没有parent
    patch(null, vnode, container, null, null)
  }

  // n1:老的
  // n2:新的
  function patch(n1, n2, container, parentComponent, anchor) {
    // 区分类型
    const { type, shapeFlag } = n2

    // fragment -> 只渲染children

    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor)
        break
      case Text:
        processText(n1, n2, container)
        break
      default:
        // 查找确认类型 用 &
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent, anchor)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent, anchor)
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
  function processFragment(n1, n2, conrainer, parentComponent, anchor) {
    // fragment 只渲染子节点
    mountChildren(n2.children, conrainer, parentComponent, anchor)
  }

  // 处理元素
  function processElement(n1, n2, container, parentComponent, anchor) {
    if (!n1) {
      mountElement(n2, container, parentComponent, anchor)
    } else {
      patchElement(n1, n2, container, parentComponent, anchor)
    }
  }

  function patchElement(n1, n2, container, parentComponent, anchor) {
    // console.log(n1)
    // console.log(n2)
    const oldProps = n1.props || EMPTY_OBJECT
    const newProps = n2.props || EMPTY_OBJECT

    // n2一开始是没有el的，这里先复用n1的
    const el = (n2.el = n1.el)

    patchProps(el, oldProps, newProps)
    patchChildren(n1, n2, el, parentComponent, anchor)
  }

  // 比对属性
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

  // 比对子节点
  function patchChildren(n1, n2, container, parentComponent, anchor) {
    const prevShapeFlag = n1.shapeFlag
    const shapeFlag = n2.shapeFlag
    const c1 = n1.children
    const c2 = n2.children

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 新的是文本 老的数组
        // 1. 把老的 Children 清空
        unmountChildren(n1.children)
        // 2. 设置 text
        hostSetElementText(container, c2)
      } else {
        // 新老都是文本
        if (c1 !== c2) {
          hostSetElementText(container, c2)
        }
      }
    } else {
      // 新的是数组 老的是文本
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 清空文本
        hostSetElementText(container, '')
        // 挂载子节点
        mountChildren(c2, container, parentComponent, anchor)
      } else {
        // 新老都是数组
        patchKeyedChildren(c1, c2, container, parentComponent, anchor)
      }
    }
  }

  function patchKeyedChildren(
    c1,
    c2,
    container,
    parentComponent,
    parentAnchor
  ) {
    const l2 = c2.length
    // 三个重要的索引
    let i = 0
    let e1 = c1.length - 1
    let e2 = l2 - 1
    // 1. 从头至尾
    while (i <= e1 && 1 <= e2) {
      const n1 = c1[i] || {}
      const n2 = c2[i] || {}
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor)
      } else {
        break
      }

      i++
    }

    // 2. 从尾至头
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor)
      } else {
        break
      }

      e1--
      e2--
    }

    //3. 新的比老的多
    // 老的走完了 新的没走完 创建节点
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1
        // 判断是左侧添加还是右侧添加
        // 左侧添加到尾部 右侧添加到下一个节点的前面
        const anchor = nextPos < l2 ? c2[nextPos].el : null
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor)
          i++
        }
      }
    } else if (i > e2) {
      //新的走完了 老的没走完 删除
      while (i <= e1) {
        console.log(c1[i])
        hostRemove(c1[i].el)
        i++
      }
    } else {
      // 中间部分 乱序比对
      let s1 = i
      let s2 = i

      const toBePatched = e2 - s2 + 1 //要被处理的数量
      let patched = 0 //已经被处理的
      // 使用新的节点：生成 key => index 映射
      const keyToNewIndexMap = new Map()

      let moved = false
      let maxNewIndexSoFar = 0
      const newIndexToOldIndexMap = new Array(toBePatched)
      for (let i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0

      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i]
        keyToNewIndexMap.set(nextChild.key, i)
      }

      // 遍历老的 去查找新的
      let newIndex
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i]
        //5.1.1优化点
        if (patched >= toBePatched) {
          hostRemove(prevChild.el)
          continue
        }

        if (prevChild.key != null) {
          newIndex = keyToNewIndexMap.get(prevChild.key)
        } else {
          // 没有Key
          for (let j = s2; j <= e2; j++) {
            if (isSameVNodeType(prevChild, c2[j])) {
              newIndex = j
              break
            }
          }
        }
        // undefined 就是在新的里面没有找到
        if (newIndex === undefined) {
          hostRemove(prevChild.el)
        } else {
          // 判断是否移动了
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex
          } else {
            // 移动了： 新的节点索引 < 上次的索引
            moved = true
          }

          // 避免i=0 所以+1（0表示未被处理过，需要新增的）
          newIndexToOldIndexMap[newIndex - s2] = i + 1
          patch(prevChild, c2[newIndex], container, parentComponent, null)
          patched++
        }
      }

      // 获取最长递增子序列对应的索引
      // 优化：只有真的移动了才去做计算 节约性能
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : []

      let j = increasingNewIndexSequence.length - 1
      for (let i = toBePatched - 1; i >= 0; i--) {
        // 找在新节点里面对应的索引
        const nextIndex = i + s2
        // 获取新节点元素
        const nextChild = c2[nextIndex]
        // 找锚点 看下一个元素是否存在
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null

        if (newIndexToOldIndexMap[i] === 0) {
          // 需要新增的节点
          patch(null, nextChild, container, parentComponent, anchor)
        } else if (moved) {
          if (i !== increasingNewIndexSequence[j]) {
            // 移动位置
            hostInsert(nextChild.el, container, anchor)
          } else {
            j--
          }
        }
      }
    }
  }

  function unmountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      const el = children[i].el
      hostRemove(el)
    }
  }

  // 处理组件
  function processComponent(n1, n2, container, parentComponent, anchor) {
    mountComponent(n2, container, parentComponent, anchor)
  }

  // 挂载元素
  function mountElement(vnode, container, parentComponent, anchor) {
    // 获取 el 存 el
    const el = (vnode.el = hostCreateElement(vnode.type))

    // string | array
    const { children, shapeFlag } = vnode

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // text_children
      el.textContent = children
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // array_children
      mountChildren(vnode.children, el, parentComponent, anchor)
    }
    // props
    const { props } = vnode
    for (const key in props) {
      const val = props[key]
      hostPatchProp(el, key, null, val)
    }

    // container.append(el)
    hostInsert(el, container, anchor)
  }

  // 挂载子节点 初始化
  function mountChildren(children, container, parentComponent, anchor) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent, anchor)
    })
  }

  // 挂载组件
  function mountComponent(initialVNode, container, parentComponent, anchor) {
    // 创建组件实例
    const instance = createComponentInstance(initialVNode, parentComponent)
    setupComponent(instance)
    // 调用render
    setupRenderEffect(instance, initialVNode, container, anchor)
  }

  function setupRenderEffect(instance, initialVNode, container, anchor) {
    effect(() => {
      // 初始化
      if (!instance.isMounted) {
        // 取出上下文
        const { proxy } = instance
        // 给render绑定上下文
        // 存住subTree下次对比
        const subTree = (instance.subTree = instance.render.call(proxy))

        patch(null, subTree, container, instance, anchor)

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

        patch(prevSubTree, subTree, container, instance, anchor)
      }
    })
  }

  // 获取最长递增子序列
  function getSequence(arr: number[]): number[] {
    const p = arr.slice()
    const result = [0]
    let i, j, u, v, c
    const len = arr.length
    for (i = 0; i < len; i++) {
      const arrI = arr[i]
      if (arrI !== 0) {
        j = result[result.length - 1]
        if (arr[j] < arrI) {
          p[i] = j
          result.push(i)
          continue
        }
        u = 0
        v = result.length - 1
        while (u < v) {
          c = (u + v) >> 1
          if (arr[result[c]] < arrI) {
            u = c + 1
          } else {
            v = c
          }
        }
        if (arrI < arr[result[u]]) {
          if (u > 0) {
            p[i] = result[u - 1]
          }
          result[u] = i
        }
      }
    }
    u = result.length
    v = result[u - 1]
    while (u-- > 0) {
      result[u] = v
      v = p[v]
    }
    return result
  }

  return {
    createApp: createAppAPI(render),
  }
}
