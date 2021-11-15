import { updateNodeElement } from '../DOM'
import {
  createTaskQueue,
  arrified,
  createStateNode,
  getTag,
  getRoot,
} from '../Misc'

const taskQueue = createTaskQueue()

let subTask = null

let pendingCommit = null

/**
 * 最外层的fiber对象
 * @param {*} fiber
 */
const commitAllWork = (fiber) => {
  // 循环effets 数组 构建 DOM 节点树
  fiber.effects.forEach((item) => {
    if (item.tag === 'class_component') {
      item.stateNode.__fiber = item
    }

    if (item.effectTag === 'delete') {
      // 删除
      item.parent.stateNode.removeChild(item.stateNode)
    } else if (item.effectTag === 'update') {
      // 更新
      if (item.type === item.alternate.type) {
        // 节点类型相同
        updateNodeElement(item.stateNode, item, item.alternate)
      } else {
        // 节点类型不同
        item.parent.stateNode.replaceChild(
          item.stateNode,
          item.alternate.stateNode
        )
      }
    } else if (item.effectTag === 'placement') {
      /**
       * 当前要追加的子节点
       */
      let fiber = item
      // 当前要追加的子节点的父级
      let parentFiber = item.parent
      // 找到普通节点父级，排除组件父级
      // 因为组件父级是不能直接追加真实DOM节点的
      while (
        parentFiber.tag == 'class_component' ||
        parentFiber.tag == 'function_component'
      ) {
        parentFiber = parentFiber.parent
      }
      /**
       * 如果节点是普通节点 找到父级 将子节点追加到父级中
       */
      if (fiber.tag === 'host_component') {
        parentFiber.parent.stateNode.appendChild(fiber.stateNode)
      }
    }
  })
  // 将根节点的fiber对象 备份到根节点的 dom对象中的 一个属性中
  fiber.stateNode.__rootFiberContainer = fiber
}

const getFirstTask = () => {
  /**
   * 从任务队列中获取任务
   */
  const task = taskQueue.pop()

  if (task.from === 'class_component') {
    // 组件状态更新任务
    const root = getRoot(task.instance)
    task.instance.__fiber.partialState = task.partialState
    return {
      props: root.props,
      stateNode: root.stateNode,
      tag: 'host_root',
      effects: [],
      child: null,
      alternate: root,
    }
  }
  /**
   * 返回最外层节点的fiber对象
   */
  return {
    props: task.props,
    stateNode: task.dom,
    tag: 'host_root',
    effects: [],
    child: null,
    alternate: task.dom.__rootFiberContainer,
  }
}

const reconcileChildren = (fiber, children) => {
  /**
   * children 可能是对象，也坑是数组
   * 将 children 转换成数组
   */
  const arrifiedChildren = arrified(children)

  let index = 0
  // children 数组中元素的个数
  let numberOfElment = arrifiedChildren.length
  // 子节点的vdom对象
  let element = null
  // 子级fiber对象
  let newFiber = null
  // 上一个兄弟fiber对象
  let prevFiber = null

  let alternate = null

  // 是否存在备份节点
  if (fiber.alternate && fiber.alternate.child) {
    alternate = fiber.alternate.child
  }

  while (index < numberOfElment || alternate) {
    // 子级vdom 对象
    element = arrifiedChildren[index]

    if (!element && alternate) {
      // 删除操作
      alternate.effectTag = 'delete'
      fiber.effects.push(alternate)
    } else if (element && alternate) {
      // 更新
      newFiber = {
        type: element.type,
        props: element.props,
        tag: getTag(element),
        effects: [],
        effectTag: 'update', // 新增
        parent: fiber, // 父级节点
        alternate,
      }

      if (element.type === alternate.type) {
        // 类型相同
        newFiber.stateNode = alternate.stateNode
      } else {
        // 类型不同
        newFiber.stateNode = createStateNode(newFiber)
      }
    } else if (element && !alternate) {
      /**
       *  初始渲染
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
    }

    // 为父级添加子级
    if (index == 0) {
      fiber.child = newFiber
    } else if (element) {
      // 位fiber添加下一个兄弟节点
      prevFiber.sibling = newFiber
    }

    if (alternate && alternate.sibling) {
      alternate = alternate.sibling
    } else {
      alternate = null
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
    if (fiber.stateNode.__fiber && fiber.stateNode.__fiber.partialState) {
      fiber.stateNode.state = {
        ...fiber.stateNode.state,
        ...fiber.stateNode.__fiber.partialState,
      }
    }

    // 调用组件的实例对象的render
    reconcileChildren(fiber, fiber.stateNode.render())
  } else if (fiber.tag === 'function_component') {
    requestIdleCallback(fiber, fiber.stateNode(fiber.props))
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

export const scheduleUpdate = (instance, partialState) => {
  taskQueue.push({
    from: 'class_component',
    instance,
    partialState,
  })

  requestIdleCallback(performTask)
}
