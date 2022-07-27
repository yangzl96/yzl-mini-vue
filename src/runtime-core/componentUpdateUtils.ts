export function shouldUpdateComponent(prevVNode, nextVNode) {
  const { props: prevProps } = prevVNode
  const { props: nextProps } = nextVNode

  // 有不同的props才需要更新
  for (const key in nextProps) {
    if (nextProps[key] !== prevProps[key]) {
      return true
    }
  }
  return false
}
