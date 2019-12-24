export const pages = [
  {id: 'home', title: 'Home', route: '/', load: () => import('./Home/Home')},
  {id: 'api', title: 'API', route: '/api', load: () => import('./Api/Page')},
  {id: 'examples', title: 'Examples', route: '/examples', load: () => import('./Examples/Page')},
]
