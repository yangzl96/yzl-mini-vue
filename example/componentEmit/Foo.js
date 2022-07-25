import { h } from "../../lib/guide-mini-vue.esm.js"

export const Foo = {
  name: 'Foo',
  setup(props, { emit }) {

    const emitAdd = () => {
      console.log('click btn')
      emit('add', 1, 2)
      emit('add-foo', 1, 2)
    }
    return {
      emitAdd
    }
  },
  render() {
    const btn = h('button', {
      onClick: this.emitAdd
    }, 'emitAdd')

    const foo = h('p', {}, 'foo')
    return h('div', {}, [foo, btn])
  }
}