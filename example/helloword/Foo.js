import { h } from "../../lib/guide-mini-vue.esm.js"

// 1. 实现setup中接收props
// 2. render中通过this访问到props中的值
// 3. props是shallowReadonly
export const Foo = {
  name: 'Foo',
  setup(props) {
    console.log(props)
  },
  render() {
    return h('div', {}, 'foo：' + this.count)
  }
}