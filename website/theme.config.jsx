import {useRouter} from 'next/router'

import {ReactRxLogo} from '@/components/logos/ReactRxLogo'

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
  docsRepositoryBase: 'https://github.com/sanity-io/react-rx/tree/current/website',
  useNextSeoProps() {
    const {asPath} = useRouter()
    if (asPath !== '/') {
      return {
        titleTemplate: '%s – ReactRx',
      }
    }
    return {
      title: 'ReactRx',
      titleTemplate: '%s',
    }
  },
  primaryHue: {dark: 304, light: 339.63},
  primarySaturation: {dark: 41, light: 68.07},
  footer: {
    text: (
      <span>
        MIT {new Date().getFullYear()} ©{' '}
        <a href="https://sanity.io" target="_blank">
          Sanity
        </a>
        .
      </span>
    ),
  },
  // ... other theme options
}
