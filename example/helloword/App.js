
import { h } from '../../lib/guide-mini-vue.esm.js'
import { Foo } from './Foo.js'

export const App = {
  name: 'App',
  // render里面的变量 来自 setup的返回值
  render() {
    return h("div", {
      id: 'root',
      class: ['red', 'grey'],
      onClick: () => { console.log('cccc') }
    },
      [h('div', {}, 'hi，' + this.msg), h(Foo, { count: 1 })]

      // 'hi，' + this.msg
      // [
      //   h('p', { class: "red" }, 'hi'),
      //   h('p', { class: 'blue' }, 'mini vue')
      // ]
    )
  },

  setup() {
    return {
      msg: "mini vue"
    }
  }
}