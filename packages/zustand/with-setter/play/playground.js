import { createStore } from 'zustand';
import { get, update, runIfFn } from '@codebase/universal';
import cloneDeep from 'lodash/cloneDeep.js';

/**
 * @category Middleware
 *
 * zustand 와 함께 사용할 수 있는 set 함수, reset 함수를 제공합니다.
 * 기존의 간단한 set 함수도 직접 정의를 해야하는 불편함을 해소하기 위해 만들어졌습니다.
 * zustand create, createStore 에서 middleware 로 사용할 수 있습니다.
 *
 * @example
 * ```ts
 * import { withSetter } from '@codebase/zustand-with-setter'
 *
 * import { create } from 'zustand'
 *
 * type Store = {
 *   count: number
 *   nested: {
 *     count: number
 *   }
 * }
 *
 * const useStore = create(
 *   withSetter<Store>(() => ({
 *     count: 0,
 *     nested: {
 *       count: 0,
 *     },
 *   })),
 * )
 *
 * const set = useStore((store) => store.set)
 *
 * set({ count: 5, nested: { count: 5 } })
 * set((prev) => ({ count: prev.count + 1 }))
 *
 * set('count', 5)
 * set('count', (prev) => prev + 1)
 * set('nested.count', 5)
 * set('nested.count', (prev) => prev + 1)
 *
 * const reset = useStore((store) => store.reset)
 * reset()
 * reset('count')
 * reset({ count: 5 })
 * ```
 */
const withSetter = (initializer) => (setState, getState, store) => {
    const initial = initializer(setState, getState, store);
    const setter = (keyOrState, value) => {
        if (typeof keyOrState === 'string') {
            const key = keyOrState;
            return setState(update(key, value));
        }
        const state = keyOrState;
        setState((prev) => (Object.assign(Object.assign({}, prev), runIfFn(state, prev))));
    };
    const reset = (state) => {
        const updated = cloneDeep(initial);
        if (typeof state === 'string') {
            const key = state;
            const fieldInitial = get(key, initial);
            setState(update(key, fieldInitial));
            return;
        }
        setState((() => {
            if (typeof state === 'undefined')
                return updated;
            const next = runIfFn(state, updated);
            return Object.assign(Object.assign({}, updated), next);
        }));
    };
    return Object.assign(Object.assign({}, initial), { set: setter, reset: reset });
};

const store = createStore(withSetter(() => {
    return {
        count: 0,
        nested: {
            count: 0,
        },
    };
}));
const { set, reset } = store.getState();
store.subscribe((state) => console.log(state));
set('nested.count', 1);
set({
    count: 5,
    nested: {
        count: 5,
    },
});
set((prev) => (Object.assign(Object.assign({}, prev), { count: prev.count + 1 })));
set('nested.count', 2);
set('nested.count', (prev) => prev + 1);
reset('nested.count');
