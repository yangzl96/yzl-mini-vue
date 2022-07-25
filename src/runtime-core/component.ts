import { initProps } from './componentProps'
import { PublicInstanceProxyHandlers } from './componentPublicInstance'
import { shallowReadonly } from '../reactivity/reactive'
import { emit } from './componentEmit'
import { initSlot } from './componentSlot'
export function createComponentInstance(vnode, parent) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    slots: {},
    provides: parent ? parent.provides : {},
    parent,
    emit: () => {},
  }

  // 默认给emit 先填充一个参数 后面使用就只需要 emit('xxx')
  component.emit = emit.bind(null, component) as any

  return component
}

export function setupComponent(instance) {
  initProps(instance, instance.vnode.props)
  initSlot(instance, instance.vnode.children)

  // 初始化一个有状态的component
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
  const Component = instance.type

  // ctx 绑定上下文 将来要用
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers)

  const { setup } = Component

  if (setup) {
    setCurrentInstance(instance)
    // function object
    // props 只读 传入配置项 emit......
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    })
    setCurrentInstance(null)
    handleSetupResult(instance, setupResult)
  }
}

function handleSetupResult(instance, setupResult) {
  // function Object

  // 存储 setup 中的返回值
  if (typeof setupResult === 'object') {
    instance.setupState = setupResult
  }

  finishComponentSetup(instance)
}

function finishComponentSetup(instance) {
  const Component = instance.type

  instance.render = Component.render
}

let currentInstance = null
export function getCurrentInstance() {
  return currentInstance
}

export function setCurrentInstance(instance) {
  currentInstance = instance
}
