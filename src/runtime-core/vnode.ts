import { ShapeFlags } from '../shared/shapeFlags'

export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    el: null,
    shapeFlag: getShapeFlag(type),
  }

  // 处理children 修改用 与运算 |
  // 比如 初始化完一个vnode 他的 shapeFlag = ShapeFlags.ELEMENT
  // 这时候 处理 children 发现是 string 那么 shapeFlags
  // 应该就是 文本元素(ELEMENT | TEXT_CHILDREN)
  // 否则就是 数组元素(ELEMENT | ARRAY_CHILDRREN)
  if (typeof children === 'string') {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  }

  // slot: 组件 + children 是 object
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === 'object') {
      vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN
    }
  }

  return vnode
}

// vnode的类型 就 string 和 有状态组件
function getShapeFlag(type) {
  return typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT
}
