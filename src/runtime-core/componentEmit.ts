import { camelize, toHandlerKey } from '../shared/index'

export function emit(instance, event, ...arg) {
  console.log('emit => ' + event)
  // TPP开发技巧
  // 先去写一个特定的行为，再去重构成一个通用的行为
  // add => Add

  // 拿到props属性
  const { props } = instance

  const handlerName = toHandlerKey(camelize(event))

  // 去属性里面找到对应的方法名称
  const handler = props[handlerName]
  handler && handler(...arg)
}
