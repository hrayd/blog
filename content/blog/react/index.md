---
title: React核心原理浅析
date: "2021-07-18T22:00:00.000Z"
description: "对React的核心原理进行分析,包括JSX、Diffing、Fiber、Time Slice等."
---

# 1. JSX与虚拟DOM

我们从React官方文档开头最基本的一段Hello World代码入手:

```jsx
ReactDOM.render(
  <h1>Hello, world!</h1>,
  document.getElementById('root')
);
```

很明显, 这段代码的意思是通过 `ReactDOM.render()` 方法将 `h1` 包裹的JSX元素渲染到id为“root”的HTML元素上. 除了在JS中早已熟知的 `document.getElementById()` 方法外, 这段代码中还包含两个知识点:

- 以 `h1` 标签包裹的JSX元素
- `ReactDOM.render()` 方法

而这两个知识点则对应着React中要解决的核心问题:

- 为何以及如何使用(JSX表示的)虚拟DOM?
- 如何对虚拟DOM进行处理, 使其高效地渲染出来?

### 1.1 虚拟DOM是什么? 为何要使用虚拟DOM?

虚拟DOM其实就是用JavaScript对象表示的一个DOM节点, 内部包含了节点的 `tag` , `props` 和 `children` .

为何使用虚拟DOM? 因为直接操作真实DOM繁琐且低效, 通过虚拟DOM, 将一部分昂贵的浏览器重绘工作转移到相对廉价的存储和计算资源上.

### 1.2 如何将JSX转换成虚拟DOM?

通过babel可以将JSX编译为特定的JavaScript对象, 示例代码如下:

```jsx
// JSX
const e = (
	<div id="root">
		<h1 className="title">Title</h1>
  </div>
);
// babel编译结果(React17之前), 注意子元素的嵌套结构
var e = React.createElement(
	"div",
  { id: "root"},
	React.createElement(
		"h1",
		{ className: "title" },
		"Title"
	)
);
// React17之后编译结果有所区别, 创建节点的方法由react导出, 但基本原理大同小异
```

### 1.3 如何将虚拟DOM渲染出来?

很明显, 虚拟DOM中包含了创建DOM所需的各种信息, 对于首次渲染, 直接依照这些信息创建DOM节点即可.

但虚拟DOM的真正价值在于“更新”: 当一个list中的某些项发生了变化, 或删除或增加了若干项, 如何通过对比前后的虚拟DOM树, 最小化地更新真实DOM? 这就是React的核心目标.

# 2. React Diffing

"Diffing"即“找不同”, 就是解决上文引出的React的核心目标——如何通过对比新旧虚拟DOM树, 以在最小的操作次数下将旧DOM树转换为新DOM树.

在算法领域中, 两棵树的转换目前最优的算法复杂度为 `O(n**3)` , n为节点个数. 这意味着当树上有1000个元素时, 需要10亿次比较, 显然远远不够高效.

React在基于以下两个假设的基础上, 提出了一套复杂度为 `O(n)` 的启发式算法

1. 不同类型(即标签名、组件名)的元素会产生不同的树;
2. 通过设置 `key` 属性来标识一组同级子元素在渲染前后是否保持不变.

在实践中, 以上两个假设在绝大多数场景下都成立.

## 2.1 Diffling算法描述

### 不同类型的元素/组件

当元素的标签或组件名发生变化, 直接卸载并替换以此元素作为根节点的整个子树.

### 同一类型的元素

当元素的标签相同时, React保留此DOM节点, 仅对比和更新有改变的属性, 如className、title等, 然后递归对比其子节点.

对于 `style` 属性, React会继续深入对比, 仅更新有改变的属性, 如color、fontSize等.

### 同一类型的组件

当组件的props更新时, 组件实例保持不变, React调用组件的 `componentWillReceiveProps()` `componentWillUpdate()` 和 `componentDidUpdate()` 生命周期方法, 并执行 `render()` 方法.

Diffing算法会递归比对新旧 `render()` 执行的结果.

### 对子节点的递归

当一组同级子节点(列表)的末尾添加了新的子节点时, 上述Diffing算法的开销较小; 但当新元素被插入到列表开头时, Diffing算法只能按顺序依次比对并重建从新元素开始的后续所有子节点, 造成极大的开销浪费.

解决方案是为一组列表项添加 `key` 属性, 这样React就可以方便地比对出插入或删除项了.

关于 `key` 属性, 应稳定、可预测且在列表内唯一(无需全局唯一), 如果数据有ID的话直接使用此ID作为 `key`, 或者利用数据中的一部分字段哈希出一个key值.

避免使用数组索引值作为 `key`, 因为当插入或删除元素后, 之后的元素和索引值的对应关系都会发生错乱, 导致错误的比对结果.

避免使用不稳定的key(如随机数), 因为每次渲染都会发生改变, 从而导致列表项被不必要地重建.

## 2.2 递归的Diffing

在1.2节中的虚拟DOM对象中可以得知: 虚拟DOM树的每个节点通过 `children` 属性构成了一个嵌套的树结构, 这意味着要以递归的形式遍历和比较新旧虚拟DOM树.

2.1节的策略解决了Diffing算法的时间复杂度的问题, 但我们还面临着另外一个重大的性能问题——浏览器的渲染线程和JS的执行线程是互斥的, 这意味着DOM节点过多时, 虚拟DOM树的构建和处理会长时间占用主线程, 使得一些需要高优先级处理的操作如用户输入、平滑动画等被阻塞, 严重影响使用体验. 

### 时间切片(Time Slice)

为了解决浏览器主线程的阻塞问题, 引出 **时间切片** 的策略——将整个工作流程分解成小的工作单元, 并在浏览器空闲时交由浏览器执行这些工作单元, 每个执行单元执行完毕后, 浏览器都可以选择中断渲染并处理其他需要更高优先级处理的工作.

浏览器中提供了 `requestIdleCallback` 方法实现此功能, 将待调用的函数加入执行队列, 浏览器将在不影响关键事件处理的情况下逐个调用.

考虑到浏览器的兼容性以及 `requestIdleCallback` 方法的不稳定性, React自己实现了专用于React的类似 `requestIdleCallback` 且功能更完备的 `Scheduler` 来实现空闲时触发回调, 并提供了多种优先级供任务设置.

### 递归与时间切片

时间切片策略要求我们将虚拟DOM的更新操作分解为小的工作单元, 同时具备以下特性:

- 可暂停、可恢复的更新;
- 可跳过的重复性、覆盖性更新;
- 具备优先级的更新.

对于递归形式的程序来说, 这些是难以实现的. 于是就需要一个处于递归形式的虚拟DOM树上层的数据结构, 来辅助完成这些特性. 

这就是React16引入的重构后的算法核心——Fiber.

# 3. Fiber

从概念上来说, Fiber就是重构后的虚拟DOM节点, 一个Fiber就是一个JS对象.

Fiber节点之间构成 **单向链表** 结构, 以实现前文提到的几个特性: 更新可暂停/恢复、可跳过、可设优先级. 

## 3.1 Fiber节点

一个Fiber节点就是一个JS对象, 其中的关键属性可分类列举如下:

- 结构信息(构成链表的指针属性)
    - return: 父节点
    - child: 第一个子节点
    - sibling: 右侧第一个兄弟节点
    - alternate: 本节点在相邻更新时的状态, 用于比较节点前后的变化, 3.3节详述
- 组件信息
    - tag: 组件创建类型, 如FunctionComponent、ClassComponent、HostComponent等
    - key: 即key属性
    - type: 组件类型, Function/Class组件的type就是对应的Function/Class本身, Host组件的type就是对应元素的TagName
    - stateNode: 对应的真实DOM节点
- 本次更新的props和state相关信息
    - pendingProps、memoizedProps
    - memoizedState
    - dependencies
    - updateQueue
- 更新标记
    - effectTag: 节点更新类型, 如替换、更新、删除等
    - nextEffect、firstEffect、lastEffect
- 优先级相关: lanes、childrenLanes

## 3.2 Fiber树

前文说到, Fiber节点通过 `return` , `child` 和 `slibling` 属性构成了单向链表结构, 为了与DOM树对应, 习惯上仍称其为“树”. 

如一棵DOM树:

```html
<div>
	<h1>Title</h1>
	<section>
		<h2>Section</h2>
		<p>Content</p>
	</section>
	<footer>Footer</footer>
</div>
```

其 `section` 节点的Fiber可表示为:

```jsx
const sectionFiber = {
	key: "SECTION_KEY",
	child: h2Fiber,
	sibling: footerFiber,
	return: divFiber,
	alternate: oldSectionFiber,  
	...otherFiberProps,
}
```

整体的Fiber结构:

![./DOM.png](./DOM.png)

## 3.3 Fiber架构

基于Fiber构成的虚拟DOM树就是Fiber架构.

在3.1节中我们介绍过, 在Fiber节点中有一个重要属性 `alternate` , 单词意为“备用”. 

实际上, 在React中最多会同时存在两棵Fiber树:

- 当前显示在屏幕上、已经构建完成的Fiber树称为“Current Fiber Tree”,  我们将其中的Fiber节点简写为 `currFiber`;
- 当前正在构建的Fiber树称为“WorkInProgress Fiber Tree”, 我们将其Fiber节点节点简写为 `wipFiber`.

而这两棵树中节点的 `alternate` 属性互相指向对方树中的对应节点, 即: `currFiber.alternate === wipFiber; wipFiber.alternate === currFber;` 他们用于对比更新前后的节点以决定如何更新此节点.

在React中, 整个应用的根节点为 `fiberRoot` , 当wipFiber树构建完成后, `fiberRoot.current` 将从currFiber树的根节点切换为wipFiber的根节点, 以完成更新操作.

### 3.1 基于Fiber的调度——时间切片

在2.2节我们讨论了采用拆分工作单元并以时间切片的方式执行, 以避免阻塞主线程. 在Fiber架构下, 每个Fiber节点就是一个工作单元. 

在以下示例代码中, 我们使用浏览器提供的 `requestIdleCallback` 方法演示这个过程, 它会在浏览器空闲时执行一个workLoop、处理一个Fiber节点, 然后可以根据实际情况继续执行或暂停等待执行下一个workLoop.

```jsx
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
		// 处理一个Fiber节点, 返回下一个Fiber节点, 详见3.3节
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    // 暂停处理的演示: 当时间不足时取消循环处理过程
    shouldYield = deadline.timeRemaining() < 1;
  }
  // 当执行完毕(不存在下一个执行单元), 提交整个DOM树
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}
requestIdleCallback(workLoop);
```

### 3.2 对Fiber节点的处理顺序——DFS

由前文我们可知, Fiber节点通过 `return` `child` `sibling` 三个属性相互连接, 整体构成一个单向链表结构,其调度方式就是 深度优先遍历 :

1. 以wipFiber树的Root节点作为第一个执行单元;
2. 若当前执行单元存在child节点, 则将child节点作为下一个执行单元;
3. 重复2, 直至当前执行单元无child;
4. 若当前执行单元存在sibling节点, 则将sibling节点作为下一个执行单元, 并回到2;
5. 若当前执行单元无child且无sibling, 返回到父节点, 并回到4;
6. 重复5; 直至回到Root节点, 执行完毕, 将 `fiberRoot.current` 只为wipFiber树的根节点.

以上步骤说明, Fiber节点通过 `child` → `sibling` → `return` 的顺序进行深度优先遍历“处理”, 而后更新Fiber树. 那么如何“处理”Fiber节点呢?

### 3.3 对Fiber节点的处理过程

对Fiber节点的处理就是执行一个 `performUnitOfWork` 方法, 它接收一个将要处理的Fiber节点, 然后完成以下工作:

1. 完善构建Fiber节点: 创建DOM并获取 `children`
    - 对于HostComponent和ClassComponent, 根据Fiber中的相关属性, 创建DOM节点并赋给 `Fiber.stateNode` 属性;
    - 对于FunctionComponent, 直接通过函数调用获取其children: `Fiber.type(Fiber.props)`

    ```jsx
    // 执行工作单元,并返回下一个工作单元
    function performUnitOfWork(fiber) {
      // 构建当前节点的fiber
      const isFunctionComponent = fiber.type instanceof Function;
      if (isFunctionComponent) {
        updateFunctionComponent(fiber);
      } else {
        updateHostComponent(fiber);
      }
    
      // 处理子节点, 构建Fiber树
      const elements = fiber.props.children;
      reconcileChildren(fiber, elements);
    
      // TODO: 返回下一个执行单元
      // fiber.child || fiber.sibling || fiber.return
    }
    
    // Class/Host组件: 创建DOM
    function updateHostComponent(fiber) {
      if (!fiber.dom) {
        fiber.dom = createDom(fiber);
      }
      reconcileChildren(fiber, fiber.props.children);
    }
    
    // 更新Function组件, Function组件需要从返回值获取子组件
    // 注意: Function组件无DOM
    function updateFunctionComponent(fiber) {
      // 初始化hooks
      wipFiber = fiber;
      hookIndex = 0;
      fiber.hooks = [];
      const children = [fiber.type(fiber.props)]; // Function组件返回children
      reconcileChildren(fiber, children);
    }
    // TODO: reconcileChildren处理子节点,见第3步
    ```

2. 通过 `Fiber.alternate` 获取 `oldFiber` , 即上一次更新后的Fiber值, 然后在下一步中构建和Diff当前Fiber的 `children` .

    ```jsx
    function reconcileChildren(wipFiber, elements) {
      let oldFiber = wipFiber.alternate
    			&& wipFiber.alternate.child;
      // ...
    }
    ```

3. 构建 `children` Fibers, 对于每个子Fiber, 同步地完成以下工作:
    - 构建Fiber链表: 为每个子元素创建Fiber, 并将父Fiber的 `child` 属性指向第一个子Fiber, 然后按顺序将子Fiber的 `sibling` 属性指向下一个子Fiber;
    - 对比(Diffing)新旧Fiber节点的 `type` `props` `key` 等属性, 确定节点是可以直接复用、替换、更新还是删除, 需要更新的Fiber节点在其 `effectTag` 属性中打上 `Update` `Placement` `PlacementAndUpdate` `Deletion` 等标记, 以在提交更新阶段进行处理.

    ```jsx
    function reconcileChildren(wipFiber, elements) {
      let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
      let index = 0;
      let prevSibling = null;
    
      while (index < elements.length || oldFiber !== null) {
        const element = elements[index];
        let newFiber = null;
    
        // Compare oldFiber to element
        const sameType = oldFiber && element && element.type === oldFiber.type;
    
        if (sameType) {
          // update the node
          newFiber = {
            type: oldFiber.type,
            props: element.props,
            dom: oldFiber.dom,
            parent: wipFiber,
            alternate: oldFiber,
            effectTag: "UPDATE",
          };
        }
    
        if (element && !sameType) {
          // add this node
          newFiber = {
            type: element.type,
            props: element.props,
            dom: null,
            parent: wipFiber,
            alternate: null,
            effectTag: "PLACEMENT",
          };
        }
    
        if (oldFiber && !sameType) {
          // delete the oldFiber's node
          oldFiber.effectTag = "DELETION";
          deletions.push(oldFiber);
        }
    
        if (oldFiber) {
          oldFiber = oldFiber.sibling;
        }
    
        if (index === 0) {
          wipFiber.child = newFiber;
        } else {
          prevSibling = newFiber;
        }
    
        prevSibling = newFiber;
        index++;
      }
    ```

4. 按DFS顺序返回下一个工作单元, 示例代码如下:

    ```jsx
    if (fiber.child) {
        return fiber.child;
      }
      let nextFiber = fiber;
      while (nextFiber) {
        if (nextFiber.sibling) {
          return nextFiber.sibling;
        }
        nextFiber = nextFiber.parent;
      }
    ```

当DFS过程回到根节点时, 表明本次更新的 wipFiber树 构建完成, 进入下一步的提交更新阶段.

### 3.4 提交更新阶段

在进入本阶段时, 新的Fiber树已构建完成, 需要进行替换、更新或删除的Fiber节点也在其 `effectTag` 中进行了标记, 所以本阶段第一个工作就是根据 `effectTag` 操作真实DOM.

为了避免从头再遍历Fiber树寻找具有 `effectTag` 属性的Fiber, 在上一步Fiber树的构建过程中保存了一条需要更新的Fiber节点的单向链表 `effectList` , 并将此链表的头节点存储在Fiber树根节点的 `firstEffect` 属性中, 同时这些Fiber节点的 `updateQueue` 属性中也保存了需要更新的 `props` .

除了更新真实DOM外, 在提交更新阶段还需要在特定阶段调用和处理生命周期方法、执行Hooks操作, 本文不再详述.

在此参考了 [https://pomb.us/build-your-own-react/](https://pomb.us/build-your-own-react/) 中提供的 `useState` Hook的实现代码, 有助于理解在执行 `setState` 方法后都发生了什么: 

```jsx
function useState(initial) {
  // 判断上一次渲染是否存在此Hook,如果存在就使用上一个state,否则创建新的hook并更新索引
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [], // 每次执行setState时,将action加入此队列,并在下一次渲染时执行
  };

  // 下一次渲染时, 获取执行队列并逐步执行, 使得state保持最新
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state = action(hook.state);
  });

  // setState方法: 将action添加到执行队列并触发渲染, 在下一次渲染时执行此action
  const setState = (action) => {
    hook.queue.push(action);
    // 执行setState后应重新触发渲染
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}
```

# 参考文献

- React官方文档与相关源码
- [https://pomb.us/build-your-own-react/](https://pomb.us/build-your-own-react/)
- [https://react.iamkasong.com](https://react.iamkasong.com/renderer/beforeMutation.html#commitbeforemutationeffects)