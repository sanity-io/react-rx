export const EMPTY_OBJECT = {}

export function getValue<T>(value: T): T extends () => infer U ? U : T {
  return (typeof value === 'function' ? (value as () => any)() : value) as T extends () => infer U
    ? U
    : T
}
