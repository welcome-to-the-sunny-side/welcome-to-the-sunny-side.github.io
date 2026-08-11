---
displayMode: blog
title: "Suffix arrays in O(n) using SAIS"
date: 2026-08-11
tags: [algorithm]
---

# Introduction

While the usual $O(n \log{n})$ suffix array algorithm described [here](https://cp-algorithms.com/string/suffix-array.html) suffices for almost all of one's competitive-programming needs, suffix structures turn out to be useful in several other fields which require faster algorithms. Lossless compression is one such field, and I happened to need a faster SA algorithm in an LZ-compressor I've [been working on recently](https://github.com/welcome-to-the-sunny-side/misa77).

In this blog, we'll learn how to build suffix arrays in linear time, using the algorithm I learned for this purpose. It's called SAIS ("Suffix Array Induced Sorting"), and was originally described [in this paper](https://ieeexplore.ieee.org/document/4976463).

On an unrelated note, AI has become extraordinarily useful to me for learning new algorithms, and it drastically reduced the time it took to internalise this one (as the original paper was a bit opaque to me at first). If it is of any interest to you, you may find the conversation where Fable taught me this algorithm [here](https://claude.ai/share/d41da3db-1762-4bee-be14-e784051f5a13). When learning new things, I strongly recommend discussing the source material with your AI (as opposed to just trying to parse the source from scratch). 

# 1. Preliminaries

We have a string $T$ of length $n$.

For the sake of convenience:

- We assume that $T_i \in \lbrace 1, 2, \dots n \rbrace$ for all $ i \in [0, n)$.
- We add a unique sentinel element with value 0 at the end of $T$. Note that this sentinel is the unique minimum in $T$ and the length now becomes $n + 1$.
- We define $S_i$ to be the $i$-th suffix, ie. $T_i T_{i + 1} \dots T_n$. At several places ahead, I will simply use "$i$-th suffix" or "suffix $i$" to refer to $S_i$.

The goal is to construct the suffix array of $T$ in $O(n)$ time. The suffix array is defined as the array $A$ of length $n + 1$, where $A_i$ corresponds to the index of the $i$-th smallest suffix amongst all suffixes of $T$ (when compared lexicographically). One can note that the last character being unique ensures that no suffix is a prefix of another.

We also define $B$ as the rank-array of the suffixes of $T$. $A$ and $B$ are definitionally permutation inverses of one another.

# 2. L and S-type suffixes

The key insight that SAIS is built around is that there's a *lot* of information hidden in comparisons of adjacent suffixes of a string (ie. $S_i$ vs $S_{i + 1}$).

As such, we define two types of suffixes:

1. Suffix $i$ is said to be of **L-type**, if $i < n$ and $S_i > S_{i + 1}$.
2. Suffix $i$ is said to be of **S-type**, if $i = n$ or $S_i < S_{i + 1}$.

We will now make a series of observations about these two types, so buckle up.

First, we characterise the structure of both types in theorems 2.1 and 2.2.


#### Theorem 2.1:

> Suffix $i$ is L-type iff $T_j < T_i$ for the smallest $j \geq i$ such that $T_j \neq T_i$.

Simply put, all L-type suffixes have the form `[>= 1 occurrences of symbol b][1 occurrence of a]...` where $b > a$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

[tba]

</div>
</details>

#### Theorem 2.2:

> Suffix $i$ is S-type iff $i = n$ or $T_j > T_i$ for the smallest $j \geq i$ such that $T_j \neq T_i$.

Simply put, all S-type suffixes, save for the sentinel, have the form `[>= 1 occurrences of symbol b][1 occurrence of c]...` where $b < c$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

[tba]

</div>
</details>

Theorems 2.1 and 2.2 together imply the following (powerful) result.

#### Theorem 2.3:

> If $T_i = T_j$, suffix $i$ is of L-type, and suffix $j$ is of S-type, then $S_i < S_j$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

[tba]

</div>
</details>

Why is theorem 2.3 powerful? It allows us to characterise the structure of the suffix array in a very friendly "bucketed" manner. We can observe that the suffix array must take the following form:

- First, we have L-type suffixes that start with symbol $0$.
- Then, we have S-type suffixes that start with symbol $0$.
- Then, L-type suffixes that start with symbol $1$.
- Then, S-type suffixes that start with symbol $1$.
- Then, L-type suffixes that start with symbol $2$.
- Then, S-type suffixes that start with symbol $2$.
- ...and so on

In other words:

- The suffix array consists of several disjoint buckets, with each bucket corresponding to suffixes starting with a certain symbol. 
- The buckets are ordered by the starting symbol. 
- Within a particular bucket, we first have all the L-type suffixes, and then all the S-type suffixes.

# 3. LMS-types and LMS-substrings

We define a suffix $i$ to be of **LMS-type** (ie. "Leftmost-S-type") iff:

- $i > 0$
- Suffix $i$ is of S-type.
- Suffix $i - 1$ is of L-type.

Now, let's introduce a very helpful visualisation of strings that I'll just call a "slope view". The slope view of any given string will just have us drawing downward or upward slants between two adjacent suffixes based on the result of their comparison.

