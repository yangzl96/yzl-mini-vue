import { isTracking, trackEffect, triggerEffects } from './effect'
import { hasChanged, isObject } from '../shared/index'
import { reactive } from './reactive'

class RefImpl {
  private _value: any
  public dep
  private _rawValue: any
  public __v_isRef = true
  constructor(value) {
    this._rawValue = value
    this._value = convert(value)
    this.dep = new Set()
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = convert(newVal)
      triggerEffects(this.dep)
    }
  }
}

function convert(value) {
  return isObject(value) ? reactive(value) : value
}

function trackRefValue(ref) {
  if (isTracking()) {
    trackEffect(ref.dep)
  }
}

export function ref(value) {
  return new RefImpl(value)
}

export function isRef(ref) {
  return !!ref.__v_isRef
}

export function unRef(ref) {
  // 是不是ref对象  => ref.value
  return isRef(ref) ? ref.value : ref
}

// 使用的时候 不需要 .value 取值
export function proxyRefs(objectWithRef) {
  return new Proxy(objectWithRef, {
    get(target, key) {
      return unRef(Reflect.get(target, key))
    },
    set(target, key, value) {
      if (isRef(target[key]) && !isRef(value)) {
        return (target[key].value = value)
      } else {
        return Reflect.set(target, key, value)
      }
    },
  })
}
