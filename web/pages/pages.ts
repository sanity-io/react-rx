export const pages = [
  {id: 'home', title: 'Home', route: '/', load: () => import('./Home')},
  {id: 'examples', title: 'Examples', route: '/examples', load: () => import('./Examples/Page')},
]
