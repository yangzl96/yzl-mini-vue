import { extend } from '../shared'

let activeEffect //当前进来的副作用函数
let shouldTrack // 是否可追踪依赖

class ReactiveEffect {
  private _fn: any
  deps = []
  active = true
  onStop?: () => void

  public scheduler: Function | undefined
  constructor(fn, scheduler?: Function) {
    this._fn = fn
    this.scheduler = scheduler
  }

  run() {
    if (!this.active) {
      return this._fn()
    }

    // 会收集依赖 shouldTrack 来做区分
    shouldTrack = true
    // 保存当前实例对象
    activeEffect = this
    // fn执行就会收集依赖
    const result = this._fn()
    // 收集完 及时关闭
    shouldTrack = false
    return result
  }

  stop() {
    if (this.active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}

// 清空当前依赖
function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect)
  })
  effect.deps.length = 0
}

export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler)
  // 挂载 options 到 _effect
  extend(_effect, options)

  _effect.run()
  const runner: any = _effect.run.bind(_effect)
  runner.effect = _effect
  return runner
}

const targetMap = new WeakMap()
export function track(target, key) {
  if (!isTracking()) return

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  // 已经存在
  if (dep.has(activeEffect)) return

  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}

// 是否在收集依赖
function isTracking() {
  return shouldTrack && activeEffect !== undefined
}

export function trigger(target, key) {
  const depsMap = targetMap.get(target)
  const dep = depsMap.get(key)

  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}

// 清空依赖
export function stop(runner) {
  runner.effect.stop()
}
