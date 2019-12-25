const toc = require('remark-toc')
const emoji = require('remark-emoji')
const slug = require('remark-slug')

module.exports = {remarkPlugins: [[toc, {tight: true}], slug, emoji]}
