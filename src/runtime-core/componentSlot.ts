import { ShapeFlags } from '../shared/shapeFlags'

export function initSlot(instance, children) {
  // 简单渲染
  // 支持单个vnode节点 或者数组vnode
  // instance.slots = Array.isArray(children) ? children : [children]

  // 具名插槽 带name的slot 对应位置

  const { vnode } = instance
  if (vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) {
    normalizeObjectSlots(children, instance.slots)
  }
}

function normalizeObjectSlots(children: any, slots: any) {
  for (const key in children) {
    const value = children[key]

    // slot
    slots[key] = (props) => normalizeSlotValue(value(props))
  }
}

function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value]
}
