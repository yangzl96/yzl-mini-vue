
import { h } from '../../lib/guide-mini-vue.esm.js'

export const App = {
  // render里面的变量 来自 setup的返回值
  render() {
    return h("div", { id: 'root', class: ['red', 'grey'] },
      'hi，' + this.msg
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