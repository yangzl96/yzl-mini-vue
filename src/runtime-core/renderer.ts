import { createComponentInstance, setupComponent } from './component'

export function render(vnode, container) {
  // patch
  patch(vnode, container)
}

function patch(vnode, container) {
  processComponent(vnode, container)
}

function processComponent(vnode, container) {
  mountComponent(vnode, container)
}

// 挂载
function mountComponent(vnode, container) {
  // 创建组件实例
  const instance = createComponentInstance(vnode)
  setupComponent(instance)
  // 调用render
  setupRenderEffect(instance, container)
}

function setupRenderEffect(instance, container) {
  const subTree = instance.render()

  patch(subTree, container)
}
