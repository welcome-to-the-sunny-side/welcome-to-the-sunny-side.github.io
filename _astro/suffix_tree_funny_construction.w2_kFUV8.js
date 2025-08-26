const e=`---
displayMode: blog
title: "A funny way to construct suffix tree and do other things"
date: 2024-08-16
tags: [algorithm]
---

## Outline

<ul class="outline-list">
<li>Problem</li>
<li>Algorithm</li>
<li>Complexity Analysis</li>
<li>Code</li>
<li>Example Problems</li>
    <ul>
    <li>Problem 1</li>
    </ul>
</ul>

Hello, in this blog I'll share a funny way to construct a suffix tree in $O(n \\log^2{n})$ time, for a given string $S$ of length $n$. I am going to call the underlying idea the "Leader Split Trick". It can probably be used to solve other problems too.

## Problem

A suffix tree of a string $S$ is a [radix tree](https://en.wikipedia.org/wiki/Radix_tree) constructed from all the suffixes of $S$. It's easy to see that it has $O(n)$ nodes. It can be constructed in $O(n)$ using [this](https://codeforces.com/blog/entry/16780).

I am going to share a simple and practically useless way of building it in a worse time complexity, $O(n\\log^2{n})$.

## Algorithm

<details><summary class = "spoiler-summary">Notation</summary> 
<div class = "spoiler-content">
<ul>
<li> When I refer to "suffix $i$" ahead, I mean the suffix $S[i, n]$. </li>
<li> $l_i$ is the leaf node corresponding to suffix $i$ in the final suffix tree. </li>
</ul>
</div>
</details>

Initially, we start with an empty tree (with a virtual root node), and a set $G$ of all suffixes from $1$ to $n$, these suffixes will be stored in the form of their starting index.

It's easy to see that the paths from the root node to $l_u \\forall (u \\in G)$ will share some common prefix till an internal node $s_G$, after which these paths will split apart along some downward edges of the internal node. Let's define $d_G$ to be the longest common prefix across the paths $(\\text{root}, l_u) \\forall u \\in G$. 

Our algorithm will essentially do the following:

1. Find $d_G$.
2. Split apart $G$ into disjoint subsets $G'$ (each subset $G'$ will have suffixes whose leaves lie in the subtree of a unique child node of $s_G$).
3. Solve the problem recursively for each subset, and add an edge in the suffix tree from $s_G$ to $s_{G'}$ for every $G'$.

Now, we define a recursive function $f(G, L, \\text{dep}, \\text{dis})$. 

<details><summary class = "spoiler-summary">Definitions</summary> 
<div class = "spoiler-content">
<ul>
<li> $G$ : a set of suffixes (represented by starting indices) </li>
<li> $L$ : "leader" element (possibly undefined, in which case it will be "null") </li>
<li>$\\text{dep}$ : depth of $s_{G_p}$ (the internal node of the parent call).</li>
<li> $\\text{dis}$ : sorted list of integers (possibly undefined). </li>
</ul>
</div>
</details>

In each call, $f(G, L, \\text{dep}, \\text{dis})$, we do the following:

1. If the "Leader" element $L$ is undefined:   
   1. Set $L$ to a random element of $G$.
   2. For every suffix $i \\in G$, find $\\text{dis[i]}$, the longest common prefix of the suffixes $i$ and $L$. This can be done in $O(\\vert G \\vert \\cdot \\log{n})$ using binary search + hashing. We store $\\text{dis}$ in a sorted manner. 
2. Let $m$ be the minimum value in $\\text{dis[]}$. It's easy to see that the internal node created from splitting $G$ will occur at depth $\\text{dep} + m$. We create $s_G$, and add an edge corresponding to the substring $S[L + dep + 1, L + \\text{dep} + m]$ from $s_{G_p}$ to $s_G$.
3. Now, we delete all suffixes $i \\in G : \\text{dis[i]} = m$, from $G$ (and their corresponding elements from $\\text{dis}$), and group them into disjoint subsets based on the character $S_{i + \\text{dep} + m + 1}$ for suffix $i$ (basically the next character after the internal node). 
4. We call $f(G', \\text{null}, \\text{dep} + m, \\text{null})$ for every newly created subset $G'$, and also call $f(G, L, \\text{dep + m}, \\text{dis})$ for the modified subset $G$.

Note: There might be some off-by-one errors.

## Complexity Analysis

Consider the following problem: 

> We have $n$ singleton sets, and are given some set merge operations. When merging sets $A$ and $B$, we merge $B$ to $A$ with probability $\\frac{\\vert A \\vert}{\\vert A \\vert + \\vert B \\vert}$ and $A$ to $B$ with the probability $\\frac{\\vert B \\vert}{\\vert A \\vert + \\vert B \\vert}$. 

The above problem is computationally equivalent to [Randomized Quicksort](https://en.wikipedia.org/wiki/Quicksort#Randomized_quicksort), which has an expected time complexity of $O(n \\log{n})$.

It's not difficult to see that our split operations are simply the operations that will occur in the above problem in a **reversed** manner (Formally, we can define a bijective relationship between the two sets of operations, such that related sets of operations will occur with the same probability) . Therefore, the time taken by all the split operations is $O(n \\log{n})$.

However, every time we perform a split operation (merge in reverse), we also compute $\\text{dis}$ for the child set $C$ (which gets merged into the parent set), and that takes $O(\\vert C \\vert \\log{n})$ time. Thus, our entire algorithm has an expected time complexity of $O(n \\log^2{n})$.

## Code

My implementation can be found [here](https://github.com/welcome-to-the-sunny-side/libra/blob/main/meme/random_suffix_tree.cpp).

## Example Problems

### Problem 1

> You are given a tree on $n$ nodes. You also have a set containing all nodes, $\\{1, 2, \\dots , n\\}$.
> You have to process the following queries *online*:
> 
> 1. "$1\\; m\\; x\\; v_1\\; v_2\\; \\dots \\; v_x$" : Remove the nodes $v_1, v_2 \\dots, v_x$ from the set $S$ whose maximum element is $m$, and create a new set with these elements (it is guaranteed that there exists some set with maximum element $m$ and $v_i \\in S \\; \\forall \\; i$).
> 2. "$2 \\; m$" : Let the set whose maximum element is $m$ be $S$. Find some node $x \\in S \\mid \\max_{y \\in S}{\\text{dis}(x, y)} = \\max_{u, v \\in S}{\\text{dis}(u,v)} $. 

<details><summary class ="spoiler-summary">Solution</summary>
<div class = "spoiler-content">
[to be updated]
</div>
</details>`;export{e as default};
