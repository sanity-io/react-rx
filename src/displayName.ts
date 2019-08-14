const getDisplayName = Component => {
  if (typeof Component === 'string') {
    return Component
  }

  if (!Component) {
    return undefined
  }

  return Component.displayName || Component.name || 'Unknown'
}

export const wrapDisplayName = (BaseComponent, wrapperName) =>
  `${wrapperName}(${getDisplayName(BaseComponent)})`
