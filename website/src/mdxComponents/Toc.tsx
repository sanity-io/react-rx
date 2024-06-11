'use client'

import {clsx} from 'clsx'
import type {HeadingDepth, HeadingParent, TocItem} from 'remark-flexible-toc'

import styles from './Toc.module.css'

// toc - an array of table of contents items provided by the remark plugin "remark-flexible-toc"
// maxDepth (default: 6) — max heading depth to include in the table of contents; this is inclusive: when set to 3, level three headings are included
// indented (default: false) — whether to add indent to list items according to heading levels
// ordered (default: false) — whether to add numbering to list items as an ordered list
// tight (default: false) — whether to compile list items tightly, otherwise space is added around items
// exclude — headings to skip, wrapped in new RegExp('^(' + value + ')$', 'i'); any heading matching this expression will not be present in the table of contents
// skipLevels (default: [1]) — disallowed heading levels, by default the article h1 is not expected to be in the TOC
// skipParents — disallow headings to be children of certain node types,(if the parent is "root", it is not skipped)
type Props = {
  toc: TocItem[]
  maxDepth?: HeadingDepth
  indented?: boolean
  ordered?: boolean
  tight?: boolean
  exclude?: string | string[]
  skipLevels?: HeadingDepth[]
  skipParents?: Exclude<HeadingParent, 'root'>[]
}

const Toc = ({
  toc,
  maxDepth = 6,
  ordered = false,
  indented = false,
  tight = false,
  exclude,
  skipLevels = [1],
  skipParents = [],
}: Props) => {
  if (!toc) return null

  // ********* filters **************
  const exludeRegexFilter = exclude
    ? Array.isArray(exclude)
      ? new RegExp(exclude.join('|'), 'i')
      : new RegExp(exclude, 'i')
    : new RegExp('(?!.*)')

  const skipLevelsFilter = (depth: TocItem['depth']): boolean => skipLevels.includes(depth)

  const skipParentsFilter = (parent: TocItem['parent']): boolean =>
    parent !== 'root' && skipParents.includes(parent)

  const maxDepthFilter = (depth: TocItem['depth']): boolean => depth > maxDepth
  // ********************************

  const filteredToc = toc.filter(
    (heading) =>
      !maxDepthFilter(heading.depth) &&
      !skipLevelsFilter(heading.depth) &&
      !skipParentsFilter(heading.parent) &&
      !exludeRegexFilter.test(heading.value),
  )

  return (
    <details
      className={styles['toc-container']}
      onClick={(e) => {
        e.currentTarget.classList.toggle(styles.close)
      }}
      open
    >
      <summary className={styles['toc-title']}>
        <strong>VERY SIMPLE TABLE OF CONTENTS</strong>
      </summary>
      <ul className={styles['toc-list']}>
        {filteredToc.map((heading) => (
          <li
            key={heading.value}
            className={clsx(
              indented && styles[`h${heading.depth}indent`],
              tight && styles['tight'],
            )}
          >
            <a href={heading.href}>
              <div className={`h${heading.depth}`}>
                {ordered ? (
                  <span className={styles['numbering']}>
                    {heading.numbering.slice(1).join('.')}.
                  </span>
                ) : null}
                <span className={styles['heading']}>{heading.value}</span>
                <span className={styles['href']}>{heading.href}</span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}

export default Toc
