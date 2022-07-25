import { h, renderSlots } from "../../lib/guide-mini-vue.esm.js"

export const Foo = {
  name: 'Foo',
  setup() {
    return {

    }
  },
  render() {
    const foo = h('p', {}, 'foo')
    // 渲染：
    // this.$slots渲染插槽
    // this.$slots 可能是单个虚拟dom节点，也可能是数组

    // 控制渲染位置：具名插槽
    // 1.获取要渲染的元素
    // 2.获取到渲染的位置

    // 作用域插槽
    const age = 18
    return h('div', {},
      [renderSlots(this.$slots, 'header', {
        age
      }), foo, renderSlots(this.$slots, 'footer')])
  }
}