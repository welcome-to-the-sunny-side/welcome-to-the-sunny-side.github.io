---
displayMode: blog
title: "Finding K neighbours in an implicitly defined bipartite graph"
date: 2024-08-15
tags: [algorithm]
---

## Outline

<ul class="outline-list">
<li>Problem</li>
<li>Solution
  <ul>
    <li>Requirements</li>
    <li>Algorithm</li>
    <li>Complexity Analysis</li>
  </ul>
</li>
<li>Example Problems
  <ul>
    <li>CF-1957F2</li>
  </ul>
</li>
</ul>

I thought of this idea while solving [1957F2](https://codeforces.com/problemset/problem/1957/F2). It is extremely easy, cute (at least compared to the official solution), and can be generalized, so I'll share it here.

## Problem

> Given two sets of vertices $X$ and $Y$ and a boolean function $f: X \times Y \rightarrow \{0, 1\}$, we define a bipartite graph $G = (V = (X \cup Y), E = ((u, v) \mid u \in X, v \in Y, f(u, v) = 1))$
> 
> We need to find $k$ adjacent vertices in $G$ for every node $u \in X$.

## Solution

### Requirements

1. We can compute $f(u, v)$ in $O(x)$ time.
2. We can construct a data structure $D(Z)$ from some subset $Z \subseteq Y$ in $O(p(\vert Z \vert))$ time, such that we can query if there exists some $v \in Z$ such that $f(u, v) = 1$ in $O(q(\vert Z \vert))$ time.

### Algorithm

<details><summary class ="spoiler-summary">Definitions</summary>
<div class = "spoiler-content">
<ul>
<li> $n = \vert X \vert$ </li>
<li> $m = \vert Y \vert$ </li>
<li> Let $Q(u, D(Z))$ be the query function which checks if there exists 
some $v \in Z$ such that $f(u, v) = 1$.</li>
</ul>
</div>
</details>

We will use block decomposition with $B$ as the block size. The algorithm works in the following way:

1. Divide $Y$ into $\lceil m/B \rceil$ disjoint subsets of size $B$. Let the $i$'th subset be $S_i$
2. Iterate over the subsets, while maintaining a list $L$ of all $u \in X$ for which we have found $< k$ neighbors till that point of time ($L = X$ initially).
3. At subset $S_i$, we will do the following:
   1. Construct $D(S_i)$.
   2. Create an empty list $H_i$, and add $u$ to $H_i$ (also delete it from $L$) for all $u \in L$ such that $Q(u, D(S_i)) = 1$.
   3. Compute $f(u, v) \; \forall \; u \in H_i, v\in S_i$, and mark $v$ as a neighbor of  $u$ if $f(u, v) = 1$.
   4. For every $u \in H_i$ for which we haven't found $k$ neighbors yet, add $u$ back to $L$.

<details><summary class ="spoiler-summary">Note</summary>
<div class = "spoiler-content">
We can trivially solve this problem faster for $k = 1$ by 
constructing a segment tree over $Y$, doing dfs on it, and passing down elements 
of $X$ to one of the two children based on queries from $D$ constructed on 
elements from one of the two children.
</div>
</details>

### Complexity Analysis

The cumulative time for building all the data structures will be $O(\lceil m/B \rceil \cdot p(B))$.

For queries:

1. At every $S_i$, we query $Q(u, D(S_i)) \; \forall \; u \in L$. Since $\vert L \vert \leq n$, this takes $O(n \cdot \lceil m/B\rceil \cdot q(B))$ time.
2. It's easy to see that every node $u \in X$ is added to  $H_i$ for at most $k$ distinct values of $i$. Every time a $u$ is added to $H_i$, we compute $f(u, v)$ for $\leq B$ distinct values of $v$. This takes $O(n \cdot B \cdot k \cdot x)$ time.

Therefore the total time taken is:

$$
O(n \cdot B \cdot k \cdot x + \lceil m/B \rceil \cdot (p(B) + n\cdot q(B)))
$$

The choice of $B$ is highly problem dependent, but in most setups where this idea could be used, I think we would have $k \lll n$ and $q$ would be pretty fast. I recommend solving the example problem to understand why the complexity is decent if you think it is garbage.

## Example Problems

### 1. [CF-1957F2](https://codeforces.com/problemset/problem/1957/F2)

> You are given an undirected tree of $n$ nodes. Each node $v$ has a value $a_v$ written on it. You have to answer queries related to the tree.
> 
> You are given $q$ queries. In each query, you are given 5 integers, $u_1$, $v_1$, $u_2$, $v_2$, and $k$. Denote the count of nodes with value $c$ on the path $u_1 \to v_1$ with $x_c$, and the count of nodes with value $c$ on the path $u_2 \to v_2$ with $y_c$. If there are $z$ such values of $c$ such that $x_c \neq y_c$, output any $\min(z, k)$ such values in any order.

<details><summary class ="spoiler-summary">Solution</summary>
<div class = "spoiler-content">
To be updated
</div>
</details>
