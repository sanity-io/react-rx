export const EMPTY_OBJECT: Readonly<Record<string, never>> = Object.freeze({})

export function getValue<T>(value: T): T extends () => infer U ? U : T {
  return (typeof value === 'function' ? (value as () => any)() : value) as T extends () => infer U
    ? U
    : T
}
