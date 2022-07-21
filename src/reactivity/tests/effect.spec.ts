import { effect, stop } from '../effect'
import { reactive } from '../reactive'

describe('effect', () => {
  // 基础测试
  it('happy path', () => {
    const user = reactive({
      age: 10,
    })

    let nextAge

    effect(() => {
      nextAge = user.age + 1
    })

    expect(nextAge).toBe(11)

    // update
    user.age++
    expect(nextAge).toBe(12)
  })

  // effect 返回 注册的方法
  it('should return runner when call effect', () => {
    let foo = 10
    const runner = effect(() => {
      foo++
      return 'foo'
    })

    expect(foo).toBe(11)
    const r = runner()
    expect(foo).toBe(12)
    expect(r).toBe('foo')
  })

  // scheduler
  // 1. 通过 effect 的第二个参数给定一个 scheduler 的 fn
  // 2. effect 第一次执行的时候 还会执行 fn
  // 3. 当响应式对象 set update 的时候 不会执行 fn 而是执行 scheduler
  // 4. 如果说 当执行 runner 的时候会再次执行 fn
  it('scheduler', () => {
    let dummy
    let run: any
    const scheduler = jest.fn(() => {
      run = runner
    })
    const obj = reactive({ foo: 1 })
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      { scheduler }
    )
    expect(scheduler).not.toHaveBeenCalled()
    expect(dummy).toBe(1)
    // should be called on first trigger
    obj.foo++
    expect(scheduler).toHaveBeenCalledTimes(1)
    // // should not run yet
    expect(dummy).toBe(1)
    // // manually run
    run()
    // // should have run
    expect(dummy).toBe(2)
  })

  // 清除依赖
  it('stop', () => {
    let dummy
    const obj = reactive({ prop: 1 })
    const runner = effect(() => {
      dummy = obj.prop
    })
    obj.prop = 2
    expect(dummy).toBe(2)
    stop(runner)
    // obj.prop = 3 // set
    obj.prop++ //obj.prop = obj.prop + 1 // get set
    expect(dummy).toBe(2)

    // stopped effect should still be manually callable
    runner()
    expect(dummy).toBe(3)
  })

  // 清除依赖后执行的方法
  it('events: onStop', () => {
    const onStop = jest.fn()
    const runner = effect(() => {}, {
      onStop,
    })

    stop(runner)
    expect(onStop).toHaveBeenCalled()
  })
})
