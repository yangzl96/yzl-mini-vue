const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        component: null,
        key: props && props.key,
        shapeFlag: getShapeFlag(type),
    };
    // 处理children 修改用 与运算 |
    // 比如 初始化完一个vnode 他的 shapeFlag = ShapeFlags.ELEMENT
    // 这时候 处理 children 发现是 string 那么 shapeFlags
    // 应该就是 文本元素(ELEMENT | TEXT_CHILDREN)
    // 否则就是 数组元素(ELEMENT | ARRAY_CHILDRREN)
    if (typeof children === 'string') {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    // slot: 组件 + children 是 object
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === 'object') {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
// vnode的类型 就 string 和 有状态组件
function getShapeFlag(type) {
    return typeof type === 'string'
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === 'function') {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === 'object';
};
const isString = (value) => typeof value === 'string';
const hasChanged = (val, newV) => {
    return !Object.is(val, newV);
};
const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);
// add-foo => addFoo
const camelize = (str) => {
    return str.replace(/-(\w)/, (_, c) => {
        return c ? c.toUpperCase() : '';
    });
};
// 首字母大写
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return str ? 'on' + capitalize(str) : '';
};
const isSameVNodeType = (n1, n2) => {
    return n1.type === n2.type && n1.key === n2.key;
};

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (key in setupState) {
            return setupState[key];
        }
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

let activeEffect; //当前进来的副作用函数
let shouldTrack; // 是否可追踪依赖
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = [];
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        if (!this.active) {
            return this._fn();
        }
        // 会收集依赖 shouldTrack 来做区分
        shouldTrack = true;
        // 保存当前实例对象
        activeEffect = this;
        // fn执行就会收集依赖
        const result = this._fn();
        // 收集完 及时关闭
        shouldTrack = false;
        return result;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
// 清空当前依赖
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    // 挂载 options 到 _effect
    extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}
const targetMap = new WeakMap();
function track(target, key) {
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffect(dep);
}
function trackEffect(dep) {
    // 已经存在
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
// 是否在收集依赖
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
function trigger(target, key) {
    const depsMap = targetMap.get(target);
    const dep = depsMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

// 避免每次依赖跟踪 都调用一次
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
// 抽出getter
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        if (key === " __v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        if (shallow) {
            return res;
        }
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        if (!isReadonly) {
            track(target, key);
        }
        return res;
    };
}
// 抽出setter
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        trigger(target, key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`key: ${key} set 失败 因为target是 readonly`);
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

function reactive(raw) {
    return createReactiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createReactiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadonlyHandlers);
}
function createReactiveObject(raw, baseHandlers) {
    if (!isObject(raw)) {
        console.warn(`target ${raw} 必须是一个对象`);
        return raw;
    }
    return new Proxy(raw, baseHandlers);
}

function emit(instance, event, ...arg) {
    console.log('emit => ' + event);
    // TPP开发技巧
    // 先去写一个特定的行为，再去重构成一个通用的行为
    // add => Add
    // 拿到props属性
    const { props } = instance;
    const handlerName = toHandlerKey(camelize(event));
    // 去属性里面找到对应的方法名称
    const handler = props[handlerName];
    handler && handler(...arg);
}

function initSlot(instance, children) {
    // 简单渲染
    // 支持单个vnode节点 或者数组vnode
    // instance.slots = Array.isArray(children) ? children : [children]
    // 具名插槽 带name的slot 对应位置
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        // slot
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        this._rawValue = value;
        this._value = convert(value);
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newVal) {
        if (hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal;
            this._value = convert(newVal);
            triggerEffects(this.dep);
        }
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffect(ref.dep);
    }
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(ref) {
    return !!ref.__v_isRef;
}
function unRef(ref) {
    // 是不是ref对象  => ref.value
    return isRef(ref) ? ref.value : ref;
}
// 使用的时候 不需要 .value 取值
function proxyRefs(objectWithRef) {
    return new Proxy(objectWithRef, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                return Reflect.set(target, key, value);
            }
        },
    });
}

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        next: null,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        subTree: {},
        isMounted: false,
        emit: () => { },
    };
    // 默认给emit 先填充一个参数 后面使用就只需要 emit('xxx')
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    initSlot(instance, instance.vnode.children);
    // 初始化一个有状态的component
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    // ctx 绑定上下文 将来要用
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
        setCurrentInstance(instance);
        // function object
        // props 只读 传入配置项 emit......
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // function Object
    // 存储 setup 中的返回值
    if (typeof setupResult === 'object') {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    // 存在template
    if (compiler && !Component.render) {
        if (Component.template) {
            Component.render = compiler(Component.template);
        }
    }
    // 没有template
    instance.render = Component.render;
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
}

function provide(key, value) {
    // 存
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent.provides;
        // init 初始化只执行一次 原型链赋值 向上查找
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    // 取
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // 先转换 vnode
                // 所需所有的操作 都会基于 vnode 做处理
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    // 有不同的props才需要更新
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

const queue = [];
let p = Promise.resolve();
let isFlushPending = false;
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function queueFlush() {
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flushJob);
    // Promise.resolve().then(() => {
    //   flushJob()
    // })
}
function flushJob() {
    isFlushPending = false;
    let job;
    while ((job = queue.shift())) {
        job && job();
    }
}

// 自定义渲染函数
function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
    function render(vnode, container) {
        // patch 初始没有parent
        patch(null, vnode, container, null, null);
    }
    // n1:老的
    // n2:新的
    function patch(n1, n2, container, parentComponent, anchor) {
        // 区分类型
        const { type, shapeFlag } = n2;
        // fragment -> 只渲染children
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                // 查找确认类型 用 &
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    // 处理文本
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    // 处理占位符
    function processFragment(n1, n2, conrainer, parentComponent, anchor) {
        // fragment 只渲染子节点
        mountChildren(n2.children, conrainer, parentComponent, anchor);
    }
    // 处理元素
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        // console.log(n1)
        // console.log(n2)
        const oldProps = n1.props || EMPTY_OBJECT;
        const newProps = n2.props || EMPTY_OBJECT;
        // n2一开始是没有el的，这里先复用n1的
        const el = (n2.el = n1.el);
        patchProps(el, oldProps, newProps);
        patchChildren(n1, n2, el, parentComponent, anchor);
    }
    // 比对属性
    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            // 遍历新的 添加 覆盖
            for (const key in newProps) {
                const prevProp = oldProps[key];
                const nextProp = newProps[key];
                if (prevProp !== nextProp) {
                    hostPatchProp(el, key, prevProp, nextProp);
                }
            }
            if (oldProps !== EMPTY_OBJECT) {
                // 遍历老的 删除不存在的
                for (const key in oldProps) {
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    // 比对子节点
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const prevShapeFlag = n1.shapeFlag;
        const shapeFlag = n2.shapeFlag;
        const c1 = n1.children;
        const c2 = n2.children;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                // 新的是文本 老的数组
                // 1. 把老的 Children 清空
                unmountChildren(n1.children);
                // 2. 设置 text
                hostSetElementText(container, c2);
            }
            else {
                // 新老都是文本
                if (c1 !== c2) {
                    hostSetElementText(container, c2);
                }
            }
        }
        else {
            // 新的是数组 老的是文本
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                // 清空文本
                hostSetElementText(container, '');
                // 挂载子节点
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                // 新老都是数组
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        const l2 = c2.length;
        // 三个重要的索引
        let i = 0;
        let e1 = c1.length - 1;
        let e2 = l2 - 1;
        // 1. 从头至尾
        while (i <= e1 && 1 <= e2) {
            const n1 = c1[i] || {};
            const n2 = c2[i] || {};
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        // 2. 从尾至头
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        //3. 新的比老的多
        // 老的走完了 新的没走完 创建节点
        if (i > e1) {
            if (i <= e2) {
                const nextPos = e2 + 1;
                // 判断是左侧添加还是右侧添加
                // 左侧添加到尾部 右侧添加到下一个节点的前面
                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            //新的走完了 老的没走完 删除
            while (i <= e1) {
                console.log(c1[i]);
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            // 中间部分 乱序比对
            let s1 = i;
            let s2 = i;
            const toBePatched = e2 - s2 + 1; //要被处理的数量
            let patched = 0; //已经被处理的
            // 使用新的节点：生成 key => index 映射
            const keyToNewIndexMap = new Map();
            let moved = false;
            let maxNewIndexSoFar = 0;
            const newIndexToOldIndexMap = new Array(toBePatched);
            for (let i = 0; i < toBePatched; i++)
                newIndexToOldIndexMap[i] = 0;
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            // 遍历老的 去查找新的
            let newIndex;
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                //5.1.1优化点
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                if (prevChild.key != null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    // 没有Key
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                // undefined 就是在新的里面没有找到
                if (newIndex === undefined) {
                    hostRemove(prevChild.el);
                }
                else {
                    // 判断是否移动了
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        // 移动了： 新的节点索引 < 上次的索引
                        moved = true;
                    }
                    // 避免i=0 所以+1（0表示未被处理过，需要新增的）
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            // 获取最长递增子序列对应的索引
            // 优化：只有真的移动了才去做计算 节约性能
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : [];
            let j = increasingNewIndexSequence.length - 1;
            for (let i = toBePatched - 1; i >= 0; i--) {
                // 找在新节点里面对应的索引
                const nextIndex = i + s2;
                // 获取新节点元素
                const nextChild = c2[nextIndex];
                // 找锚点 看下一个元素是否存在
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
                if (newIndexToOldIndexMap[i] === 0) {
                    // 需要新增的节点
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    if (i !== increasingNewIndexSequence[j]) {
                        // 移动位置
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            hostRemove(el);
        }
    }
    // 处理组件
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    // 更新组件
    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2; //保存下次要更新的虚拟节点
            instance.update();
        }
        else {
            n2.component = n1.component;
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    // 挂载元素
    function mountElement(vnode, container, parentComponent, anchor) {
        // 获取 el 存 el
        const el = (vnode.el = hostCreateElement(vnode.type));
        // string | array
        const { children, shapeFlag } = vnode;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // text_children
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            // array_children
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        // props
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
        // container.append(el)
        hostInsert(el, container, anchor);
    }
    // 挂载子节点 初始化
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    // 挂载组件
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        // 创建组件实例
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        setupComponent(instance);
        // 调用render
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        instance.update = effect(() => {
            // 初始化
            if (!instance.isMounted) {
                // 取出上下文
                const { proxy } = instance;
                // 给render绑定上下文
                // 存住subTree下次对比
                const subTree = (instance.subTree = instance.render.call(proxy, proxy));
                patch(null, subTree, container, instance, anchor);
                // 所有的element初始化完成后
                // 根的el 赋值给组件
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // 更新
                const { proxy, next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    // 更新当前组件实例上的属性
                    updateComponentPreRender(instance, next);
                }
                const subTree = instance.render.call(proxy, proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                queueJobs(instance.update);
            },
        });
    }
    function updateComponentPreRender(instance, nextVNode) {
        instance.vnode = nextVNode;
        instance.next = null;
        instance.props = nextVNode.props;
    }
    // 获取最长递增子序列
    function getSequence(arr) {
        const p = arr.slice();
        const result = [0];
        let i, j, u, v, c;
        const len = arr.length;
        for (i = 0; i < len; i++) {
            const arrI = arr[i];
            if (arrI !== 0) {
                j = result[result.length - 1];
                if (arr[j] < arrI) {
                    p[i] = j;
                    result.push(i);
                    continue;
                }
                u = 0;
                v = result.length - 1;
                while (u < v) {
                    c = (u + v) >> 1;
                    if (arr[result[c]] < arrI) {
                        u = c + 1;
                    }
                    else {
                        v = c;
                    }
                }
                if (arrI < arr[result[u]]) {
                    if (u > 0) {
                        p[i] = result[u - 1];
                    }
                    result[u] = i;
                }
            }
        }
        u = result.length;
        v = result[u - 1];
        while (u-- > 0) {
            result[u] = v;
            v = p[v];
        }
        return result;
    }
    return {
        createApp: createAppAPI(render),
    };
}

const EMPTY_OBJECT = {};
function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else if (nextVal === undefined || nextVal === null) {
        el.removeAttribute(key);
    }
    else {
        el.setAttribute(key, nextVal);
    }
}
function insert(child, parent, anchor = null) {
    parent.insertBefore(child, anchor);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    EMPTY_OBJECT: EMPTY_OBJECT,
    createApp: createApp,
    h: h,
    renderSlots: renderSlots,
    createTextVNode: createTextVNode,
    createElementVNode: createVNode,
    getCurrentInstance: getCurrentInstance,
    registerRuntimeCompiler: registerRuntimeCompiler,
    provide: provide,
    inject: inject,
    createRenderer: createRenderer,
    nextTick: nextTick,
    toDisplayString: toDisplayString,
    reactive: reactive,
    ref: ref,
    proxyRefs: proxyRefs
});

function baseParse(content) {
    const context = createParserContext(content);
    return createRoot(parseChildren(context, []));
}
function parseChildren(context, ancestors) {
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        if (s.startsWith('{{')) {
            // 处理插值
            node = parseInterpolation(context);
        }
        else if (s[0] === '<') {
            // 解析元素
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors);
            }
        }
        // 没有值 当成文本处理
        if (!node) {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
// 是否终止
function isEnd(context, ancestors) {
    const s = context.source;
    // </div>
    if (s.startsWith('</')) {
        // 从后往前查找对应的相同的tag
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startsWithEndTagOpen(s, tag)) {
                return true;
            }
        }
    }
    // // 2. 遇到结束标签 同时只剩下闭合标签了
    // if (parentTag && s.startsWith(`</${parentTag}>`)) {
    //   console.log('--------------------isover')
    //   return true
    // }
    // // 1. source有值
    return !s;
}
// 解析插值表达式
function parseInterpolation(context) {
    //{{message}}
    const openDelimiter = '{{';
    const closeDelimiter = '}}';
    // {{message}} 查找 }} 从索引为2的地方开始，也就是排除了前面的 {{，算是优化，结果与不加2一样
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    // 剔除前面的 {{
    advanceBy(context, openDelimiter.length);
    // 计算内容长度
    const rawContentLength = closeIndex - openDelimiter.length;
    // 获取内容
    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim();
    // 处理完删除 尾部的 }}
    advanceBy(context, closeDelimiter.length);
    return {
        type: 0 /* NodeTypes.INTERPOLATION */,
        content: {
            type: 1 /* NodeTypes.SIMPLE_EXPRESSION */,
            content: content,
        },
    };
}
function createParserContext(content) {
    return {
        source: content,
    };
}
function createRoot(children) {
    return {
        children,
        type: 4 /* NodeTypes.ROOT */,
    };
}
// 切割
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
function parseTextData(context, length) {
    const content = context.source.slice(0, length);
    advanceBy(context, length);
    return content;
}
// 解析element
function parseElement(context, ancestors) {
    // 解析开始标签
    const element = parseTag(context, 0 /* TagType.Start */);
    // 入栈
    ancestors.push(element);
    // 处理孩子
    element.children = parseChildren(context, ancestors);
    // 处理完出栈
    ancestors.pop();
    // 解析结束标签 标签相互匹配才处理
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, 1 /* TagType.End */);
    }
    else {
        throw new Error(`缺少结束标签:${element.tag}`);
    }
    return element;
}
function startsWithEndTagOpen(source, tag) {
    return (source.startsWith('</') &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase());
}
// 解析标签
function parseTag(context, type) {
    // <div></div>
    // 匹配开始或者结束标签
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    const tag = match[1];
    // 删除 <div
    advanceBy(context, match[0].length);
    // 删除 >
    advanceBy(context, 1);
    if (type === 1 /* TagType.End */)
        return;
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
    };
}
// 解析文本
function parseText(context) {
    let endIndex = context.source.length;
    let endTokens = ['{{', '<'];
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index !== -1 && endIndex > index) {
            // 碰到文本中的 插值就结束
            endIndex = index;
        }
    }
    // 获取内容
    const content = parseTextData(context, endIndex);
    return {
        type: 3 /* NodeTypes.TEXT */,
        content,
    };
}

function transformExpression(node) {
    if (node.type === 0 /* NodeTypes.INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

const TO_DISPLAY_STRING = Symbol('toDisplayString');
const CREATE_ELEMENT_VNODE = Symbol('createElementVNode');
const helperMapName = {
    [TO_DISPLAY_STRING]: 'toDisplayString',
    [CREATE_ELEMENT_VNODE]: 'createElementVNode',
};

function transformElement(node, context) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            context.helper(CREATE_ELEMENT_VNODE);
            // 中间处理层
            // tag
            const vnodeTag = `'${node.tag}'`;
            // props
            let vnodeProps;
            //children
            const children = node.children;
            let vnodeChildren = children[0];
            const vnodeElement = {
                type: 2 /* NodeTypes.ELEMENT */,
                tag: vnodeTag,
                props: vnodeProps,
                children: vnodeChildren,
            };
            node.codegenNode = vnodeElement;
        };
    }
}

function isText(node) {
    return node.type === 3 /* NodeTypes.TEXT */ || node.type === 0 /* NodeTypes.INTERPOLATION */;
}

// 复合表达式类型
function transformText(node) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            const { children } = node;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5 /* NodeTypes.COMPOUND_EXPRESSION */,
                                    children: [child],
                                };
                            }
                            currentContainer.children.push(' + ');
                            currentContainer.children.push(next);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
    const functionName = 'render';
    const args = ['_ctx', '_cache'];
    const signature = args.join(', ');
    push(`function ${functionName}(${signature}){`);
    push(`return `);
    genNode(ast.codegenNode, context);
    push('}');
    return {
        code: context.code,
    };
}
// 生成前置导入
function genFunctionPreamble(ast, context) {
    const { push } = context;
    const VueBinging = 'Vue';
    const aliasHelper = (s) => `${helperMapName[s]}:_${helperMapName[s]}`;
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging}`);
    }
    push('\n');
    push('return ');
}
// 生成node
function genNode(node, context) {
    switch (node.type) {
        case 3 /* NodeTypes.TEXT */:
            genText(node, context);
            break;
        case 0 /* NodeTypes.INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 1 /* NodeTypes.SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 2 /* NodeTypes.ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* NodeTypes.COMPOUND_EXPRESSION */:
            genCompoundExpression(node, context);
            break;
    }
}
// 生成复合类型
function genCompoundExpression(node, context) {
    const { push } = context;
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
// 生成元素
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([tag, props, children]), context);
    // genNode(children, context)
    push(')');
}
// 生成文本
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}
// 生成插值
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(` ${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(')');
}
// 生成简单表达式
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}
// 创建上下文
function createCodegenContext() {
    const context = {
        code: '',
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        },
    };
    return context;
}
function genNullable(args) {
    return args.map((arg) => arg || 'null');
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(', ');
        }
    }
}

function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    // 1. 深度优先搜索
    tranverseNode(root, context);
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}
function createRootCodegen(root) {
    const child = root.children[0];
    if (child.type === 2 /* NodeTypes.ELEMENT */) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = root.children[0];
    }
}
function tranverseNode(node, context) {
    const children = node.children;
    // 执行外部的插件逻辑
    const nodeTransforms = context.nodeTransforms;
    const exitFns = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context);
        if (onExit)
            exitFns.push(onExit);
    }
    // 处理不同的节点 加工具方法
    switch (node.type) {
        case 0 /* NodeTypes.INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 4 /* NodeTypes.ROOT */:
        case 2 /* NodeTypes.ELEMENT */:
            // 处理孩子
            tranverseChildren(children, context);
            break;
    }
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function tranverseChildren(children, context) {
    if (children) {
        for (let i = 0; i < children.length; i++) {
            const node = children[i];
            tranverseNode(node, context);
        }
    }
}
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        },
    };
    return context;
}

function baseCompiler(template) {
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });
    return generate(ast);
}

function compileToFunction(template) {
    const { code } = baseCompiler(template);
    const render = new Function('Vue', code)(runtimeDom);
    return render;
}
registerRuntimeCompiler(compileToFunction);

export { EMPTY_OBJECT, createApp, createVNode as createElementVNode, createRenderer, createTextVNode, getCurrentInstance, h, inject, nextTick, provide, proxyRefs, reactive, ref, registerRuntimeCompiler, renderSlots, toDisplayString };
