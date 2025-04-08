// ==UserScript==
// @name         E站功能加强 已收藏显隐切换/黑名单/下一页预加载
// @namespace    http://tampermonkey.net/
// @version      2.7.2
// @license      GPL-3.0
// @description  漫画资源e站，增加功能：1、控制已收藏画廊显隐 2、快速添加收藏功能 3、黑名单屏蔽重复、缺页、低质量画廊 4、详情页生成文件名
// @author       ShineByPupil
// @match        *://exhentai.org/*
// @icon         https://e-hentai.org/favicon.ico
// @grant        none
// ==/UserScript==

(async function () {
  "use strict";

  // ################################# 函数类 #################################
  class MessageBox extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: "open" });

      this.message = document.createElement("div");
      this.message.className = "messageBox";

      const style = document.createElement("style");
      style.textContent = `
          .messageBox {
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

      shadow.appendChild(style);
      shadow.appendChild(this.message);
    }

    show(message, duration = 2500) {
      this.message.textContent = message;
      this.message.style.display = "block"; // 显示消息

      // 设置一定时间后自动隐藏消息
      setTimeout(() => {
        this.message.style.display = "none";
      }, duration);
    }
  }
  customElements.define("message-box", MessageBox);

  class FavoritesBtn {
    constructor() {
      this.ulNode = null;
      this.gid = null;
      this.t = null;
    }

    async init() {
      await this.initRender();
      await this.initEvent();
    }

    async initRender() {
      const div = document.createElement("div");
      const shadow = div.attachShadow({ mode: "open" });
      const ulNode = (this.ulNode = document.createElement("ul"));
      ulNode.innerHTML = `
          <li class="favdel">取消收藏</li>
          <li class="refresh">↻刷新</li>
        `;

      ulNode.prepend(...this.#getFavoriteLi());

      const style = document.createElement("style");

      let color = [
        { boderColor: "#000", backgroundColor: "rgba(0, 0, 0, .5)" },
        { boderColor: "#f00", backgroundColor: "rgba(240, 0, 0, .5)" },
        { boderColor: "#fa0", backgroundColor: "rgba(240, 160, 0, .5)" },
        { boderColor: "#dd0", backgroundColor: "rgba(208, 208, 0, .5)" },
        { boderColor: "#080", backgroundColor: "rgba(0, 128, 0, .5)" },
        { boderColor: "#9f4", backgroundColor: "rgba(144, 240, 64, .5)" },
        { boderColor: "#4bf", backgroundColor: "rgba(64, 176, 240, .5)" },
        { boderColor: "#00f", ackgroundColor: "rgba(0, 0, 240, .5)" },
        { boderColor: "#508", backgroundColor: "rgba(80, 0, 128, .5)" },
        { boderColor: "#e8e", backgroundColor: "rgba(224, 128, 224, .5)" },
      ];

      style.textContent = `
          ul {
            margin: 0;
            padding: 0;
            display: none;
            flex-direction: column;
            position: absolute;
            z-index: 1000;
            min-width: 80px;
            max-width: 130px;
          }
          
          li {
            list-style-type: none;
            border: 1px solid;
            border-color: #4C6EF5;
            background-color: rgba(76, 110, 245, .5);
            transition: background-color 0.3s ease;
            color: #FFFFFF;
            cursor: pointer;
            padding: 1px 4px;
            margin: 2px 0;
            border-radius: 5px;
            text-align: center;
            white-space: nowrap; /* 不换行 */
            overflow: hidden; /* 隐藏溢出的内容 */
            text-overflow: ellipsis; /* 用省略号表示溢出的文本 */
            text-shadow: 1px 1px 3px #000;
          }
          li:hover {
            background-color: #4C6EF5;
          }
          ${color
            .map((n, i) => {
              return `
              .favorite${i} {
                border-color: ${n.boderColor};
                background-color: ${n.backgroundColor};
              }
              .favorite${i}:hover {
                background-color: ${n.boderColor};
              }
              `;
            })
            .join("")}
        `;

      shadow.appendChild(style);
      shadow.appendChild(ulNode);
      document.body.appendChild(div);
    }

    async initEvent() {
      // 收藏按钮事件委托
      this.ulNode.addEventListener("click", async (event) => {
        const { target } = event;
        const index = target.getAttribute("data-index");

        if (target.tagName === "LI") {
          if (target.classList.contains("favdel") && this.gid && this.t) {
            // 取消收藏
            await updateFavorites("favdel", this.gid, this.t);
            this.gid = this.t = null;
          } else if (target.classList.contains("refresh")) {
            // 刷新
            this.ulNode.style.display = "none";

            favoriteList = await getFavorites(true);

            requestAnimationFrame(() => {
              let list = this.ulNode.querySelectorAll(["li[data-index]"]) || [];

              for (let i = 0; i < list.length; i++) {
                this.ulNode.removeChild(list[i]);
              }

              this.ulNode.prepend(...this.#getFavoriteLi());
            });
          } else if (index && this.gid && this.t) {
            // 设置收藏
            await updateFavorites(index, this.gid, this.t);
            this.gid = this.t = null;
            filterBtn?.handleFilter();
            messageBox.show("收藏成功");
            favoritesBtn.hide();
          }
        }
      });

      const moveTarget =
        pageType === "main"
          ? document.querySelector(".itg")
          : pageType === "detail"
            ? document.querySelector("#gd1 div")
            : null;
      let contain = null;

      const hide = () => {
        contain = null;
        favoritesBtn.hide();
      };

      moveTarget?.addEventListener("mouseover", function (event) {
        let groups = null;

        if (pageType === "main") {
          const { target } = event;
          if (target.tagName === "IMG" && target.alt !== "T") {
            const A = target.closest("a");
            if (!A) return;

            contain = event.target.closest("div");
            groups = A.getAttribute("href").split("/");
          }
        } else if (pageType === "detail") {
          contain = event.target;
          groups = location.pathname.split("/");
        }

        if (contain && groups) {
          favoritesBtn.update(
            groups[groups.length - 3],
            groups[groups.length - 2],
          );

          const rect = contain.getBoundingClientRect();
          favoritesBtn.show(
            `${rect.left + 10 + window.scrollX}px`,
            `${rect.top + 10 + window.scrollY}px`,
          );
        }
      });

      moveTarget?.addEventListener("mouseout", function (e) {
        if (favoritesBtn.ulNode.matches(":hover")) return;
        if (pageType === "main" && e.target.tagName !== "IMG") return;
        hide();
      });
      favoritesBtn.ulNode.addEventListener("mouseleave", (e) => {
        if (contain?.matches(":hover")) return;
        hide();
      });
      window.addEventListener("blur", () => {
        hide();
      });
    }

    #getFavoriteLi() {
      const result = [];

      for (let i = 0; i < favoriteList.length; i++) {
        if (!/^Favorites \d$/.test(favoriteList[i])) {
          const favoriteLi = document.createElement("li");
          favoriteLi.innerText = favoriteList[i];
          favoriteLi.title = favoriteList[i];
          favoriteLi.classList.add(`favorite${i}`);
          favoriteLi.setAttribute("data-index", i.toString());
          result.push(favoriteLi);
        }
      }

      return result;
    }

    show(left, top) {
      this.ulNode.style.display = "flex";
      this.ulNode.style.left = left;
      this.ulNode.style.top = top;
    }

    hide() {
      this.ulNode.style.display = "none";
    }

    update(gid, t) {
      this.gid = gid;
      this.t = t;
    }
  }

  class FilterBtn {
    constructor() {
      this.isFilter = localStorage.getItem("isFilter") === "true";
      this.alwaysFilter = localStorage.getItem("alwaysFilter") || "";

      this.refreshBtn = null;
      this.toggleBtn = null;
      this.filterBtn = null;
      this.filterAllBtn = null;
      this.favoriteSup = null;
      this.filterSup = null;

      this.favoriteCount = 0;
      this.filterCount = 0;
    }

    async init() {
      this.initRender();
      this.initEvent();
      this.initObserver();
      this.handleFilter();
    }

    initRender() {
      const div = document.createElement("div");
      const shadow = div.attachShadow({ mode: "open" });

      shadow.innerHTML = `
          <div>
            <button class="refresh">↻刷新</button>
            <button class="toggle">${this.isFilter ? "点击显示" : "点击隐藏"}</button>
            <button class="filter">总是过滤</button>
            <button class="filterAll ${!this.alwaysFilter ? "disabled" : ""}">过滤全部</button>
            <sup class="favoriteCount"></sup>
            <sup class="filterCount"></sup>
          </div>
        `;

      const style = document.createElement("style");
      style.textContent = `
        div {
          position: fixed;
          gap: 6px;
          right: 15px;
          bottom: 15px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }
        
        button {
          background-color: #4C6EF5;
          color: #FFFFFF;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          padding: 4px 10px;
          text-align: center;
        }
        
        button.disabled {
          background-color: #C0C4CC;
          cursor: not-allowed;
        }
        
        sup {
          position: absolute;
          right: 0;
          transform: translateX(50%);
          background-color: #f56c6c;
          border-radius: 10px;
          padding: 0 4px;
          display: none;
          color: #FFFFFF;
        }
        
        sup.favoriteCount {
          top: 27px;
        }
          sup.filterCount {
          top: 60px;
        }
      `;

      shadow.appendChild(style);
      document.body.appendChild(div);

      this.refreshBtn = shadow.querySelector(".refresh");
      this.toggleBtn = shadow.querySelector(".toggle");
      this.filterBtn = shadow.querySelector(".filter");
      this.filterAllBtn = shadow.querySelector(".filterAll");
      this.favoriteSup = shadow.querySelector(".favoriteCount");
      this.filterSup = shadow.querySelector(".filterCount");
    }

    initEvent() {
      this.refreshBtn.addEventListener("click", () => location.reload());
      this.toggleBtn.addEventListener("click", (e) => {
        this.isFilter = !this.isFilter;
        localStorage.setItem("isFilter", this.isFilter);
        e.target.innerText = this.isFilter ? "点击显示" : "点击隐藏";
        this.handleFilter();
      });
      this.filterBtn.addEventListener("click", () => {
        const userInput = prompt("请输入总是过滤的收藏名：", this.alwaysFilter);

        if (userInput !== null) {
          this.alwaysFilter = userInput;
          localStorage.setItem("alwaysFilter", this.alwaysFilter);
          this.handleFilter();

          this.filterAllBtn.classList.toggle("disabled", !this.alwaysFilter);
        }
      });
      this.filterAllBtn.addEventListener("click", async () => {
        if (!this.alwaysFilter) {
          return messageBox.show("请先设置总是过滤");
        }

        const index = favoriteList.indexOf(this.alwaysFilter);
        if (index === -1) {
          return messageBox.show("总是过滤收藏不存在");
        }

        const list = Array.from(
          document.querySelector(".itg").querySelectorAll('div[id^="posted_"]'),
        )
          .filter((n) => n.title === "")
          .map((n) => {
            const matches = n.onclick
              .toString()
              .match(/gid=(\d+)&t=([a-z0-9]+)/);
            const [, gid, t] = matches;
            return { gid, t };
          });

        // 处理并发请求
        const enqueue = (function (activeSize = 5) {
          const activeSet = new Set();
          const waitArr = [];
          const runPromise = function (promise) {
            const p = promise().finally(() => {
              activeSet.delete(p);

              if (waitArr.length > 0) {
                runPromise(waitArr.shift());
              }
            });
            activeSet.add(p);
          };

          return function (promise) {
            return new Promise((resolve, reject) => {
              const wrappedPromise = () => {
                return promise().then(resolve).catch(reject);
              };

              if (activeSet.size >= activeSize) {
                waitArr.push(wrappedPromise);
              } else {
                runPromise(wrappedPromise);
              }
            });
          };
        })();

        await Promise.all(
          list.map(({ gid, t }) => {
            return enqueue(() => updateFavorites(index, gid, t));
          }),
        );

        messageBox.show("过滤全部成功");
      });

      window.addEventListener("storage", (e) => {
        if (e.key === "isFilter") {
          this.isFilter = e.newValue === "true";
          this.toggleBtn.innerText = this.isFilter ? "点击显示" : "点击隐藏";
          this.handleFilter();
        }
      });
    }

    initObserver() {
      const observer = new MutationObserver((mutationsList) => {
        const domSet = new WeakSet();

        for (let mutation of mutationsList) {
          if (
            /^posted_\d+$/.test(mutation.target.id) &&
            !domSet.has(mutation.target)
          ) {
            domSet.add(mutation.target);
            this.handleFilter();
          }
        }
      });

      // 开始观察目标节点
      const targetNode = document.querySelector(".itg");
      if (targetNode) {
        observer.observe(targetNode, {
          attributes: true,
          subtree: true,
        });
      }
    }

    // 更新列表视图的显隐状态（根据切换/总是过滤的规则）
    handleFilter() {
      if (window.location.pathname === "/favorites.php") return;

      this.favoriteSup.style.display = "";
      this.filterSup.style.display = "";
      this.favoriteCount = this.filterCount = 0;

      const list = document.querySelector("table.itg")
        ? document.querySelectorAll("table.itg tr")
        : document.querySelectorAll(".itg.gld .gl1t");

      [...list].forEach((n) => {
        // 收藏状态：title 收藏夹名称，若空为未收藏
        const find = n.querySelector('[id^="posted_"]');

        if (find && find.title !== "") {
          if (this.alwaysFilter === find.title) {
            n.style.display = "none";
            this.filterCount++;
          } else {
            n.style.display = this.isFilter ? "none" : "";
            this.favoriteCount++;
          }
        }
      });

      if (this.favoriteCount && this.isFilter) {
        this.favoriteSup.innerText =
          this.favoriteCount > 99 ? "99+" : this.favoriteCount;
        this.favoriteSup.style.display = "block";
      }
      if (this.filterCount) {
        this.filterSup.innerText =
          this.filterCount > 99 ? "99+" : this.filterCount;
        this.filterSup.style.display = "block";
      }
    }
  }

  // ################################# 变量类 #################################
  const pathname = window.location.pathname;
  const pageType = ["/", "/watched", "/popular"].includes(pathname)
    ? "main"
    : /^\/tag\/.*$/.test(pathname)
      ? "tag"
      : /^\/g\/\d+\/[a-z0-9]+\/$/.test(pathname)
        ? "detail"
        : pathname.includes("favorites.php")
          ? "favorites"
          : "other";

  // 【文件名去除规则】
  const keyword = [
    "Vol",
    "COMIC",
    "成年コミック",
    "C\\d+",
    "よろず",
    "FF\\d+",
    "\\d{4}年\\d{1,2}月",
    "コミック",
    "オリジナル",
    "汉化组",
    "中文",
    "汉化",
    "漢化",
    "翻訳",
    "Chinese",
    "chinese",
    "CHINESE",
    "中国語",
    "無修正",
    "DL版",
    "渣翻",
    "机翻",
    "機翻",
    "重嵌",
    "嵌字",
    "Decensored",
  ];
  const parenthesesRule = "\\([^(]*(" + keyword.join("|") + ")[^(]*\\)"; // 圆括号
  const squareBracketsRule = "\\[[^[]*(" + keyword.join("|") + ")[^[]*\\]"; // 方括号

  // 个人收藏信息
  let favoriteList = await getFavorites();
  // 收藏按钮组
  const favoritesBtn = new FavoritesBtn();
  // 过滤按钮组
  let filterBtn = null;
  await favoritesBtn.init();

  const messageBox = document.createElement("message-box");
  document.body.appendChild(messageBox);
  // 标签页广播
  const channel = initBroadcastChannel();

  // 【过滤按钮组】
  function createFilterBtn() {
    const filterBtn = new FilterBtn();
    filterBtn.init();

    return filterBtn;
  }

  // ################################# API相关 #################################

  // 获取收藏
  async function getFavorites(disableCache = false) {
    // API:获取收藏配置列表
    let favoriteList = localStorage.getItem("favoriteList");
    let result = null;

    if (favoriteList && disableCache === false) {
      result = JSON.parse(favoriteList);
    } else {
      const response = await fetch("https://exhentai.org/uconfig.php");
      const domStr = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(domStr, "text/html");

      const list = Array.from(doc.querySelectorAll("#favsel input")).map(
        (n) => n.value,
      );

      if (list.length) {
        localStorage.setItem("favoriteList", JSON.stringify(list));
        result = list;
      } else {
        throw new Error(doc.body.innerText);
      }
    }

    return result;
  }

  // 更新收藏
  async function updateFavorites(type, gid, t) {
    const formData = new FormData();
    formData.append("favcat", type);
    formData.append("favnote", "");
    formData.append("update", "1");

    // 发生请求
    const response = await fetch(
      `https://exhentai.org/gallerypopups.php?gid=${gid}&t=${t}&act=addfav`,
      { method: "POST", body: formData },
    );
    const domStr = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(domStr, "text/html");
    const script = Array.from(doc.querySelectorAll("script")).find((n) =>
      n.textContent.includes("window.close()"),
    );

    if (script) {
      let codeStr = script.textContent;
      codeStr = codeStr.replace(/window.opener.document/g, "window.document");
      codeStr = codeStr.replace(/window.close\(\);/g, "");

      const dynamicFunction = new Function(codeStr);
      dynamicFunction();

      channel?.postMessage({
        type: "updateFavorites",
        data: { type, gid, t, codeStr },
      });
    }
  }

  // 详情页 - 生成文件名
  async function formatFileName() {
    const div = document.createElement("div");
    div.style.display = "grid";
    div.style.gridTemplateColumns = "1fr auto auto";
    const shadowRoot = div.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `
      <style>
        input {
          text-align: center;
        }
        button {
          padding: 0 16px;
        }
      </style>
      
      <input>
      <button>复制</button>
    `;
    const input = shadowRoot.querySelector("input");
    const button = shadowRoot.querySelector("button");

    const rule = new RegExp(`${parenthesesRule}|${squareBracketsRule}`, "g");
    let title =
      document.querySelector("#gj").innerText ||
      document.querySelector("#gn").innerText;

    title = title
      .replace(/[［］（）]/g, (match) => {
        if (match === "［") {
          return "[";
        } else if (match === "］") {
          return "]";
        } else if (match === "（") {
          return "(";
        } else if (match === "）") {
          return ")";
        }
      })
      .replace(/[\/\\:*?"<>|]/g, " ")
      .replace(rule, "")
      .replace(/\s+/g, " ")
      .trim();

    const tagConfigMap = await fetch("https://exhentai.org/mytags")
      .then((r) => r.text())
      .then((r) => {
        const parser = new DOMParser();

        return parser.parseFromString(r, "text/html");
      })
      .then((doc) => {
        let map = new Map();
        // 没有关注和隐藏的标签（也希望显示在文件名）
        map.set("other:extraneous ads", { weight: -10 });
        map.set("other:incomplete", { weight: -11 });

        [...doc.querySelectorAll("#usertags_outer>div")].forEach((n) => {
          if (
            n.querySelector(".gt") &&
            n.querySelector("input[id^=tagwatch]")?.checked
          ) {
            map.set(n.querySelector(".gt").title, {
              weight: parseInt(n.querySelector("[id^=tagweight]").value, 10),
            });
          }
        });

        return map;
      });

    const tagDom = Array.from(document.querySelectorAll("#taglist a"));

    const formatId = (id) => id.slice(3).replace(/_/g, " ");
    let tags = [
      ...new Set(
        tagDom
          .filter((n) => tagConfigMap.has(formatId(n.id)))
          .sort(
            (n, m) =>
              tagConfigMap.get(formatId(m.id)).weight -
              tagConfigMap.get(formatId(n.id)).weight,
          )
          .map((n) => `[${n.innerText}]`),
      ),
    ].join("");

    input.value = (title + " " + tags).trim();

    button.onclick = function () {
      navigator.clipboard.writeText(input.value);
    };

    document.querySelector(".gm").appendChild(div);
  }

  // 详情页 - 快速标签查询
  function quickTagSearch() {
    const taglist = document.querySelector("#taglist");

    taglist &&
      taglist.addEventListener("mousedown", function (event) {
        if (event.button === 1 && event.target.tagName === "A") {
          const [type, tag] = event.target.title.split(":");
          event.preventDefault();

          window.open(
            `https://exhentai.org/?f_search=${type}:"${tag}$" l:chinese$&f_sto=on`,
            "_blank",
          );
        }
      });
  }

  // 详情页 - 种子下载支持鼠标中键
  function torrentDownload() {
    const div = document.querySelector(".gm #gmid #gd5");
    div &&
      div.addEventListener("mousedown", function (event) {
        if (
          event.button === 1 &&
          event.target.tagName === "A" &&
          event.target.getAttribute("href") === "#" &&
          event.target.getAttribute("onclick")
        ) {
          const match = event.target
            .getAttribute("onclick")
            .match(/popUp\('([^']+)'/);

          if (match) {
            const url = match[1];
            event.preventDefault();
            window.open(url, "_blank");
          }
        }
      });
  }

  // 标签页跨上下文通信
  function initBroadcastChannel() {
    if (typeof BroadcastChannel === "undefined") {
      return console.error("当前浏览器不支持 BroadcastChannel");
    }

    const channel = new BroadcastChannel("filterFavorites");

    channel.onmessage = function (event) {
      const { type, data } = event.data;
      if (type === "updateFavorites") {
        // 更新收藏显示
        if (pageType === "detail") {
          const groups = location.pathname.split("/");
          if (
            groups[groups.length - 3] !== data.gid ||
            groups[groups.length - 2] !== data.t
          )
            return;
        }

        const dynamicFunction = new Function(data.codeStr);
        dynamicFunction();
        // 更新过滤
        filterBtn?.handleFilter();
      }
    };

    return channel;
  }

  function prefetch() {
    // 兼容性处理：requestIdleCallback 降级方案
    const idleCallback =
      window.requestIdleCallback ||
      function (cb) {
        return setTimeout(
          () =>
            cb({
              didTimeout: false, // 模拟 idle 回调对象
              timeRemaining: () => 15, // 至少保证15ms剩余时间
            }),
          500,
        ); // 延迟500ms作为降级处理
      };

    // 在空闲时段预加载下一页图片
    idleCallback(async (deadline) => {
      try {
        // 兼容性检查：确保存在 nexturl 属性
        if (!window.nexturl) {
          return console.warn("[预加载] 没有找到 nexturl 参数");
        }

        // 获取下一页内容
        const response = await fetch(window.nexturl);
        if (!response.ok) throw new Error(`HTTP 错误 ${response.status}`);

        // 解析HTML文档
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // 提取所有非空图片地址
        const imageUrls = new Set( // 使用 Set 去重
          [...doc.querySelectorAll("img[src]")]
            .map((img) => img.src)
            .filter((src) => src.trim().length > 0),
        );

        // 创建文档片段批量插入
        const fragment = document.createDocumentFragment();
        imageUrls.forEach((url) => {
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.href = url;
          fragment.appendChild(link);
        });

        // 插入到<head>中触发预加载
        document.head.appendChild(fragment);

        console.log(`[预加载] 预加载了 ${imageUrls.size} 张图片`, imageUrls);
      } catch (error) {
        console.error("[预加载] 发生错误:", error);
        // 可在此添加错误上报逻辑
      }
    });
  }

  switch (pageType) {
    case "main":
    case "tag":
      filterBtn = createFilterBtn();
      prefetch();
      break;
    case "detail":
      await formatFileName();
      quickTagSearch();
      torrentDownload();
      break;
    case "favorites":
      prefetch();
      break;
  }
})();
