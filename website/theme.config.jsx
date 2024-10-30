import {useConfig} from 'nextra-theme-docs'

import {ReactRxLogo} from '@/components/logos/ReactRxLogo'

/**
 * @type {import('nextra-theme-docs').DocsThemeConfig}
 */
export default {
  logo: (
    <span>
      <ReactRxLogo
        size="2em"
        style={{
          paddingRight: '0.6em',
          transform: 'scale(1.8) translateY(10%)',
          transformOrigin: 'center center',
        }}
      />
      ReactRx
    </span>
  ),
  project: {
    link: 'https://github.com/sanity-io/react-rx',
  },
  head: function useHead() {
    const config = useConfig()
    const title = config.title === 'Index' ? 'ReactRx' : `${config.title} – ReactRx`
    return (
      <>
        <title>{title}</title>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
      </>
    )
  },
  docsRepositoryBase: 'https://github.com/sanity-io/react-rx/tree/current/website',
  color: {
    hue: {dark: 304, light: 339.63},
    saturation: {dark: 41, light: 68.07},
  },
  footer: {
    content: (
      <span>
        MIT {new Date().getFullYear()} ©{' '}
        <a href="https://sanity.io" target="_blank">
          Sanity
        </a>
        .
      </span>
    ),
  },
}
