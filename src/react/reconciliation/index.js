import { createTaskQueue } from '../Misc'

const taskQueue = createTaskQueue()

let subTask = null

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

const executeTask = (fiber) => {}

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
