---
displayMode: blog
title: "Tricks in counting problems"
date: 2024-08-20
tags: [competitive-programming, algorithm, incomplete]
---

## Outline

<ul class="outline-list">
<li>Introduction</li>
<li>Pretend that elements are distinct
  <ul>
    <li>Idea</li>
    <li>Example Problems
      <ul>
        <li>CF-1799G</li>
        <li>CF-814E</li>
      </ul>
    </li>
  </ul>
</li>
</ul>

## Introduction

Hello, in this blog, I'll just be listing down certain tricks and insights which I encounter(ed) in counting problems. It's going to be more of a personal archive for me, and less of an instructive tutorial. It will remain a work in progress probably until I stop doing competitive programming.

If this blog does end up reaching a state close to what I currently envision it to be, it will  be somewhat hard to navigate since there will be a lot of independent content  crammed next to each other. I recommend navigating through the "Outline" instead of manually scrolling if the blog is in such a state at the time of you reading this.


## 1. Pretend that elements are distinct

### Idea (1)

Consider a problem which involves the following:

> Maintain a set $S$ while performing the following updates:
>
> 1. Add some elements to $S$.
> 2. Remove some number of elements from $S$ and do something with these elements.
>
> Finally, you have to find the total number of ways that this process could have been executed.

Let's consider a specific example to illustrate the idea. You have a set $S$, an initially empty list $p$, and have to process queries are of the following form:

1. Add $x$ elements of the same type to $S$, given that no element of this type has been added before.
2. Remove $y$ (given that $y \leq \vert S \vert$) elements from $S$, order these $y$ removed elements in any manner, and append them to $p$.

Finally, you need to find the number of distinct generatable lists $p$. 

<details><summary class ="spoiler-summary">Notation</summary>
<div class = "spoiler-content">
<ul>
<li>
$S_i$ : the set $S$ after $i$ operations 
</li>
<li>
$t_i$ : type of the $i$'th query
</li>
<li>
$x_i$ : number of elements to add in the $i$'th query
</li>
<li>
$y_i$ : number of elements to remove in the $i$'th query
</li>
</ul>
</div>
</details>

The answer is simply:

$$ \frac{\prod_{i \mid t_i = 2} {\binom{\vert S_{i - 1}\vert}{y_i} \cdot y_i !}}{\prod_{i \mid t_i = 1} {x_i !}} $$

It is not difficult to see why this is true. Consider what happens if we "pretend" for every type 1 query that all the elements inserted in it were distinct. This makes it trivial for us to compute the number of ways to perform a type 2 query, which would otherwise be difficult to compute. 


Now, once we have computed the final (incorrect) answer, let's "stop pretending" that type 1 queries involved distinct elements. For every type 1 query $i$, it's easy to see that our pretense results in the answer increasing by a factor of $x_i!$. So, we just "fix" the answer by dividing it by $\prod_{i \mid t_i = 1} {x_i !}$. 

### Example Problems (1)

#### [CF-1799G](https://codeforces.com/problemset/problem/1799/G)

#### [CF-814E](https://codeforces.com/contest/814/problem/E)
