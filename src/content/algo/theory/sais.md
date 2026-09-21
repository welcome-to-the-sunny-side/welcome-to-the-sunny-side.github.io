---
displayMode: blog
title: "Suffix arrays in O(n) using SAIS"
date: 2026-08-11
tags: [algorithm]
---

# Introduction

While the usual $O(n \log{n})$ suffix array algorithm described [here](https://cp-algorithms.com/string/suffix-array.html) suffices for almost all of one's competitive-programming needs, suffix structures turn out to be useful in several other fields which require faster algorithms. Lossless compression is one such field, and I happened to need a faster SA algorithm in an LZ-compressor I've [been working on recently](https://github.com/welcome-to-the-sunny-side/misa77).

In this blog, we'll learn how to build suffix arrays in linear time, using the algorithm I learned for this purpose. It's called SAIS ("Suffix Array with Induced Sorting"), and was originally described [in this paper](https://ieeexplore.ieee.org/document/4976463).

# 1. Preliminaries

We have a string $T$ of length $n$.

For the sake of convenience:

- We assume that $T_i \in \lbrace 1, 2, \dots n \rbrace$ for all $ i \in [0, n)$.
- We add a unique sentinel element with value $0$ at the end of $T$. Note that this sentinel is the unique minimum in $T$ and the length now becomes $n + 1$.
- We define $S_i$ to be the $i$-th suffix, ie. $T_i T_{i + 1} \dots T_n$. At several places ahead, I will simply use "$i$-th suffix" or "suffix $i$" to refer to $S_i$.

The goal is to construct the suffix array of $T$ in $O(n)$ time. The suffix array is defined as the array $A$ of length $n + 1$, where $A_i$ corresponds to the index of the $i$-th smallest suffix amongst all suffixes of $T$ (when compared lexicographically). One can note that the last character being unique ensures that no suffix is a prefix of another.

We also define $B$ as the rank-array of the suffixes of $T$. $A$ and $B$ are definitionally permutation inverses of one another.

# 2. L and S-type suffixes

The key insight that SAIS is built around is that there's a *lot* of information hidden in comparisons of adjacent suffixes of a string (ie. $S_i$ vs $S_{i + 1}$).

As such, we define two types of suffixes:

1. Suffix $i$ is said to be of **L-type**, if $i < n$ and $S_i > S_{i + 1}$.
2. Suffix $i$ is said to be of **S-type**, if $i = n$ or $S_i < S_{i + 1}$.

We will now make a series of observations about these two types in quick succession, so buckle up.

First, we characterise the structure of both types in theorems 2.1 and 2.2.

#### Theorem 2.1:

> Suffix $i$ is L-type iff $i < n$ and $T_j < T_i$ for the smallest $j \geq i$ such that $T_j \neq T_i$.

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

#### Theorem 2.3:

> All the positions in $T$ can be classified as L or S-type in $O(n)$. 

Denote the type of the $i$-th suffix by $Q_i$. Then: 

- $Q_n =$ S-type.
- For $i < n$:
    - If $T_i < T_{i + 1}$, $Q_i$ = S-type.
    - If $T_i > T_{i + 1}$, $Q_i$ = L-type.
    - Else, $Q_i = Q_{i + 1}$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

[tba]

</div>
</details>


#### Theorem 2.4:

> If $T_i = T_j$, suffix $i$ is of L-type, and suffix $j$ is of S-type, then $S_i < S_j$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

[tba]
S_i looks like bbbbbb...a....
S_j looks like bbbbbb...c....
yada yada
</div>
</details>

Now, theorem 2.4 is quite powerful as it allows us to characterise the structure of the suffix array in a very friendly "bucketed" manner. We can observe that the suffix array must take the following form:

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

It's easy to see that these bucket boundaries can also be computed in O(n). It might seem odd that I'm mentioning this, but it's important for the implementation later.

<details><summary class ="spoiler-summary">Code</summary>
<div class = "spoiler-content">


```cpp
// Given n and T
int n;
vector<int> T;

vector<int> cnt(n + 1, 0);
for(auto x : T)
    cnt[x]++;

auto tail = cnt;
for(int i = 1; i <= n; i++)
    tail[i] += tail[i - 1];

auto head = tail;
for(int i = 0; i <= n; i ++)
    head[i] -= cnt[i];

//now, bucket for element i is [head[i], tail[i])
```

</div>
</details>


# 3. LMS-types and LMS-substrings

We define a suffix $i$ to be of **LMS-type** (ie. "Leftmost-S-type") iff:

- $i > 0$
- Suffix $i$ is of S-type.
- Suffix $i - 1$ is of L-type.

A key observation is that there can be at most $\lceil \frac{n + 1}{2} \rceil$ LMS positions, as the existence of each LMS position "consumes" a unique L-type and S-type. As you will later see, the efficiency of SAIS is dependent on this.

Now, let's introduce a very helpful visualisation for strings that I'll just call a "slope view". The slope view of any given string will be obtained by us drawing downward or upward slants between two adjacent suffixes based on the result of their comparison (ie. the type of the left suffix).

Going forward, we'll be using $T = $ `baacbcbacbccdaa$` as a concrete anchor (where `$` is the appended unique minimum). I know I said that $T$ will have integer elements, but an english alphabet string is just nicer to look at, and is no different computationally.

<figure style="text-align: center;">
  <img
    src="/assets/sais/slope-view.png"
    alt="Alt text"
    style="display: block; margin: 0 auto;"
  >
  <figcaption>
    The slope-view diagram for T.
  </figcaption>
</figure>

A few observations:

- LMS-types correspond to *valleys* in the slope view.
- An upward slope (from left to right) corresonds to S-type suffixes.
- A downward slope corresponds to L-type suffixes.
- The second-last character is always L-type, as the last character is the unique minimum. Since the last position is definitionally S-type, this also implies that it's always LMS-type.

Also recall theorem 2.4. The buckets in the SA for $T$ take the following form.

<figure style="text-align: center;">
  <img
    src="/assets/sais/bucket-view.png"
    alt="Alt text"
    style="display: block; margin: 0 auto;"
  >
  <figcaption>
    The buckets for the suffix array of T.
  </figcaption>
</figure>

Let's now define LMS-substrings.

We define the **LMS-end** of position $i$, $E_i$, as the leftmost LMS-position such that $i < E_i$. For $i = n$, we separately define $E_i = i$.
The **LMS-substring** of position $i$, $P_i$ is defined as $T[i, E_i]$.

Some simple observations:

- In the slope-view, $P_i$ is just the substring starting at $i$, and ending at the first valley after $i$ ($E_i$).
- Since the last position in the string is LMS-type, all $E_i$ and $P_i$ are well-defined.

# 4. Sorting LMS-substrings

I won't pretend to offer any motivation on why sorting LMS-substrings is important at this point. I just request that you trust me when I say it's important. The deeper reason behind this will become apparent when you internalise the entire algorithm.

Recall that the suffix array $A$ gives us the position of each string in sorted order of all suffixes $T[i, n]$. Our goal in this section is to produce a "partially sorted" suffix array $X$, which gives us the position of each string in the sorted order of all LMS-substrings $P_i = T[i, E_i]$ ("partially sorted" because we only sort suffixes up to the ends of their LMS-substrings). 

Note that unlike with entire suffixes, certain LMS substrings might be prefixes of others. We will resolve such comparisons arbitrarily (instead of declaring a proper prefix of a string to be smaller). Essentially, we want a sorted sequence where for any pair of strings in this order, either one is a prefix of the other, or the first is lexicographically smaller than the second. Call such a sequence **safelex-valid**.

An observant reader might feel some discomfort at our new goal of finding $X$ instead of $A$, because Theorem 2.4 applies when we're sorting entire suffixes, and not LMS-substrings. Worry not, we can show that it applies for LMS-substrings too!

### Theorem 4.1

> If position $i$ is LMS-type, then $T_{i - 1} > T_i$. Therefore, any LMS substring $P_i$ ($i \neq n$) contains at least two different characters.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

[tba]
If position $i$ is LMS type, then $T_{i - 1} \neq T_i$ because if they were, then they would have same type
and every LMS substring contains its $T_{E_i}$ and $T_{E_{i} - 1}$
</div>
</details>

### Theorem 4.2 

> If $i$ and $j$ ($i < j$) lie on the same "downward slope" (i.e. $i$ is L-type and there lie no S-type positions between $i$ and $j$), then $P_i$ > $P_j$, and neither is a prefix of the other.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">
[tba]
</div>
</details>

### Theorem 4.3

> If $T_i = T_j$, suffix $i$ is of L-type, and suffix $j$ is of S-type, then $P_i < P_j$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

[tba]
the argument from proof of 2.4 applies here too, because it only depends on both having same starting character, different type, and having the first non-equal character within them
</div>
</details>

Now that we've made the powerful result from Theorem 2.4 accessible in this setting too, we may proceed. 

## 4.1. L-induce

We'll start off by sorting all the L-suffixes (i.e. computing $X$ at all positions $i$ where $X_i$ is L-type). This corresponds to filling the L-type-prefixes within the buckets of $X$.

Let's first consider an inefficient way to do this, and then optimise it.

<details><summary class ="spoiler-summary">Procedure 1</summary>
<div class = "spoiler-content">

```cpp
// Given n, T, Q, P and the bucket boundaries (see code in theorem 2.4)
int n;
vector<int> T, Q, head, tail;
vector<vector<int>> P;          //LMS substrings

vector<int> X(n + 1, -1);       //suffix array

set<pair<vector<int>, int>> q;

auto extend = [&](int i) -> void
{
  int j = i - 1;
  if(j >= 0 and Q[j] == L_TYPE)
    q.insert({P[j], j});
};

for(int i = 0; i <= n; i ++)
  if(Q[i] == LMS_TYPE)
    q.insert({{T[i]}, i});

while(!q.empty())
{
  auto [v, i] = *q.begin();
  q.erase(q.begin());

  //we do not place the LMS types into X 
  if(Q[i] == L_TYPE)
  {
    X[head[T[i]]] = i;
    head[T[i]] ++;
  }

  extend(i);
}
```

</div>
</details>

This inefficient procedure essentially does the following:
1. It first inserts the ends of all LMS substrings (ie. $T[i, i]$ for LMS-types $i$) into a heap.
2. Then, it repeatedly picks the smallest substring from the heap and:
    1. If the substring corresponds to an L-type position $i$, it places $i$ at the first free position in the bucket corresponding to $T_i$ in $X$.
    2. Then, if position $i - 1$ is L-type, it inserts $P_{i - 1}$ into the heap (i.e. it extends the removed substring by one character on the left, or equivalently in the slope-view - moves one step up to the left).

<figure style="text-align: center;">
  <img
    src="/assets/sais/l-induce-1.gif"
    alt="Procedure 1: place each L-position into X when it is removed from the queue. The slope view and bucket view update together."
    style="display: block; margin: 0 auto;"
  >
  <figcaption>Procedure 1: place each L-position into X when it is removed from the queue.</figcaption>
</figure>

Why is this procedure correct?

From theorem 4.2, $P_{i - 1} > P_i$ when $i - 1$ and $i$ lie on the same downward slope (also, $P_{i - 1} > T[i, i]$ when $i$ is LMS-type from theorem 4.1). In our procedure, the selection of $\lbrace P_i, i \rbrace$ (or $T[i, i]$ when $i$ is LMS-type) from the heap only results in the insertion of $\lbrace P_{i - 1}, i - 1 \rbrace$ if $i - 1$ and $i$ lie on the same downward slope. Therefore, the deletion of an element from the heap can only result in the insertion of a *strictly greater* element.
Since we always delete the smallest element from the heap, this implies that all elements to ever be inserted in the heap are deleted in non-decreasing order (for any two L-type positions $i$ and $j$, if $P_i < P_j$, then $i$ is deleted from the heap before $j$).

Consider the placement of L-type positions within $X$. For any character $c$, we know that all L-type LMS-substrings that begin with $c$ (a) will be deleted from the heap in non-decreasing order and (b) lie within a prefix $c$'s bucket in $X$ (theorem 4.3). Therefore, step 2.1 is correct (placing L-type position $i$ at the first available position in the bucket of $T_i$ in $X$, when we're deleting $\lbrace P_i, i \rbrace$ from the heap).

Further, all L-type LMS substrings do get placed into $X$ because every downward slope ends in an LMS position (valley).

Now, let's make a subtle modification to this procedure that preserves correctness, but allows us to later optimise it. Consider the following.

<details><summary class ="spoiler-summary">Procedure 2</summary>
<div class = "spoiler-content">

```cpp
// Given n, T, Q, P and the bucket boundaries (see code in theorem 2.4)
int n;
vector<int> T, Q, head, tail;
vector<vector<int>> P;          //LMS substrings

vector<int> X(n + 1, -1);       //suffix array

set<pair<vector<int>, int>> q;

auto extend2 = [&](int i) -> void
{
  int j = i - 1;
  if(j >= 0 and Q[j] == L_TYPE)
  {
    X[head[T[j]]] = j;
    head[T[j]] ++;
    q.insert({P[j], j});
  }
};

for(int i = 0; i <= n; i ++)
  if(Q[i] == LMS_TYPE)
    q.insert({{T[i]}, i});

while(!q.empty())
{
  auto [v, i] = *q.begin();
  q.erase(q.begin());

  extend2(i);
}
```

</div>
</details>

<figure style="text-align: center;">
  <img
    src="/assets/sais/l-induce-2.gif"
    alt="Procedure 2: place each L-position into X when it is added to the queue. The slope view and bucket view update together."
    style="display: block; margin: 0 auto;"
  >
  <figcaption>Procedure 2: place each L-position into X when it is added to the queue.</figcaption>
</figure>

What changed? Instead of placing L-type $i$ into $X$ when $P_i$ gets deleted from the heap, we place $i$ into $X$ (using the same rule as before: place it at the first available position within its bucket) *when it gets inserted into the heap*. When does it get inserted into the heap? When $T[i + 1, E_i]$ is deleted from the heap.

Why is this procedure correct? First, observe that elements are still deleted in non-decreasing order from the heap.

All L-type positions are necessarily placed within their buckets in $X$, so for any two L-type positions $i$ and $j$ with $T_i < T_j$, $i$ will necessarily be placed before $j$ in $X$. Therefore, we need only show that the relative placement of L-type positions *within* buckets is correct.

Consider any two L-type positions $i$ and $j$ with $T_i = T_j = c$. If either one of $P_i$ or $P_j$ is a prefix of the other, then their relative order in $X$ doesn't matter (recall safelex-validity). Otherwise, $T[i + 1, E_i] \neq T[j + 1, E_j]$. Assume WLOG $T[i + 1, E_i] < T[j + 1, E_j]$. As substrings are deleted from the heap in non-decreasing order, `extend2(i + 1)` is called before `extend2(j + 1)`, so $i$ occurs before $j$ in their bucket in $X$. Since $P_i = c + T[i + 1, E_i]$ and $P_j = c + T[j + 1, E_j]$, we have $P_i < P_j$. As $P_i < P_j$ and $i$ occurs before $j$ in $X$, their relative order is correct.

Just like procedure 1, all L-type positions are eventually placed into $X$.

This proves that the L-regions of $X$ are correctly filled by this procedure too.

Notice that here, we assumed that all $T[i + 1, E_i]$ are deleted from the heap in a non-decreasing manner with the comparator for "non-decreasing" being standard lexicographical comparison (the comparator for `vector<int>` in C++). But what if they were deleted in a safelex-valid manner instead? (for instance, if LMS-substring `[1, 2, 3]` and `[1]` were both in the heap, we could choose to delete the former first).

It's not difficult to see that the resulting $X$ will still have L-regions filled in a safelex-valid manner!:

1. Any two L-type positions $i$ and $j$ with $T_i < T_j$ still get placed in their own buckets, and therefore have correct relative order.
2. For any two L-type positions $i$ and $j$ with $T_i = T_j$:
    1. When either one of $P_i$ or $P_j$ is a prefix of the other, then their relative order in $X$ doesn't matter.
    2. When neither is a prefix of the other (they differ at some character before either ends), then the same is true for $T[i + 1, E_i]$ and $T[j + 1, E_j]$ (as $T_i = T_j$). Therefore, the strictly smaller one gets processed first due to the deletion sequence being safelex-valid, and the strictly smaller one of $P_i$ and $P_j$ gets added to their shared bucket first! 

### Lemma 4.4 

> Sequentially calling `extend2(i)` on some safelex-valid sequence $i_1, i_2, i_3, \dots$ (an index $i_j$ represents $P_{i_j}$ if $i_j$ is L-type, and $T[i, i]$ otherwise) which contains all L/LMS-type positions exactly once results in the L-regions of $X$ being correctly filled.

Now, how can we do this faster? 

Let's make use of Lemma 4.4. Imagine that we had access to some pre-built, valid $X'$. We could then simply call `extend2(X'[i])` in increasing order of $i$, where $X'_i$ was L or LMS-type. Alas, we do not have access to a pre-built $X'$... But we notice that calling `extend2(X'[i])` only possibly places an element into $X$ to the right of $i$ (so as we walk from left to right, we only place elements to our right, and there are no "circular dependencies").

What if we could do the following at the same time?:

- Build $X$.
- *Use $X$ itself as a pre-built $X'$* that we walk from left to right and call `extend2(X'[i])` on?   

We can indeed make this work. Let's look at a correct application of this idea, and then understand why it works.

<details><summary class ="spoiler-summary">Procedure 3</summary>
<div class = "spoiler-content">

```cpp
// Given n, T, Q, and the bucket boundaries (see code in theorem 2.4)
int n;
vector<int> T, Q, head, tail;

vector<int> X(n + 1, -1);       //suffix array

// insert LMS positions into X
for(int i = 0; i <= n; i ++)
  if(Q[i] == LMS_TYPE)
    X[--tail[T[i]]] = i;

auto extend2 = [&](int i) -> void
{
  int j = i - 1;
  if(j >= 0 and Q[j] == L_TYPE)
  {
    X[head[T[j]]] = j;
    head[T[j]] ++;
    // q.insert({P[j], j}); no heap here!
  }
};

// induce L positions into X
auto l_induce = [&]() -> void
{
  for(int i = 0; i <= n; i ++)
    if(X[i] != -1)
      extend2(X[i]);
};
l_induce();

// clean up LMS types from X
for(int i = 0; i <= n; i ++)
  if(X[i] != -1 and Q[X[i]] == LMS_TYPE)
    X[i] = -1;
```

</div>
</details>

First, let's consider the insertion of LMS positions into $X$. We simply place all LMS-types at the tails of their buckets in $X$.

<figure style="text-align: center;">
  <img
    src="/assets/sais/lms-seeding.gif"
    alt="Alt text"
    style="display: block; margin: 0 auto;"
  >
  <figcaption>
    Animation showing LMS positions being seeded.
  </figcaption>
</figure>

Why is this valid? In this context, any LMS-type position $i$ just corresponds to string $T[i, i]$, that is, a single character $c$. By lemma 4.4, we just need safelex-validity for $X$. Consider any character $c$ and its bucket (all strings that begin with $c$). It's easy to see that for any bucket within a safelex-valid sequence, moving all the length-1 strings to the end of the bucket (while preserving the relative order of the other strings), and arbitrarily changing the relative order of any two length-1 strings preserves safelex-validity of the sequence. In this context, all the substrings corresponding to L-type positions will have a length of at least 2. Therefore, this initial placement is safe.  

<figure style="text-align: center;">
  <img
    src="/assets/sais/l-induce-3.gif"
    alt="Procedure 3: scan X from left to right, induce L-predecessors, then remove the LMS seeds. The slope view and bucket view update together."
    style="display: block; margin: 0 auto;"
  >
  <figcaption>Procedure 3: scan X from left to right, induce L-predecessors, then remove the LMS seeds.</figcaption>
</figure>

But is this initial placement *enough* to make `l_induce()` correctly fill the L-regions of $X$?

It indeed is!

First, we show that `extend2(X[i])` can only place something into $X$ after $i$:

- If $X[i]$ is LMS type: From theorem 4.1, $T_{j - 1} > T_j$ for LMS position $X[i] = j$, so $P_{j - 1}$ is only ever placed in a bucket to the right of that of $T[j, j]$ (so, necessarily after $i$, as $j$ is in its bucket).
- If $X[i]$ is L-type: Let $X[i] = j$. We only need to consider the case where $j - 1 \geq 0$ and $j - 1$ is L-type. From theorem 4.2, $P_{j - 1} > P_{j}$. So we either have $T_{j - 1} = T_j$ (`head[T[j]]` only increases, so $j - 1$ gets placed after $j$, in the same bucket) or $T_{j - 1} > T_j$ (so $j - 1$ gets placed in a bucket to the right of that of $j$, so necessarily to the right).

This implies that for every position $i$ that gets inserted into $X$, we eventually call `extend2(i)` (as we move from left to right). 

But does every L-position eventually get inserted into $X$? Yes, because we initially insert all LMS positions into $X$, and every sequence of L-positions ends in an LMS position (the same coverage argument as for procedure 1).

Ok, so we've shown that every L-position eventually gets inserted into $X$, but zoom out a bit - is it still true that the L-regions in $X$ are being filled in a safelex-valid manner?

Recall the proof of lemma 4.4. All we needed was a safelex-valid sequence to repeatedly call `extend2()` upon. Consider the sequence formed by filled entries in any intermediate state of $X$ after any number of `extend2()` operations in `l_induce()`.

We can show that all such intermediate sequences are safelex-valid by induction.

- The base case is the initial placement of the LMS positions. This placement is trivially safelex-valid due to buckets.
- Consider the inductive step - a position $i$ that gets placed into $X$ due to the call `extend2(i + 1)`. The intermediate sequence before this step was safelex-valid. Does it still remain safelex valid? Let's compare $P_i$ to all the already placed strings:
  - For placed $j$ such that $T_i \neq T_j$, their relative order is trivially correct due to bucketing.
  - For placed LMS positions $j$ with $T_i = T_j$, their relative order doesn't violate safelex-validity (as shown previously for length-1 strings).
  - For placed L-positions $j$ with $T_i = T_j = c$, $j$ lies behind $i$ in $X$. This implies that $T[i + 1, E_i]$ occured after $T[j + 1, E_j]$ in $X$, so one is either a prefix of the other, or the former is strictly greater. Since $P_i = c + T[i + 1, E_i]$ and $P_j = c + T[j + 1, E_j]$, one is either a prefix of the other, or the former is strictly greater, and therefore placing $i$ after $j$ in $X$ doesn't violate safelex-validity.

Therefore, the final filled sequence in $X$ is safelex-valid. For the sake of clarity, we do a final cleanup pass where we remove the LMS-type positions from $X$.

It's easy to see that this entire procedure runs in $O(n)$ (placing LMS-positions, L-induce, cleanup).
.
## 4.2. S-induce

Alright, so we've *finally* computed the L regions of buckets correctly. Let us now deal with the S regions.

We will use a symmetrical procedure to `l_induce` called `s_induce`, which runs from *right to left* instead.


<details><summary class ="spoiler-summary">Procedure 4</summary>
<div class = "spoiler-content">

```cpp
// Given n, T, Q, bucket boundaries, and X with L-regions computed
// Note that these are freshly computed bucket boundaries, not those
// modified in the L phase. 
int n;
vector<int> T, Q, head, tail, X;


auto extend3 = [&](int i) -> void
{
  int j = i - 1;
  if(j >= 0 and Q[j] == S_TYPE)
  {
    tail[T[j]] --;
    X[tail[T[j]]] = j;
  }
};

// place the sentinel position separately
X[0] = n;

// induce S positions into X
auto s_induce = [&]() -> void
{
  for(int i = n; i >= 0; i --)
    if(X[i] != -1)
      extend3(X[i]);
};
s_induce();
```
</div>
</details>

<figure style="text-align: center;">
  <img
    src="/assets/sais/s-induce.gif"
    alt="The sentinel is restored, then a right-to-left scan fills S-regions while moving leftward down the upward slopes."
    style="display: block; margin: 0 auto;"
  >
  <figcaption>Procedure 4: restore the sentinel, then scan X from right to left to induce S-positions.</figcaption>
</figure>

Why does this work? The proof is structurally symmetric to that of `l_induce` (we now process strings in non-increasing order, so we go from right to left in $X$, and every call to `extend3(X[i])` can only add something to $X$ strictly before $i$), but with one caveat: coverage (i.e. all L-positions eventually get placed into $X$) relied on the fact that every sequence of L positions ended in an LMS position (every downward slope ends in a valley), and us manually placing the LMS positions into $X$ first. The equivalent requirement here would be every upward slope ending in a peak, and us having placed every peak first. As all L regions have already been computed, all the peaks have been placed into $X$. The only source of nuisance is the very last position, which is LMS-type and doesn't have an L-type peak after it. Thankfully, $T_n$ is the unique minimum and must therefore be the very first element in $X$, so we manually place it.

I'll leave the complete proof to the reader but will just add a few observations that should seem natural if you've internalised the details:

- If we ran `s_induce()` after removing all the non-peak L-type positions from $X$, the resultant $X$ would still have its S regions correctly filled.
- For `l_induce()`, adding the LMS-type seeds (valleys) into $X$ was quite simple as their corresponding strings had a length of 1. Here, the "seeds" for the induction phase are L-type peaks whose corresponding strings are their LMS-substrings, whose relative order in $X$ cannot be trivially determined in the same way.

# 5. Sorting the LMS-reduced string

[naturally, LMS types also get sorted up to boundaries]
[finding label for each LMS-substring starting at LMS position in O(n), reducing T to a smaller string using these substrings, sending this into the recursion]
[show that they can now be labelled in O(n), we reduce to just the LMS label string, length <= n/2, recursively sort this, T(n) = O(n) + T(n/2) = O(n)]

# 6. Finally producing $A$

[we will now use this]

[then circle back to the crude LMS seeding done for the first L-induce, and how the correct LMS seeding before this L-induce will indeed sort entire L suffixes]

[then circle back to the crude L seeding done for the first S-induce, same argument, now S-induce sorts entire S suffixes]

[done? ]