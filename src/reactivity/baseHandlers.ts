import { track, trigger } from './effect'

// 避免每次依赖跟踪 都调用一次
const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)

// 抽出getter
function createGetter(isReadonly = false) {
  return function get(target, key) {
    const res = Reflect.get(target, key)
    if (!isReadonly) {
      track(target, key)
    }
    return res
  }
}

// 抽出setter
function createSetter() {
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value)
    trigger(target, key)
    return res
  }
}

export const mutableHandlers = {
  get,
  set,
}

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key, value) {
    console.warn(`key: ${key} set 失败 因为target是 readonly`)
    return true
  },
}
