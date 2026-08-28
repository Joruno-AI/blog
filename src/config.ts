import type { Site, Ui, Features } from './types'

export const SITE: Site = {
  website: 'https://wangshengliang.cn/',
  base: '/',
  title: 'Joruno',
  description: 'Joruno 的个人博客，记录 Web 开发、Agent 工具与编程实践。',
  author: 'Joruno Jobāna',
  lang: 'zh-Hans',
  ogLocale: 'zh_CN',
  imageDomains: ['cdn.jsdelivr.net', '*.unsplash.com', 'github.com'],
}

export const UI: Ui = {
  internalNavs: [
    {
      path: '/',
      title: 'Home',
      displayMode: 'alwaysIcon',
      icon: 'i-ri-home-4-line',
    },
    {
      path: '/blog',
      title: 'Blog',
      displayMode: 'alwaysIcon',
      icon: 'i-ri-article-line',
    },
    {
      path: '/docs',
      title: 'Docs',
      displayMode: 'alwaysIcon',
      icon: 'i-ri-book-open-line',
    },
    {
      path: '/projects',
      title: 'Projects',
      displayMode: 'alwaysIcon',
      icon: 'i-ri-code-box-line',
    },
    {
      path: '/agent',
      title: 'Agent',
      displayMode: 'alwaysIcon',
      icon: 'i-ri-shapes-line',
    },
    // {
    //   path: '/highlights',
    //   title: 'Highlights',
    //   displayMode: 'iconToTextOnMobile',
    //   text: 'Highlights',
    //   icon: 'i-ri-screenshot-line',
    // },
    {
      path: '/photos',
      title: 'Photos',
      displayMode: 'alwaysIcon',
      icon: 'i-ri-camera-ai-line',
    },
    {
      path: '/shorts',
      title: 'Shorts',
      displayMode: 'alwaysIcon',
      icon: 'i-ri-sticky-note-line',
    },
    {
      path: '/music',
      title: 'Music Player',
      displayMode: 'alwaysIcon',
      icon: 'i-ri-disc-line',
    },
    // {
    //   path: '/changelog',
    //   title: 'Changelog',
    //   displayMode: 'iconToTextOnMobile',
    //   text: 'Changelog',
    //   icon: 'i-ri-draft-line',
    // },
  ],
  socialLinks: [
    {
      link: 'https://github.com/Joruno-AI',
      title: 'GitHub Profile',
      displayMode: 'alwaysIcon',
      icon: 'i-uil-github-alt',
    },
    // {
    //   link: 'https://x.com/astrodotbuild',
    //   title: 'Astro on Twitter',
    //   displayMode: 'alwaysIcon',
    //   icon: 'i-ri-twitter-x-fill',
    // },
    // {
    //   link: 'https://bsky.app/profile/astro.build',
    //   title: 'Astro on Bluesky',
    //   displayMode: 'alwaysIcon',
    //   icon: 'i-meteor-icons-bluesky',
    // },
  ],
  navBarLayout: {
    left: [],
    right: [
      'internalNavs',
      'socialLinks',
      'hr',
      'searchButton',
      'themeButton',
      'rssLink',
    ],
    mergeOnMobile: true,
  },
  tabbedLayoutTabs: [
    { title: 'Changelog', path: '/changelog' },
    { title: 'AstroBlog', path: '/feeds' },
    { title: 'AstroStreams', path: '/streams' },
  ],
  postView: {
    postMetaStyle: 'minimal',
    useCoverAltAsCaption: true,
  },
  groupView: {
    maxGroupColumns: 3,
    showGroupItemColorOnHover: true,
  },
  githubView: {
    monorepos: [
      'withastro/astro',
      'withastro/starlight',
      'lin-stephanie/astro-loaders',
    ],
    mainLogoOverrides: [
      [/starlight/, 'https://starlight.astro.build/favicon.svg'],
    ],
    subLogoMatches: [
      [/theme/, 'i-unjs-theme-colors'],
      [/github/, 'https://github.githubassets.com/favicons/favicon.svg'],
      [/tweet/, 'i-prime-twitter'],
      [/ins/, 'i-skill-icons-instagram'],
      [/bluesky/, 'i-logos-bluesky'],
    ],
  },
  externalLink: {
    newTab: true,
    cursorType: '',
    showNewTabIcon: true,
  },
}

/**
 * Globally controls whether to enable special features:
 *  - Set to `false` or `[false, {...}]` to disable the feature.
 *  - Set to `[true, {...}]` to enable and configure the feature.
 */
export const FEATURES: Features = {
  slideEnterAnim: [true, { enterStep: 46, duration: 560, distance: 18 }],
  ogImage: [
    true,
    {
      authorOrBrand: 'Joruno',
      fallbackTitle: '技术博客',
      fallbackBgType: 'plum',
      collections: [
        { collection: 'blog', pathnamePrefix: '/blog' },
        { collection: 'changelog', pathnamePrefix: '/changelog' },
      ],
    },
  ],
  toc: [
    true,
    {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
      displayPosition: 'left',
      displayMode: 'always',
    },
  ],
  share: [
    true,
    {
      twitter: [true, ''],
      bluesky: false,
      mastodon: false,
      facebook: false,
      pinterest: false,
      reddit: false,
      telegram: false,
      whatsapp: false,
      email: false,
    },
  ],
  giscus: [
    false,
    {
      'data-repo': 'Joruno-AI/blog',
      'data-repo-id': 'R_kgDOP4yOiQ',
      'data-category': 'Announcements',
      'data-category-id': 'DIC_kwDOP4yOic4CwBgk',
      'data-mapping': 'pathname',
      'data-strict': '0',
      'data-reactions-enabled': '1',
      'data-emit-metadata': '0',
      'data-input-position': 'bottom',
      'data-lang': 'zh-CN',
    },
  ],
  search: [
    true,
    {
      includes: ['blog', 'changelog'],
      filter: true,
      navHighlight: true,
      batchLoadSize: [true, 5],
      maxItemsPerPage: [true, 3],
    },
  ],
  tag: [
    true,
    {
      displayPosition: 'right',
      displayMode: 'content',
      filterMode: 'AND',
    },
  ],
}
