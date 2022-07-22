import { render } from './renderer'
import { createVNode } from './vnode'

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      // 先转换 vnode
      // 所需所有的操作 都会基于 vnode 做处理
      const vnode = createVNode(rootComponent)
      render(vnode, rootContainer)
    },
  }
}
