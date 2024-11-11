// ==UserScript==
// @name         E站过滤已收藏
// @namespace    http://tampermonkey.net/
// @version      1.4.1
// @license      GPL-3.0
// @description  漫画资源e站，增加功能：1、过滤已收藏画廊功能 2、生成文件名功能
// @author       ShineByPupil
// @match        *://exhentai.org/*
// @icon data:image/png;base64,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
// @grant        none
// ==/UserScript==

(async function () {
    'use strict';

    // 【文件名去除规则】
    const parenthesesRule = '\\([^(]*(' +
        ['Vol', 'COMIC', '成年コミック', 'C\\d+', 'よろず', 'FF\\d+', '\\d{4}年\\d{1,2}月', 'Chinese', '机翻', 'コミック', '汉化组'].join('|') +
        ')[^(]*\\)'; // 圆括号
    const squareBracketsRule = '\\[[^[]*(' +
        ['汉化', '漢化', '翻訳', 'Chinese', 'chinese', 'CHINESE', '無修正', 'DL版', '中国語', '中文', '渣翻', '机翻', '機翻'].join('|') +
        ')[^[]*\\]'; // 方括号
    let isFilter = localStorage.getItem('isFilter') === 'true';
    let alwaysFilter = localStorage.getItem('alwaysFilter') || '';
    let favoriteList = await getFavorites(); // 收藏设置

    const utils = {
        messageBox: null,
        /**
         * 在屏幕上显示指定时间长度的消息。
         *
         * @param {string} message - 要显示的消息。
         * @param {number} [duration=2500] - 消息应显示的毫秒数。默认为2500毫秒。
         * @return {void} 此函数不返回值。
         */
        showMessage: function (message, duration = 2500) {
            if (!this.messageBox) {
                // 创建一个 Shadow Root
                this.createShadowMessageBox();
            }

            this.messageBox.textContent = message;
            this.messageBox.style.display = 'block'; // 显示消息

            // 设置一定时间后自动隐藏消息
            setTimeout(() => {
                this.messageBox.style.display = 'none';
            }, duration);
        },
        /**
         * 从提供的模板字符串创建一个新的 DOM 节点。
         *
         * @param {string} template - 要创建节点的 HTML 模板字符串。
         * @return {Node} 新创建的 DOM 节点。
         */
        createNode: function (template) {
            const div = document.createElement('div');
            div.innerHTML = template.trim();
            return div.firstChild;
        },
        /**
         * 创建一个带有 Shadow DOM 的消息框。
         *
         * @return {void}
         */
        createShadowMessageBox: function () {
            const container = document.createElement('div');
            const shadowRoot = container.attachShadow({mode: 'open'});

            // 创建消息框的样式，使用明亮的配色
            const style = document.createElement('style');
            style.textContent = `
            #messageBox {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #ffffff; /* 明亮的背景色 */
                color: #000000; /* 深色文本 */
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 1000;
                display: none; /* 初始隐藏 */
                transition: opacity 0.3s ease;
                opacity: 1;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2); /* 添加阴影效果 */
            }
        `;

            // 创建消息框节点
            const messageBox = document.createElement('div');
            messageBox.id = 'messageBox';

            // 将样式和消息框添加到 Shadow DOM
            shadowRoot.appendChild(style);
            shadowRoot.appendChild(messageBox);

            // 将包含 Shadow DOM 的容器添加到文档中
            document.body.appendChild(container);

            // 保存对消息框的引用
            this.messageBox = messageBox;
        },
    };

    // 根据 URL 执行不同的代码
    if (['/', '/watched', '/popular'].includes(window.location.pathname)) {
        // 主页
        filterFavorites();
        setFavorites();
    } else if (window.location.pathname === '/favorites.php') {
        setFavorites();
    } else if (/^\/g\/\d+\/[a-z0-9]+\/$/.test(window.location.pathname)) {
        // 详情页
        formatFileName();
        setFavorites();
    } else if (/^\/tag\/.*$/.test(window.location.pathname)) {
        filterFavorites();
        setFavorites();
    }

    // 右下角按钮组：收藏显隐、总是过滤、过滤全部
    function filterFavorites() {
        const div = document.createElement('div');
        const refreshBtn = document.createElement('button');
        refreshBtn.innerText = '↻刷新';
        refreshBtn.addEventListener('click', function () {
            location.reload();
        });
        const toggleBtn = document.createElement('button');
        toggleBtn.innerText = isFilter ? '点击显示' : '点击隐藏';
        toggleBtn.addEventListener('click', function () {
            isFilter = !isFilter;
            localStorage.setItem('isFilter', isFilter);
            toggleBtn.innerText = isFilter ? '点击显示' : '点击隐藏';

            handleFilter();
        });
        const filterBtn = document.createElement('button');
        filterBtn.innerText = '总是过滤';
        filterBtn.addEventListener('click', function () {
            const userInput = prompt("请输入总是过滤的收藏名：", alwaysFilter);

            if (userInput !== null) {
                alwaysFilter = userInput;
                localStorage.setItem('alwaysFilter', alwaysFilter);
                handleFilter();
            }

        });
        const filterAllBtn = document.createElement('button');
        filterAllBtn.innerText = '过滤全部';
        filterAllBtn.addEventListener('click', async function () {
            if (!alwaysFilter) {
                return utils.showMessage('请先设置总是过滤');
            }

            const index = favoriteList.indexOf(alwaysFilter);
            if (index !== -1) {
                const list = Array.from(
                    document
                        .querySelector('.itg')
                        .querySelectorAll('div[id^="posted_"]')
                )
                    .filter(n => n.title === '')
                    .map(n => {
                        const matches = n.onclick.toString().match(/gid=(\d+)&t=([a-z0-9]+)/);
                        const [,gid,t] = matches;
                        return { gid, t };
                    })

                await Promise.all(
                    list.map(({ gid, t }) => {
                        return updateFavorites(index, gid, t);
                    })
                )

                utils.showMessage('过滤全部成功');
            }
        });

        const divStyle = {
            position: 'fixed', // 绝对定位
            right: '10px', // 距离左边10像素
            bottom: '10px', // 距离顶部10像素
            zIndex: '1000', // 确保按钮在其他元素之上
            display: 'flex',
            flexDirection: 'column',
        }
        const btnStyle = {
            backgroundColor: '#007BFF', // 按钮背景颜色
            color: '#FFFFFF', // 按钮文字颜色
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            padding: '4px 10px',
            marginBottom: '10px',
        };

        for (let key in divStyle) {
            div.style[key] = divStyle[key];
        }
        for (let key in btnStyle) {
            refreshBtn.style[key] = btnStyle[key];
            toggleBtn.style[key] = btnStyle[key];
            filterBtn.style[key] = btnStyle[key];
            filterAllBtn.style[key] = btnStyle[key];
        }

        // 添加按钮到页面
        div.appendChild(refreshBtn);
        div.appendChild(toggleBtn);
        div.appendChild(filterBtn);
        div.appendChild(filterAllBtn);
        document.body.appendChild(div);
        handleFilter();

        const observer = new MutationObserver(mutationsList => {
            const domSet = new WeakSet();

            for (let mutation of mutationsList) {
                if (/^posted_\d+$/.test(mutation.target.id) && !domSet.has(mutation.target)) {
                    domSet.add(mutation.target);
                    handleFilter();
                }
            }
        })

        // 开始观察目标节点
        const targetNode = document.querySelector('.itg');
        if (targetNode) {
            observer.observe(targetNode, {
                attributes: true,
                subtree: true
            });
        }
    }

    // 开始过滤
    function handleFilter() {
        const list = document.querySelector('table.itg')
            ? document.querySelectorAll('table.itg tr')
            : document.querySelectorAll('.itg.gld .gl1t');

        [...list].forEach(n => {
            const find = n.querySelector('[id^="posted_"]')

            if (find && find.title !== '') {
                if (alwaysFilter === find.title) {
                    n.style.display = 'none';
                } else {
                    n.style.display = isFilter ? 'none' : '';
                }
            }
        });
    }

    // 生成文件名成
    async function formatFileName() {
        const rule = new RegExp(`${parenthesesRule}|${squareBracketsRule}`, 'g');
        let title = document.querySelector('#gj').innerText || document.querySelector('#gn').innerText;

        title = title
            .replace(/[［］（）]/g, match => {
                if (match === '［') {
                    return '[';
                } else if (match === '］') {
                    return ']';
                } else if (match === '（') {
                    return '('
                } else if (match === '）') {
                    return ')'
                }
            })
            .replace(/[\/\\:*?"<>|]/g, ' ')
            .replace(rule, '')
            .replace(/\s+/g, ' ')
            .trim();

        const tagConfigMap = await fetch('https://exhentai.org/mytags')
            .then(r => r.text())
            .then(r => {
                const parser = new DOMParser();

                return parser.parseFromString(r, 'text/html');
            })
            .then(doc => {
                let map = new Map();
                // 没有关注和隐藏的标签（也希望显示在文件名）
                map.set('other:extraneous ads', { weight: 10 });

                [...doc.querySelectorAll('#usertags_outer>div')].forEach(n => {
                    if (n.querySelector('.gt') && n.querySelector('input[id^=tagwatch]')?.checked) {
                        map.set(
                            n.querySelector('.gt').title,
                            { weight: parseInt(n.querySelector('[id^=tagweight]').value, 10) }
                        );
                    }
                });

                return map;
            });

        const tagDom = Array.from(document.querySelectorAll('#taglist a'));

        const formatId = id => id.slice(3).replace(/_/g, ' ');
        let tags = [...new Set(
            tagDom.filter(n => tagConfigMap.has(formatId(n.id)))
                .sort((n, m) => tagConfigMap.get(formatId(m.id)).weight - tagConfigMap.get(formatId(n.id)).weight)
                .map(n => `[${n.innerText}]`)
        )].join('');

        const input = document.createElement('input');
        input.style.width = '100%';
        input.style.textAlign = 'center';
        input.value = (title + ' ' + tags).trim();

        const button = document.createElement('button');
        button.onclick = function () {
            navigator.clipboard.writeText(input.value);
        }
        button.innerText = '复制';

        document.querySelector('#gd2').appendChild(input);
        document.querySelector('#gd2').appendChild(button);
    }

    // 快速收藏按钮组（鼠标悬停画廊封面）
    async function setFavorites() {
        const ulStyle = {
            margin: '0',
            padding: '0',
            display: 'none',
            flexDirection: 'column',
            position: 'absolute',
            zIndex: '1000',
        }
        const liStyle = {
            listStyleType: 'none',
            backgroundColor: '#007BFF',
            color: '#FFFFFF',
            cursor: 'pointer',
            padding: '2px 4px',
            margin: '2px 0',
            borderRadius: '5px',
            textAlign: 'center',
        }

        let gid = null;
        let t = null;

        const ulNode = utils.createNode(`<ul></ul>`);
        const favdelLi = utils.createNode(`<li>取消收藏</li>`);
        const refreshLi = utils.createNode(`<li>↻刷新</li>`);
        const favoriteLi = await createFavoriteLi();

        for (let key in ulStyle) {
            ulNode.style[key] = ulStyle[key];
        }
        for (let key in liStyle) {
            favdelLi.style[key] = liStyle[key];
            refreshLi.style[key] = liStyle[key];
        }

        ulNode.addEventListener('mouseover', function () {
            ulNode.style.display = 'flex';
        })
        ulNode.addEventListener('mouseout', function () {
            ulNode.style.display = 'none';
        });
        favdelLi.addEventListener('click', function () {
            if (gid && t) {
                updateFavorites('favdel', gid, t);
            }
        });
        refreshLi.addEventListener('click', async function () {
            ulNode.style.display = 'none';
            const favoriteLi = await createFavoriteLi(true);

            while (ulNode.children.length > 2) {
                ulNode.removeChild(ulNode.firstChild);
            }

            ulNode.insertBefore(favoriteLi, ulNode.firstChild);
            ulNode.style.display = 'flex';
        });

        ulNode.appendChild(favoriteLi);
        ulNode.appendChild(favdelLi);
        ulNode.appendChild(refreshLi);
        document.body.appendChild(ulNode);

        // 搜索主页
        const itgNode = document.querySelector('.itg');
        if (itgNode) {
            itgNode.addEventListener('mouseover', function (event) {
                const {target} = event;

                if (target.tagName === 'IMG' && target.alt !== 'T') {
                    const href = target.parentNode.href;
                    const groups = href.split('/');

                    gid = groups[groups.length - 3];
                    t = groups[groups.length - 2];

                    const rect = target.parentNode.parentNode.getBoundingClientRect();
                    ulNode.style.display = 'flex'
                    ulNode.style.left = `${rect.left + 10 + window.scrollX}px`;
                    ulNode.style.top = `${rect.top + 10 + window.scrollY}px`; // 在 li 下方显示
                }
            });
            itgNode.addEventListener('mouseout', function (e) {
                const {target} = e;

                if (target.tagName === 'IMG' && !ulNode.matches(':hover')) {
                    gid = null;
                    t = null;

                    ulNode.style.display = 'none';
                }
            });
        }

        // 详情页
        const cover = document.querySelector('#gd1 div');
        if (cover) {
            const groups = location.pathname.split('/');
            gid = groups[groups.length - 3];
            t = groups[groups.length - 2];

            cover.addEventListener('mouseover', function (event) {
                const rect = event.target.getBoundingClientRect();
                ulNode.style.display = 'flex'
                ulNode.style.left = `${rect.left + 10 + window.scrollX}px`;
                ulNode.style.top = `${rect.top + 10 + window.scrollY}px`; // 在 li 下方显示
            });
            cover.addEventListener('mouseout', function (event) {
                if (!ulNode.matches(':hover')) {
                    ulNode.style.display = 'none';
                }
            });
        }

        async function createFavoriteLi(disableCache = false) {
            const fragment = document.createDocumentFragment();
            if (disableCache) {
                favoriteList = await getFavorites(true);
            }

            favoriteList.forEach((n, index) => {
                if (!/^Favorites \d$/.test(n)) {
                    const liNode = utils.createNode(`<li>${n}</li>`);
                    liNode.addEventListener('click', async function () {
                        if (gid && t) {
                            await updateFavorites(index, gid, t);
                            handleFilter();
                            utils.showMessage('收藏成功');
                        }
                    })

                    for (let key in liStyle) {
                        liNode.style[key] = liStyle[key];
                    }

                    fragment.appendChild(liNode);
                }
            });

            return fragment;
        }
    }

    // API:获取收藏配置列表
    async function getFavorites(disableCache = false) {
        let favoriteList = localStorage.getItem('favoriteList');

        if (favoriteList && disableCache === false) {
            return JSON.parse(favoriteList);
        } else {
            const response = await fetch('https://exhentai.org/uconfig.php');
            const domStr = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(domStr, 'text/html');

            const list = Array.from(
                doc.querySelectorAll('#favsel input')
            ).map(n => n.value);

            if (list.length) {
                localStorage.setItem('favoriteList', JSON.stringify(list));
                return list;
            } else {
                throw new Error(doc.body.innerText)
            }
        }
    }

    // API:更新收藏
    async function updateFavorites(type, gid, t) {
        const formData = new FormData();
        formData.append('favcat', type);
        formData.append('favnote', '');
        formData.append('update', '1');

        const response = await fetch(
            `https://exhentai.org/gallerypopups.php?gid=${gid}&t=${t}&act=addfav`,
            {method: 'POST', body: formData});

        const domStr = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(domStr, 'text/html');
        const script = Array.from(doc.querySelectorAll('script'))
            .find(n => n.textContent.includes('window.close()'));

        if (script) {
            let codeStr = script.textContent
            codeStr = codeStr.replace(/window.opener.document/g, 'window.document');
            codeStr = codeStr.replace(/window.close\(\);/g, '');


            const dynamicFunction = new Function(codeStr);
            dynamicFunction();
        }
    }
})();
