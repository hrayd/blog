---
title: 在线编辑器实现浅析
date: "2021-07-10T22:00:00.000Z"
description: "对富文本编辑器与代码编辑器的实现方式进行最基本的解读和分析."
---

在线编辑器根据其侧重点和实现方式的不同, 可大致分为富文本编辑器和代码编辑器两类, 本文对这两类编辑器的实现方式进行最基本的解读和分析.

# 富文本编辑器

## 基本实现原理

富文本编辑器的实现原理很简单, 其编辑区域一般使用一个 `contentedtable="true"` 的 `div` 元素来实现. 当HTML元素的 `contenteditable` 属性设为 `true` 后, 该元素的内容变为可编辑状态:

```html
<div contenteditable="true">这是一个可编辑元素</div>
```

此时即可修改元素的内容, 当点击回车键后, 会自动生成一个 `p` 或 `div` 元素.
可设置 `outline: none` 以去掉默认的聚焦态边框.

## 修改样式与内容

此时即可修改元素的内容, 当点击回车键后, 会自动生成一个 `p` 或 `div` 元素.

可设置 `outline: none` 以去掉默认的聚焦态边框.文本样式的修改主要通过调用 `document.execCommand()` 方法来实现, 此方法会影响当前处于活动状态的可编辑元素. 此方法接收三个输入参数:

- 命令名称[string], 如fontsize、backcolor、undo等, 详见MDN相关参考.
- 是否展开用户界面[boolean], 一般传入false即可.
- 命令参数[可选], 如fontSize传入字体尺寸、backColor传入color类型的string等, 默认为null.
- 返回值: boolean, 返回 false 表示命令不被支持或未启用.

示例:

```javascript
// 将当前行设为“Heading2”, 添加“h2”标签
document.execCommand("formatblock", false, "h2");
// 在插入点或选中文字部分修改字体、字号
document.execCommand("fontname", false, "Times New Roman");
document.execCommand("fontsize", false, "3");
// 撤销上一次修改
document.execCommand("undo", false);- 是否展开用户界面[boolean], 一般传入false即可.
```

## 浏览器实现差异

可编辑元素在不同浏览器及其版本之间可能存在一些差异, 如按下回车键后, IE/Opera会添加一个 `p` 标签元素, 旧版本的Firefox会添加 `br` 元素, 而Chrome/Safari会添加 `div` 元素. 通过调用 `document.execCommand("defaultParagraphSeparator", false, "div")` 可显式指定创建新段落的方式, 此方法也支持使用自定义标签, 如语雀的编辑器就使用了以 `ne` 开头的一系列自定义标签.

文末提供了MDN中展示的一个最基本的原生富文本编辑器Demo.

---

# 代码编辑器

富文本编辑器受到原生HTML和DOM技术的友好支持, 其编辑区生成的就是一组的HTML元素, 通过自定义标签、添加自定义样式表等方式来定制主题样式即可.

相较于富文本编辑器, 代码编辑器则要复杂得多. 代码编辑器的核心是通过对代码文本的词法、语法和语义分析, 将内容划分为关键字、变量名、字面量、函数体等元素, 并为每类元素添加不同的CSS class, 同时插入一些带边框的空格元素来实现代码的缩进和格式化等.

## monaco-editor

`monaco-editor` 是VSCode中分离出的编辑器模块, 也是目前最典型、应用最为广泛的前端代码编辑器之一, 本文以 `monaco-editor` 为例分析代码编辑器的实现方式.

`monaco-editor` 的编辑器区域使用了绝对定位、完全重叠的两层 `div` 区域与一个1px宽度的 `textarea` 元素构成:

- 第一层 div 主要负责背景样式的渲染, 其内部由绝对定位、固定高度的 div 代码行构成, 每个代码行内包含若干个绝对定位的 div 块, 用于展示缩进线、当前聚焦行边框、文字选中态高亮、警告和错误信息的下划波浪线等样式信息. 这一层的所有 div 都没有文本元素.
- 第二层 div 用于渲染代码文本, 内部的 div 代码行与第一层完全重叠, 每个代码行内由若干 span 标签包裹的文本元素(一个单词、一个标点符号、一段连续空格等)构成. 对代码进行语义分析后为每个 span 元素赋予不同的 class , 从而实现代码高亮.
- 输入光标为一个绝对定位、宽度为1px、内容为空的 textarea , 当使用鼠标或触控板单击编辑器区域、或使用方向键和其他快捷键改变输入光标位置后, 需要计算出正确的文本编辑位置并更新 textarea 元素的位置.

---

# 结语

本文对富文本编辑器和代码编辑器的实现方式进行了最基本最浅显的分析, 相较于代码编辑器而言, 富文本编辑器应用更广、更贴近前端.

作为学习者, 可以扒一扒市面上比较有名的在线富文本编辑器(如语雀、幕布、Notion、EverNote等), 发挥自己的创意, 做一个自己心目中更易用、更美观、更极客的富文本编辑器吧!

---

附:

[MDN - 一个简易但完整的富文本编辑器实现](https://developer.mozilla.org/zh-CN/docs/Web/Guide/HTML/Editable_content/Rich-Text_Editing_in_Mozilla#%E7%A4%BA%E4%BE%8B%EF%BC%9A%E4%B8%80%E4%B8%AA%E7%AE%80%E6%98%93%E4%BD%86%E5%AE%8C%E6%95%B4%E7%9A%84%E5%AF%8C%E6%96%87%E6%9C%AC%E7%BC%96%E8%BE%91%E5%99%A8)

[Monaco Editor - Github Pages](https://github.com/Microsoft/monaco-editor)

[ProseMirror - 一个开源的支持Markdown、WYSIWYG的富文本编辑器Toolkit](https://prosemirror.net/)
