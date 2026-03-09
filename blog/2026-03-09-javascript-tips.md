---
slug: javascript-tips
title: 5 Thu thuat JavaScript huu ich
authors: [default]
tags: [javascript, tips]
---

Mot so thu thuat JavaScript ma toi thuong su dung trong cong viec hang ngay.

<!-- truncate -->

## 1. Optional Chaining

```javascript
const userName = user?.profile?.name ?? 'Anonymous';
```

## 2. Nullish Coalescing

```javascript
const port = config.port ?? 3000;
// Khac voi || vi no chi check null/undefined
```

## 3. Object Destructuring voi Default Values

```javascript
const { name = 'Unknown', age = 0 } = user;
```

## 4. Array.from de tao mang

```javascript
// Tao mang so tu 1 den 10
const numbers = Array.from({ length: 10 }, (_, i) => i + 1);
```

## 5. Promise.allSettled

```javascript
const results = await Promise.allSettled([
  fetch('/api/users'),
  fetch('/api/posts'),
  fetch('/api/comments'),
]);

const successful = results.filter(r => r.status === 'fulfilled');
const failed = results.filter(r => r.status === 'rejected');
```

Hy vong nhung thu thuat nay se giup ich cho ban!
