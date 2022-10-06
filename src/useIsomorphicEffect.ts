import {useEffect, useLayoutEffect} from 'react'

/**
 * @deprecated it's better to `useEffect`
 */
export const useIsomorphicEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
