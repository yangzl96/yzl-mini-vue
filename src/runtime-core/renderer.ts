import { createComponentInstance, setupComponent } from './component'
import { isObject } from '../shared/index'

export function render(vnode, container) {
  // patch
  patch(vnode, container)
}

function patch(vnode, container) {
  // 区分element component
  if (typeof vnode.type === 'string') {
    processElement(vnode, container)
  } else if (isObject(vnode.type)) {
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
  const el = document.createElement(vnode.type)

  // string | array
  const { children } = vnode
  console.log(children)
  if (typeof children === 'string') {
    el.textContent = children
  } else if (Array.isArray(children)) {
    // vnode
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
