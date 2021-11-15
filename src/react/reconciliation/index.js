import { createTaskQueue, arrified, createStateNode, getTag } from '../Misc'

const taskQueue = createTaskQueue()

let subTask = null

let pendingCommit = null

/**
 * 最外层的fiber对象
 * @param {*} fiber
 */
const commitAllWork = (fiber) => {
  fiber.effects.forEach((item) => {
    if (item.effectTag === 'placement') {
      let fiber = item
      let parentFiber = item.parent

      while (parentFiber.tag == 'class_component') {
        parentFiber = parentFiber.parent
      }

      if (fiber.tag === 'host_component') {
        parentFiber.parent.stateNode.appendChild(fiber.stateNode)
      }
    }
  })
}

const getFirstTask = () => {
  /**
   * 从任务队列中获取任务
   */
  const task = taskQueue.pop()
  /**
   * 返回最外层节点的fiber对象
   */
  return {
    props: task.props,
    stateNode: task.dom,
    tag: 'host_root',
    effects: [],
    child: null,
  }
}

const reconcileChildren = (fiber, children) => {
  /**
   * children 可能是对象，也坑是数组
   * 将 children 转换成数组
   */
  const arrifiedChildren = arrified(children)

  let index = 0
  let numberOfElment = arrifiedChildren.length
  let element = null
  let newFiber = null
  let prevFiber = null

  while (index < numberOfElment) {
    element = arrifiedChildren[index]
    /**
     * 子集 fiber 对象
     */
    newFiber = {
      type: element.type,
      props: element.props,
      tag: getTag(element),
      effects: [],
      effectTag: 'placement', // 新增
      parent: fiber, // 父级节点
    }

    newFiber.stateNode = createStateNode(newFiber)

    // 为父级添加子级
    if (index == 0) {
      fiber.child = newFiber
    } else {
      // 位fiber添加下一个兄弟节点
      prevFiber.sibling = newFiber
    }
    // 存储当前的fiber对象
    prevFiber = newFiber
    index++
  }
}

/**
 * 执行任务
 * @param {*} fiber
 */
const executeTask = (fiber) => {
  /**
   * 构建子级fiber对象，类组件
   */
  if (fiber.tag === 'class_component') {
    // 调用组件的实例对象的render
    reconcileChildren(fiber, fiber.stateNode.render())
  } else {
    // 构建父级和父级的子集节点
    reconcileChildren(fiber, fiber.props.children)
  }

  // 当子级还有子集的时候返回子级
  if (fiber.child) {
    return fiber.child
  }
  // 如果没有子级的时候
  let currentExecutelyFiber = fiber
  // 循环当前fiber的父级
  while (currentExecutelyFiber.parent) {
    currentExecutelyFiber.parent.effects =
      currentExecutelyFiber.parent.effects.concat(
        currentExecutelyFiber.effects.concat([currentExecutelyFiber])
      )
    // 存在当前fiber的兄弟节点， 则返回兄弟节点
    if (currentExecutelyFiber.sibling) {
      return currentExecutelyFiber.sibling
    }
    // 如果同级不存在，退回他的父级， 同时继续循环查询父级的同级
    currentExecutelyFiber = currentExecutelyFiber.parent
  }

  pendingCommit = currentExecutelyFiber
}

const workLoop = (deadline) => {
  // 如果子任务不存在，获取子任务
  if (!subTask) {
    subTask = getFirstTask()
  }
  /**
   * 如果任务存在并且浏览器有空余时间就调用
   * excuteTask方法执行任务， 接收任务 返回新任务
   */
  while (subTask && deadline.timeRemaining() > 1) {
    // 执行任务 返回新任务
    subTask = executeTask(subTask)
  }
  // 第二阶段
  if (pendingCommit) {
    commitAllWork(pendingCommit)
  }
}

const performTask = (deadline) => {
  // 执行任务
  workLoop(deadline)
  // 判断任务是否存在
  // 判断任务队列中是否还有任务没有执行
  // 再一次告诉浏览器在空闲时执行任务
  if (subTask || !taskQueue.isEmpty()) {
    requestIdleCallback(performTask)
  }
}

export const render = (element, dom) => {
  /**
   * 1. 向任务队列中添加任务
   * 2. 指定在浏览器空闲时执行任务
   */
  /**
   * 任务就是通过 vdom 对象构建 fiber 对象
   */
  taskQueue.push({
    dom: dom,
    props: {
      children: element,
    },
  })
  // 在浏览器空闲的时候执行任务
  requestIdleCallback(performTask)
}
