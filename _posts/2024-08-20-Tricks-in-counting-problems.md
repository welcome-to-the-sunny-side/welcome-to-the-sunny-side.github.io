---
layout: post
title: "Tricks in counting problems"
tags: competitive-programming algorithm incomplete
---

## Outline

- [Introduction](#introduction)
- [1. Pretend that elements are distinct](#1-pretend-that-elements-are-distinct)
    - [Idea](#idea-1)
    - [Example Problems](#example-problems-1)

## Introduction

Hello, in this blog, I'll just be listing down certain tricks and insights which I encounter(ed) in counting problems. It's going to be more of a personal archive for me, and less of an instructive tutorial. It will remain a work in progress probably until I stop doing competitive programming.

If this blog does end up reaching a state close to what I currently envision it to be, it will  be somewhat hard to navigate since there will be a lot of independent content  crammed next to each other. I recommend navigating through the "Outline" instead of manually scrolling if the blog is in such a state at the time of you reading this.


## 1. Pretend that elements are distinct

### Idea (1)

> Suppose you have a problem which has an underlying process that involves updates of the following form to some set of elements $S$:
>
> 1. Add some elements to $S$.
>
> 2. Remove some number of elements from $S$.
>
> Finally, you have to find the total number of ways that this process could have been executed.

To better illustrate the mechanism, let's consider a specific example wherein the queries are of the following form:

1. Add $x$ elements of the same type to the set (restriction: these types of elements haven't been added before).
2. Remove $1 \leq y \leq \vert S \vert$ elements from the set.

Finally, we need to find the total number of ways we could have performed all the type 2 queries.

Now, if one tries to solve this problem

### Example Problems (1)

#### [CF-1799G](https://codeforces.com/problemset/problem/1799/G)

#### [CF-814E](https://codeforces.com/contest/814/problem/E)
