import { getCurrentInstance } from './component'
export function provide(key, value) {
  // 存
  const currentInstance: any = getCurrentInstance()

  if (currentInstance) {
    let { provides } = currentInstance
    const parentProvides = currentInstance.parent.provides

    // init 初始化只执行一次 原型链赋值 向上查找
    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    provides[key] = value
  }
}

export function inject(key, defaultValue) {
  // 取
  const currentInstance: any = getCurrentInstance()

  if (currentInstance) {
    const parentProvides = currentInstance.parent.provides

    if (key in parentProvides) {
      return parentProvides[key]
    } else if (defaultValue) {
      if (typeof defaultValue === 'function') {
        return defaultValue()
      }
      return defaultValue
    }
  }
}
