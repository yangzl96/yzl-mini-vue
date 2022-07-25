import { h, provide, inject } from "../../lib/guide-mini-vue.esm.js"

const Provider = {
  name: 'Provider',
  setup() {
    provide('foo', 'fooVal')
    provide('bar', 'barVal')
  },
  render() {
    return h('div', {}, [h('p', {}, 'provider'), h(ProviderTwo)])
  }
}

const ProviderTwo = {
  name: 'ProviderTwo',
  setup() {
    provide('foo', 'fooTwo')
    const foo = inject('foo')
    return {
      foo
    }
  },
  render() {
    return h('div', {}, [h('p', {}, `providerTwo foo: ${this.foo}`), h(Consumer)])
  }
}

const Consumer = {
  name: 'Consumer',
  setup() {
    const foo = inject('foo')
    const bar = inject('bar')
    // 默认值
    // const baz = inject('baz', 'baz-defaultValue')
    const baz = inject('baz', () => 'baz-defaultValue')

    return {
      foo,
      bar,
      baz
    }
  },
  render() {
    return h('div', {}, `Consumer: -${this.foo} - ${this.bar} - ${this.baz}`)
  }
}

export default {
  name: 'App',
  setup() { },
  render() {
    return h('div', {}, [h('p', {}, 'providerInject'), h(Provider)])
  }
}