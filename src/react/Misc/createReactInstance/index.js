export const createReactInstance = (fiber) => {
  let instance = null
  // 处理类组件
  if (fiber.tag === 'class_component') {
    instance = new fiber.type(fiber.props)
  } else {
    // 处理函数组件
    instance = fiber.type
  }

  return instance
}
