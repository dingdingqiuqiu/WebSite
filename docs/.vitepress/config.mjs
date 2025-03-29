import { defineConfig } from 'vitepress'
import sidebar from './sideBarData.json'
// https://vitepress.dev/reference/site-config


export default defineConfig({
  base: '/WebSite', 
  head: [['link', { rel: 'icon', type: 'image/svg+xml',href: '../public/logo.svg' }]],
  title: "Ding01ng's site",
  description: "Ding01ng的笔记记录网站",
  cleanUrls: true, //从 URL 中删除 .html 后缀
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: {
      light: '/logo.svg',
      dark: '/logo.svg',
      alt: '网站 Logo'
    },
    nav: [
      { text: 'Home', link: '/' },
      { text: '笔记', link: '/笔记/' }
    ],
    search: {
      provider: 'local'
    },
    sidebar,
    

    socialLinks: [
      { icon: 'github', link: 'https://github.com/dingdingqiuqiu' }
    ],

    lastUpdated: {
      text: '最后一次编辑于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    }
  },
  markdown: {
    math: true,
    image: {
      lazyLoading: true
    }
  },
  lastUpdated: true //时间戳
})

