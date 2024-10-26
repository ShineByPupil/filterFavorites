# 简介

漫画资源e站，增加功能：
- [过滤已收藏画廊功能](#1-过滤已收藏画廊功能)
- [生成文件名功能](#2-生成文件名功能)

## 功能枚举

### 1、过滤已收藏

搜索主页，增加固定的按钮，用来控制已收藏画廊的显示和隐藏。
按钮状态存储在本地缓存，第二次进入页面恢复上次的状态。

_如果通过其他弹窗或标签页收藏画廊，搜索主页不会隐藏对应的画廊。只能通过刷新页面_

### 2、总是过滤

搜索主页，增加固定的按钮，用来控制总是过滤的状态。（_设置一个专门用来过滤的收藏夹_）
在收藏页面时，不再总是过滤这个收藏夹的画廊，方便移除等其他操作

### 3、快捷收藏

鼠标悬停在画廊的图片上，显示收藏按钮和额外取消收藏按钮。默认只显示修改过收藏名称的收藏夹。

### 4、生成文件名

在标题下方添加文本框，里面为生成的文件名，鼠标聚焦直接复制。文本框支持二次编辑。下载的种子文件可以直接使用该文件名。

- 特殊字符不能作为文件名，进行保护为一个空格
- 文件名优先采用**日文**，如果没有则使用**罗马文**
- 清除由[]符号包裹的，含义关键**汉化、翻訳、Chinese、無修正、DL版**
- 连续空格超过一个，转换为一个空格
- 去除首尾空格
- 文件名末尾添加**我的标签**，权重越大，位置越靠前（_隐藏的标签搜索会过滤，但进入详情页也会加入文件名_）


## 使用说明



## 安装

<a href="https://greasyfork.org/zh-CN/scripts/513527">点击此处安装</a>
