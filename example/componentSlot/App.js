
import { h, createTextVNode } from '../../lib/guide-mini-vue.esm.js'
import { Foo } from './Foo.js'

export const App = {
  name: 'App',

  render() {
    const app = h('div', {}, 'app')
    // 将组件的children作为slot的值
    // const foo = h(Foo, {},
    //   [
    //     h('p', {}, "slot内容"),
    //     h('p', {}, '123')])

    // 为了做位置的映射 选择更好的数据结构 =>  具名插槽

    // 变成函数 => 作用域插槽
    const foo = h(
      Foo,
      {},
      {
        header: ({ age }) => [h('p', {}, 'header' + age), createTextVNode('测试文本')],
        footer: () => h('p', {}, 'footer')
      }
    )

    return h('div', {}, [app, foo])
  },

  setup() {
    return {}
  }
}