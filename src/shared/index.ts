export const extend = Object.assign

export const isObject = (val) => {
  return val !== null && typeof val === 'object'
}

export const hasChanged = (val, newV) => {
  return !Object.is(val, newV)
}

export const hasOwn = (target, key) =>
  Object.prototype.hasOwnProperty.call(target, key)

// add-foo => addFoo
export const camelize = (str) => {
  return str.replace(/-(\w)/, (_, c) => {
    return c ? c.toUpperCase() : ''
  })
}

// 首字母大写
export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const toHandlerKey = (str) => {
  return str ? 'on' + capitalize(str) : ''
}

export const isSameVNodeType = (n1, n2) => {
  return n1.type === n2.type && n1.key === n2.key
}
