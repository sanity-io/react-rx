const getDisplayName = (Component: any) => {
  if (typeof Component === 'string') {
    return Component
  }

  return (Component && (Component.displayName || Component.name)) || 'Unknown'
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/ban-types
export const wrapDisplayName = (BaseComponent: Function, wrapperName: string) =>
  `${wrapperName}(${getDisplayName(BaseComponent)})`
