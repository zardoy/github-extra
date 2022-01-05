import React from 'dom-chef'
import 'typed-query-selector'
import domLoaded from 'dom-loaded'
import githubInjection from 'github-injection'
import * as pageDetect from 'github-url-detection'
import { MUI_THEME_ICONS } from './muiThemeIcons'

const CONFIG = {
    vscodeIconSize: 19,
}

const injectStyles = () => {
    const CLASS_NAME = 'github-extra-styles'
    if (document.head.querySelector(`.${CLASS_NAME}`)) return
    const styleTag = document.head.appendChild(document.createElement('style'))
    styleTag.className = CLASS_NAME
    const css = String.raw
    styleTag.innerHTML = css`
        img.vscode-icon {
            width: ${CONFIG.vscodeIconSize}px;
            height: ${CONFIG.vscodeIconSize}px;
        }
        /* img.octicon-file-directory {
            margin-left: -5px;
        } */
        .octicon-file {
            /* margin-left: 5px; */
        }
        html[data-color-mode='dark'] a[href$='/releases'] {
            /* just playing with shadows */
            text-shadow: 0 0 10px currentColor;
        }
        html[data-color-mode="dark"] a[href="https://github.com/"]
        {
            box-shadow: 0 0 10px white;
            border-radius: 50%;
        }
        .icon-glowing {
            box-shadow: 0 0 10px currentColor;
            border-radius: 50%;
        }
        .github-extra-readme-toc {
            width: 100%;
            position: sticky;
            top: 10px;
            margin-top: 10px;
            max-height: calc(100vh - 10px);
            overflow: auto;
        }
        .github-extra-readme-toc a {
            display: block;
        }
        @media (max-width: 768px) {
            .github-extra-readme-toc {
                display: none;
            }
        }
    `
}

const fileSelector = '.repository-content .Box-row [role="rowheader"] a'

const goToBoxRow = (elem: HTMLElement) => elem.closest('div.Box-row')!

const findFile = (name: string) => {
    const elems = document.querySelectorAll(fileSelector)
    console.log(elems)
    for (const elem of elems) if (goToBoxRow(elem).querySelector('.octicon-file') && elem.innerHTML === name) return elem
    return undefined
}

const iconsToPatch = new Map<RegExp, { svg: string; colorGlow?: string }>([
    [/^readme.md$/i, { svg: MUI_THEME_ICONS.README, colorGlow: 'dodgerblue' }],
    [/^changelog.md$/i, { svg: MUI_THEME_ICONS.CHANGELOG, colorGlow: 'lime' }],
])

const patchIcons = () => {
    for (const elem of document.querySelectorAll(fileSelector) ?? [])
        for (const [regex, { svg, colorGlow }] of iconsToPatch) {
            if (regex.test(elem.innerHTML)) {
                const iconContainer = goToBoxRow(elem)?.querySelector('.octicon-file')?.closest('div')
                if (!iconContainer) continue

                const replaceIcon = () => {
                    iconContainer.innerHTML = svg
                    const newIcon = iconContainer.querySelector('svg')!
                    newIcon.classList.add(...'vscode-icon octicon octicon-file'.split(' '))
                    if (colorGlow) {
                        newIcon.classList.add('icon-glowing')
                        newIcon.style.color = colorGlow
                    }
                }

                replaceIcon()

                // wait for vscode-icons patch
                const observer = new MutationObserver(mutations => {
                    if (mutations[0]?.addedNodes) {
                        const newNode = mutations[0]?.addedNodes[0] as HTMLElement
                        if (newNode.tagName !== 'IMG') return
                        replaceIcon()
                        observer.disconnect()
                    }
                })
                observer.observe(iconContainer, {
                    childList: true,
                })
            }

            regex.lastIndex = 0
        }
}

const addFolderDelimiter = () => {
    const firstFileRow = document.querySelector('.repository-content .octicon-file')?.closest('div.Box-row')
    if (!firstFileRow) return
    firstFileRow.style.borderTop = '1px solid gray'
}

const registerNewKeybinds = () => {
    const listener = (e: KeyboardEvent) => {
        if (!document.querySelector('.repository-content .octicon-file')) return
        if (e.code === 'KeyP') {
            const pkg = findFile('package.json')
            console.log(pkg)
            pkg?.click()
        }

        if (e.code === 'KeyE') {
            findFile('index.ts')?.click()
            findFile('index.tsx')?.click()
            findFile('index.js')?.click()
        }
    }

    window.removeEventListener('keydown', listener)
    window.addEventListener('keydown', listener)
}

let hasScrolled = false
const injectReadmeToc = () => {
    hasScrolled = false
    const CLASS = 'github-extra-readme-toc'
    const oldToc = document.querySelector(`.${CLASS}`)
    if (oldToc) oldToc.remove()

    const layoutSidebar = document.querySelector('.Layout-sidebar')
    const readmeElem = document.querySelector('#readme')
    if (!layoutSidebar || !readmeElem) return
    const toc = document.createElement('div')
    toc.classList.add(CLASS)
    // toc.style.top = `${readmeElem.getBoundingClientRect().top + document.body.offsetTop}px`
    layoutSidebar.append(toc)
    const tocList = document.querySelector('[data-target="readme-toc.trigger"] div.SelectMenu-list')!
    const updateToc = () => {
        toc.innerHTML = ''
        // adding something else except <a> will break anything
        for (const elem of tocList.children as unknown as HTMLElement[])
            toc.appendChild(
                <a style={{ paddingLeft: elem.style.paddingLeft }} href={(elem as any).href}>
                    {elem.textContent}
                </a>,
            )
    }

    let prevHighlight: HTMLAnchorElement | undefined
    const observer = new MutationObserver(mutations => {
        const lastMutation: MutationRecord = mutations
            .reverse()
            .find(({ attributeName, target }) => attributeName === 'style' && (target as HTMLElement).matches('.SelectMenu-item'))!
        if (!lastMutation) return

        if (prevHighlight) prevHighlight.style.fontWeight = ''
        const linkIndex = Array.prototype.indexOf.call(tocList.children, lastMutation.target)
        const oursLink = toc.children[linkIndex] as HTMLAnchorElement
        // Avoid unecessary annoying scrolls
        if (
            prevHighlight !== oursLink &&
            document.querySelector('div#readme')!.getBoundingClientRect().top <= window.innerHeight &&
            (hasScrolled || linkIndex > 0)
        )
            //@ts-expect-error thats fine since extension is targeting chrome only
            oursLink.scrollIntoViewIfNeeded(false)

        if (linkIndex > 0) hasScrolled = true
        prevHighlight = oursLink
        oursLink.style.fontWeight = 'bold'
    })
    observer.observe(tocList, {
        attributes: true,
        subtree: true,
    })

    updateToc()
}

// const api3 = pageDetect.isEnterprise() ? `${location.origin}/api/v3/` : 'https://api.github.com/'

githubInjection(async () => {
    await domLoaded

    injectStyles()
    patchIcons()
    addFolderDelimiter()
    registerNewKeybinds()
    injectReadmeToc()
})
