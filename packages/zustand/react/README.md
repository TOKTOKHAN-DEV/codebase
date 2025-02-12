# @codebase/zustand-react

`@codebase/zustand-react` 패키지는 `@codebase/zustand-create-store-context` 와 `@codebase/zustand-with-setter` 패키지에 있는 모든 모듈을 제공합니다.

자세한 내용과 사용법은 [Tokdocs 공식 문서](https://www.codebase.page/docs/docs/zustand/Overview)에서 확인 할 수 있습니다.

## Installation

```
npm i @codebase/zustand-react
```

## Npm packages

- [@codebase/zustand-with-setter](https://www.npmjs.com/package/@codebase/zustand-with-setter)
- [@codebase/zustand-create-store-context](https://www.npmjs.com/package/@codebase/zustand-create-store-context)

## Preview

### withSetter

`withSetter`를 사용하면 store 에 set 및 reset 함수를 추가하여, 간단한 상태변경은 함수를 따로 정의 하지 않아도 됩니다.

```ts
import { withSetter } from '@codebase/zustand-react'

import { create } from 'zustand'

type Store = {
  count: number
  nested: { count: number; list?: string[] }
}

const useStore = create(
  withSetter<Store>(() => ({
    count: 0,
    nested: { count: 0 },
  })),
)

const set = useStore((store) => store.set)

set({ count: 5 })
set('count', 5)
set('nested.count', (prev) => prev + 1)
```

### createStoreContext

zustand 의 create 와 완전히 동일한 값을 받아 context 를 생성할 수 있습니다.

```tsx
import { createStoreContext } from '@codebase/zustand-react'

type Store = {
  count: number
  setCount: (count: number) => void
}

const { Provider, useContext, withProvider } = createStoreContext<Store>(
  (set, get, store) => ({
    count: 0,
    setCount: (count: number) => set(() => ({ count })),
  }),
)
```
