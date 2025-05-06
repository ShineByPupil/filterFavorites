// ==UserScript==
// @name         E站功能加强
// @namespace    http://tampermonkey.net/
// @version      2.9.1
// @license      GPL-3.0
// @description  功能：1、已收藏显隐切换 2、快速添加收藏功能 3、黑名单屏蔽重复、缺页、低质量画廊 4、详情页生成文件名 5、下一页预加载
// @author       ShineByPupil
// @match        *://exhentai.org/*
// @match        *://e-hentai.org/*
// @icon         https://e-hentai.org/favicon.ico
// @grant        none
// ==/UserScript==

(async function () {
  "use strict";

  // 页面类型
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
  const inlineType = ["main", "tag"].includes(pageType)
    ? document.querySelector("select[onchange]")?.value
    : null;
  const commonStyle = {
    button: `
      button {
        background-color: #4C6EF5;
        color: #FFFFFF;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        padding: 4px 10px;
        text-align: center;
        outline: none;
      } 
    `,
  };
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

  // 消息提示
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
            z-index: 100;
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

  class SwitchToggle extends HTMLElement {
    static get observedAttributes() {
      return ["checked", "disabled"];
    }

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: "open" });
      shadow.innerHTML = `
        <div class="track" tabindex="0" role="switch">
          <div class="thumb"></div>
        </div>
        
        <style>
          :host {
            display: inline-block;
            aspect-ratio: 2/1;
            height: 20px;
          }
          .track {
            width: 100%;
            height: 100%;
            background: #ccc;
            border-radius: 14px;
            position: relative;
            transition: background .3s;
            cursor: pointer;
            outline: none;
          }
          .thumb {
            aspect-ratio: 1/1;
            height: calc(100% - 4px);
            background: #fff;
            border-radius: 50%;
            position: absolute;
            top: 2px;
            left: 2px;
            transition: transform .3s;
          }
          :host([checked]) .track {
            background: #4C6EF5;
          }
          :host([checked]) .thumb {
            transform: translateX(calc(100% + 4px));
          }
        </style>
       
    `;

      this.$track = shadow.querySelector(".track");
      this.$track.addEventListener("click", () => this.toggle());
      this.$track.addEventListener("keydown", (e) => {
        if ((e.key === " " || e.key === "Enter") && !this.disabled) {
          e.preventDefault();
          this.toggle();
        }
      });
    }

    connectedCallback() {
      this._upgrade("checked");
      this._upgrade("disabled");
      this.$track.tabIndex = this.disabled ? -1 : 0;
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "checked" && oldValue !== newValue) {
        this.dispatchEvent(
          new CustomEvent("change", {
            detail: { oldValue, newValue },
          }),
        );
      }
      if (name === "disabled") {
        this.$track.tabIndex = this.disabled ? -1 : 0;
      }
    }

    // 属性反射
    get checked() {
      return this.hasAttribute("checked");
    }
    set checked(val) {
      val ? this.setAttribute("checked", "") : this.removeAttribute("checked");
    }

    get disabled() {
      return this.hasAttribute("disabled");
    }
    set disabled(val) {
      val
        ? this.setAttribute("disabled", "")
        : this.removeAttribute("disabled");
    }

    // 切换方法
    toggle() {
      if (this.disabled) return;
      this.checked = !this.checked;
    }

    // 升级已有属性
    _upgrade(prop) {
      if (this.hasOwnProperty(prop)) {
        const val = this[prop];
        delete this[prop];
        this[prop] = val;
      }
    }
  }
  customElements.define("switch-toggle", SwitchToggle);

  // 快速收藏
  class FavoritesBtn {
    constructor() {
      this.ulNode = null;
      this.gid = null;
      this.t = null;

      this.init();
    }

    async init() {
      await this.initRender();
      await this.initEvent();
    }

    async initRender() {
      const div = document.createElement("div");
      div.dataset.type = "favoritesBtn";
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
            z-index: 100;
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
            messageBox.show("取消收藏成功");
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

              messageBox.show("刷新成功");
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

      const moveTarget = ["main", "favorites"].includes(pageType)
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

        if (["main", "favorites"].includes(pageType)) {
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

  // 过滤按钮
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

      this.init();
    }

    async init() {
      this.initRender();
      this.initEvent();
      this.initObserver();
      this.handleFilter();
    }

    initRender() {
      const div = document.createElement("div");
      div.dataset.type = "filterBtn";
      const shadow = div.attachShadow({ mode: "open" });

      shadow.innerHTML = `
          <div>
            <button class="configBtn">⚙️ 设置</button>
            <button class="refresh">↻ 刷新</button>
            <button class="toggle">${this.isFilter ? "点击显示" : "点击隐藏"}</button>
            <button class="filter">总是过滤</button>
            <button class="filterAll ${!this.alwaysFilter ? "disabled" : ""}">过滤全部</button>
            
            <sup class="favoriteCount"></sup>
            <sup class="filterCount"></sup>
          </div>
          
          <style>
            div {
              position: fixed;
              gap: 6px;
              right: 15px;
              bottom: 15px;
              z-index: 100;
              display: flex;
              flex-direction: column;
            }
            
            ${commonStyle.button}
            
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
              bottom: 89px;
            }
            sup.filterCount {
             bottom: 55px;
            }
          </style>
        `;

      document.body.appendChild(div);

      this.refreshBtn = shadow.querySelector(".refresh");
      this.toggleBtn = shadow.querySelector(".toggle");
      this.filterBtn = shadow.querySelector(".filter");
      this.filterAllBtn = shadow.querySelector(".filterAll");
      this.configBtn = shadow.querySelector(".configBtn");

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

        await Promise.all(
          list.map(({ gid, t }) => {
            return enqueue(() => updateFavorites(index, gid, t));
          }),
        );

        messageBox.show("过滤全部成功");
      });
      this.configBtn.addEventListener("click", () => configDialog?.show());

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

      const list =
        inlineType === "e"
          ? document.querySelectorAll("table.itg >tbody >tr")
          : inlineType === "t"
            ? document.querySelectorAll(".itg.gld .gl1t")
            : [];

      list.forEach((n) => {
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
        } else {
          n.style.display = "";
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

  class ConfigDialog {
    // 详情信息缓存
    detailInfo = new Map();
    button = null;
    isShowDetail = localStorage.getItem("isShowDetail") === "true";

    constructor() {
      this.init();
    }

    init() {
      this.initRender();
      this.initEvent();

      this.isShowDetail && this.toggleDetail(this.isShowDetail);
    }

    initRender() {
      const div = document.createElement("div");
      div.dataset.type = "configDialog";
      const shadow = div.attachShadow({ mode: "open" });
      shadow.innerHTML = `
        <div class="config">
          <div class="config__content">
            <p class="title">设置</p>
            <hr>
            <p>
              <switch-toggle
                ${this.isShowDetail ? "checked" : ""}
                class="switch__showDetail"
              ></switch-toggle>
              <span>是否显示画廊详情信息（收藏数、评分信息）</span>
            </p>
          </div>
          
          <button class="config__close">✕</button>
          <div class="config__mask"></div>
        </div>
        
        <style>
          .config {
            display: none;
            color: #fff;
            font-size: 16px;
          }
          
          .config__content {
            min-width: 500px;
            position: fixed;
            z-index: 300;
            left: 50%;
            top: 20vh;
            transform: translateX(-50%);
            padding: 20px;
          }
          .config__content .title {
            font-size: 26px;
          }
          .config__content hr {
           margin: 0 -20px;
          }
          .config__content p:not(.title) {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .config__close {
            width: 30px;
            height: 30px;
            background: transparent;
            position: fixed;
            z-index: 300;
            top: 30px;
            right: 30px;
            border: 2px solid #fff;
            border-radius: 50%;
            font-weight: bold;
            cursor: pointer;
          }
          .config__mask {
            position: fixed;
            z-index: 200;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
          }
        </style>
      `;

      this.config = shadow.querySelector(".config");
      this.closeBtn = shadow.querySelector(".config__close");
      this.switch__showDetail = shadow.querySelector(".switch__showDetail");
      document.body.appendChild(div);
    }
    initEvent() {
      const close = () => (this.config.style.display = "");
      this.closeBtn.addEventListener("click", close);
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") close();
      });
      this.switch__showDetail.addEventListener("change", (event) => {
        console.log("event:", event);
        localStorage.setItem("isShowDetail", this.switch__showDetail.checked);
        this.toggleDetail(this.switch__showDetail.checked);

        channel?.postMessage({
          type: "toggleDetail",
          data: this.switch__showDetail.checked,
        });
      });
    }
    // 打开设置
    show() {
      this.config.style.display = "block";
    }
    // 切换详情信息
    async toggleDetail(isShowDetail) {
      const getDetailInfo = async (url) => {
        if (this.detailInfo.has(url)) {
          return this.detailInfo.get(url);
        }

        const response = await fetch(url);
        const domStr = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(domStr, "text/html");

        let favcount = doc.querySelector("#favcount")?.innerText;
        favcount = favcount.match(/\d*/)[0];

        let rating_count = doc.querySelector("#rating_count")?.innerText;

        let rating_label = doc.querySelector("#rating_label")?.innerText;
        rating_label = rating_label.match(/[\d.]+/)[0];

        const info = { favcount, rating_count, rating_label };
        this.detailInfo.set(url, info);

        return info;
      };

      if (isShowDetail) {
        const list =
          inlineType === "e"
            ? document.querySelectorAll("table.itg >tbody >tr")
            : inlineType === "t"
              ? document.querySelectorAll(".itg.gld .gl1t")
              : [];
        const alwaysFilter = localStorage.getItem("alwaysFilter") || "";

        for (let i = 0, length = list.length; i < length; i++) {
          const item = list[i];
          const find = item.querySelector('[id^="posted_"]');

          if (!alwaysFilter || find?.title !== alwaysFilter) {
            const url = item
              .querySelector('a[href^="https://exhentai.org/g/"]')
              ?.getAttribute("href");

            enqueue(() => getDetailInfo(url)).then((info) => {
              const div = document.createElement("div");
              div.className = "detailInfo";
              const shadow = div.attachShadow({ mode: "open" });

              shadow.innerHTML = `
                <span>收藏数：${info.favcount}</span>
                <span>评分：${info.rating_label}(${info.rating_count})</span>
                
                <style>
                  :host {
                    display: flex;
                    justify-content: space-evenly;
                    padding-top: 10px;
                  }
                </style>
              `;
              item.querySelector(".gl3e")?.appendChild(div) ||
                item.appendChild(div);
            });
          }
        }
      } else {
        document.querySelectorAll(".detailInfo").forEach((n) => n.remove());
      }
    }
  }

  let favoriteList = await getFavorites(); // 获取收藏配置
  const favoritesBtn = new FavoritesBtn(); // 收藏按钮组
  let filterBtn = null; // 过滤按钮组
  const channel = initBroadcastChannel(); // 标签页广播
  const configDialog = new ConfigDialog();

  const messageBox = document.createElement("message-box");
  document.body.appendChild(messageBox);

  // API - 获取收藏配置
  async function getFavorites(disableCache = false) {
    let favoriteList = localStorage.getItem("favoriteList");
    let result = null;

    if (favoriteList && disableCache === false) {
      result = JSON.parse(favoriteList);
    } else {
      const response = await fetch(`${location.origin}/uconfig.php`);
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

  // API - 更新收藏
  async function updateFavorites(type, gid, t) {
    const formData = new FormData();
    formData.append("favcat", type);
    formData.append("favnote", "");
    formData.append("update", "1");

    // 发生请求
    const response = await fetch(
      `${location.origin}/gallerypopups.php?gid=${gid}&t=${t}&act=addfav`,
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

  // 生成文件名（详情页）
  async function formatFileName() {
    // 文件名去除规则
    const keyword = [
      "同人誌",
      "Vol",
      "コミティア",
      "サンクリ",
      "とら祭り",
      "COMIC", // 漫画
      "成年コミック", // 成年漫画
      "C\\d+",
      "よろず",
      "FF\\d+",
      "\\d{4}年\\d{1,2}月",
      "コミック", // 漫画
      "オリジナル", // 原创
      "ページ欠落", // 页面缺失
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
      "翻译",
      "Decensored", // 审查
      "Uncensored", // 未经审查
      "超分辨率",
      "カラー化", // 全彩
      "フルカラー版",
    ];
    const parenthesesRule = "\\([^(]*(" + keyword.join("|") + ")[^(]*\\)"; // 圆括号
    const squareBracketsRule = "\\[[^[]*(" + keyword.join("|") + ")[^[]*\\]"; // 方括号

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

    let title =
      document.querySelector("#gj").innerText ||
      document.querySelector("#gn").innerText;

    title = title
      // 统一替换全角括号为半角括号
      .replace(/[［］（）【】]/g, (match) => {
        if (match === "［" || match === "【") {
          return "[";
        } else if (match === "］" || match === "】") {
          return "]";
        } else if (match === "（") {
          return "(";
        } else if (match === "）") {
          return ")";
        }
      })
      .replace(/^(\[[^\]]+])(\S)/, "$1 $2") // 开头的[xxx]后面需要有一个空格
      .replace(/[\/\\:*?"<>|]/g, " ") // 替换文件系统非法字符为空格
      .replace(new RegExp(parenthesesRule, "g"), "") // 自定义过滤规则移除标签
      .replace(new RegExp(squareBracketsRule, "g"), "") // 自定义过滤规则移除标签
      // 处理空格
      .replace(/\(\s*/g, "(")
      .replace(/\s*\)/g, ")")
      .replace(/\[\s*/g, "[")
      .replace(/\s*]/g, "]")
      .replace(/\s+/g, " ") // 合并连续空格
      .trim(); // 去除首尾空格

    // 获取用户标签配置
    const response = await fetch(`${location.origin}/mytags`);
    const htmlText = await response.text();
    // 解析 HTML 文档
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    // 初始化标签 Map
    const tagConfigMap = new Map([
      // 额外增加标签(无需关注)
      ["other:full color", { weight: -9 }], // 全彩
      ["other:extraneous ads", { weight: -10 }], // 外部广告
      ["other:incomplete", { weight: -11 }], // 缺页
    ]);
    const tagDivs = doc.querySelectorAll("#usertags_outer > div");
    tagDivs.forEach((div) => {
      const title = div.querySelector(".gt")?.title; // 标签名元素
      const isWatch = div.querySelector("input[id^=tagwatch]").checked; // 是否关注
      const [type, value] = title?.split(":") ?? [];

      if (title && isWatch && !["artist", "group"].includes(type)) {
        const weight = parseInt(div.querySelector("[id^=tagweight]").value, 10);
        tagConfigMap.set(title, { weight }); // 设置权重
      }
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

  // 鼠标中键标签，快速查询（详情页）
  function quickTagSearch() {
    const tagList = document.querySelector("#taglist");

    tagList &&
      tagList.addEventListener("mousedown", function (event) {
        if (event.button === 1 && event.target.tagName === "A") {
          const [type, tag] = event.target.title.split(":");
          event.preventDefault();

          window.open(
            `${location.origin}/?f_search=${type}:"${tag}$" l:chinese$&f_sto=on`,
            "_blank",
          );
        }
      });
  }

  // 鼠标中键种子下载（详情页）
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

  // 广播频道 - 跨标签页通信，同步状态
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
      } else if (type === "toggleDetail") {
        // configDialog?.toggleDetail(data);
        configDialog.switch__showDetail.checked = data;
      }
    };

    return channel;
  }

  // 预获取下一页资源
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
      filterBtn = new FilterBtn();
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
