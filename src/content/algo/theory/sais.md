---
displayMode: blog
title: "Suffix arrays in O(n) using SA-IS"
date: 2026-08-11
tags: [algorithm]
---

# Introduction

While the usual $O(n \log{n})$ suffix array algorithm described [here](https://cp-algorithms.com/string/suffix-array.html) suffices for almost all of one's competitive-programming needs, suffix structures turn out to be useful in several other fields which require faster algorithms. Lossless compression is one such field, and I happened to need a faster SA algorithm in an LZ-compressor I've [been working on recently](https://github.com/welcome-to-the-sunny-side/misa77).

In this blog, we'll learn how to build suffix arrays in linear time, using the algorithm I learned for this purpose. It's called SA-IS ("Suffix Array by Induced Sorting", by Nong, Zhang, and Chan), and was originally described [in this paper](https://ieeexplore.ieee.org/document/4976463).

# 1. Preliminaries

We have a string $T$ of length $n$.

For the sake of convenience:

- We assume that $T_i \in \lbrace 1, 2, \dots n \rbrace$ for all $ i \in [0, n)$.
- We add a unique sentinel element with value $0$ at the end of $T$. Note that this sentinel is the unique minimum in $T$ and the length now becomes $n + 1$.
- We define $S_i$ to be the $i$-th suffix, i.e. $T_i T_{i + 1} \dots T_n$. At several places ahead, I will simply use "$i$-th suffix" or "suffix $i$" to refer to $S_i$.

The goal is to construct the suffix array of $T$ in $O(n)$ time. The suffix array is defined as the array $A$ of length $n + 1$, where $A_i$ corresponds to the index of the $i$-th smallest suffix amongst all suffixes of $T$ (when compared lexicographically). One can note that the last character being unique ensures that no suffix is a prefix of another.

# 2. L and S-type suffixes

The key insight that SAIS is built around is that there's a *lot* of information hidden in comparisons of adjacent suffixes of a string (i.e. $S_i$ vs $S_{i + 1}$).

As such, we define two types of suffixes:

1. Suffix $i$ is said to be of **L-type**, if $i < n$ and $S_i > S_{i + 1}$.
2. Suffix $i$ is said to be of **S-type**, if $i = n$ or $S_i < S_{i + 1}$.

We will now make a series of observations about these two types in quick succession, so buckle up.

First, we characterise the structure of both types.

#### Theorem 2.1

> Suffix $i$ is L-type iff $i < n$ and $T_i > T_j$ for the smallest $j \geq i$ such that $T_j \neq T_i$.

Simply put, all L-type suffixes have the form `[>= 1 occurrences of symbol b][1 occurrence of a]...` where $b > a$ ($b$ is the first character of the suffix here).

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

Let $x \geq 0$ be the smallest index where $T_{i + x} \neq T_{i + 1 + x}$. There must exist such an $x$ because the last element is unique.
If $i$ is L-type, then we definitionally need $T_{i + x} > T_{i + 1 + x}$ (as $S_i > S_{i + 1}$). Therefore, we have $T_i = T_{i + y}$ for all $0 \leq y \leq x$ and $T_i > T_{i + x + 1}$.

Now, the other direction - if $S_i$ takes the form `[x >= 1 occurrences of b] [1 occurrence of a]` where $b > a$, then $S_i > S_{i + 1}$ because $x$ is the smallest non-negative integer where $T_{i + x} \neq T_{i + 1 + x}$, and we have $T_{i + x} > T_{i + 1 + x}$.

</div>
</details>

#### Theorem 2.2

> Suffix $i$ is S-type iff $i = n$ or $T_j > T_i$ for the smallest $j \geq i$ such that $T_j \neq T_i$.

Simply put, all S-type suffixes, save for the sentinel, have the form `[>= 1 occurrences of symbol b][1 occurrence of c]...` where $b < c$.

The proof is symmetrical to 2.1.

#### Theorem 2.3

> All the positions in $T$ can be classified as L or S-type in $O(n)$. 

Denote the type of the $i$-th suffix by $Q_i$. Then: 

- $Q_n =$ S-type.
- For $i < n$:
    - If $T_i < T_{i + 1}$, $Q_i$ = S-type.
    - If $T_i > T_{i + 1}$, $Q_i$ = L-type.
    - Else, $Q_i = Q_{i + 1}$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

We simply use 2.1 and 2.2 for all $i < n$ here:

- If $T_i < T_{i + 1}$, then suffix $i$ is of the form `b c ...` where $b < c$ and therefore must be S-type.
- If $T_i > T_{i + 1}$, then suffix $i$ is of the form `b a ...` where $b > a$ and therefore must be L-type.
- If $T_i == T_{i + 1}$, then suffix $i + 1$ is either of the form `[>= 1 occurrences of b][1 occurrence of a]...` or `[>= 1 occurrences of b][1 occurrence of c]...`, and this determines its type. If we prepend one `b` to either form ($S_i = bS_{i + 1}$), then the form doesn't change and neither does the type.

</div>
</details>


#### Theorem 2.4

> If $T_i = T_j$, suffix $i$ is of L-type, and suffix $j$ is of S-type, then $S_i < S_j$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

$S_i$ has the form `[>= 1 occurrences of b] [1 occurrence of a]...` and $S_j$ has the form `[>= 1 occurrences of b][1 occurrence of c]...`. 
It's easy to see that at the smallest $x \geq 0$ where $T_{i + x} \neq T_{j + x}$, we have one of the following:

- $T_{i + x} = b, T_{j + x} = c$
- $T_{i + x} = a, T_{j + x} = b$
- $T_{i + x} = a, T_{j + x} = c$

In every case, we have $T_{i + x} < T_{j + x}$, and therefore $S_i < S_j$.

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

It's easy to see that these bucket boundaries can also be computed in $O(n)$. It might seem odd that I'm mentioning this, but it's important for the implementation later.

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


# 3. LMS-types

We define a suffix $i$ to be of **LMS-type** (i.e. "Leftmost-S-type") iff:

- $i > 0$
- Suffix $i$ is of S-type.
- Suffix $i - 1$ is of L-type.

Let $l_0 < l_1 < \dots < l_{m - 1}$ be the LMS positions of $T$.

A key observation is that there are $m \leq \frac{n + 1}{2} $ LMS positions (the existence of each LMS position "consumes" a unique L-type and S-type). As you will later see, the efficiency of SAIS is dependent on this.

#### Theorem 3.1

> If $i$ is LMS-type, then $T_{i - 1} > T_i$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

If $i$ is LMS, then $i > 0$ and $i - 1$ is L-type.
By theorem 2.3, we cannot have $T_{i - 1} \leq T_i$ because then $i - 1$ would have been S-type.

</div>
</details>


Now, let's introduce a very helpful visualisation for strings that I'll just call a "slope view". The slope view of any given string will be obtained by us drawing downward or upward slants between two adjacent suffixes based on the result of their comparison (i.e. the type of the left suffix).

Let's look at some visualisations for $T = $ `baacbcbacbccdaa$` (where `$` is the appended unique minimum). I know I said that $T$ will have integer elements, but an english alphabet string is just nicer to look at, and is no different computationally (just assign some integer to every letter).

<figure style="text-align: center;">
  <img
    src="/assets/sais/slope-view.png"
    alt="Slope view of baacbcbacbccdaa$: rising (S-type) and falling (L-type) slants between adjacent positions, with flags on the LMS valleys at positions 1, 4, 7, 9 and 15"
    style="display: block; margin: 0 auto;"
  >
  <figcaption>
    The slope-view diagram for T.
  </figcaption>
</figure>

A few observations:

- LMS-types correspond to *valleys* in the slope view.
- An upward slope (from left to right) corresponds to S-type suffixes.
- A downward slope corresponds to L-type suffixes.
- The second-last character is always L-type, as the last character is the unique minimum. Since the last position is definitionally S-type, this also implies that it's always LMS-type.

Also recall theorem 2.4. The buckets in the SA for $T$ take the following form.

<figure style="text-align: center;">
  <img
    src="/assets/sais/bucket-view.png"
    alt="Suffix array of baacbcbacbccdaa$ split into buckets by first character ($, a, b, c, d), with L-type suffixes before S-type suffixes inside each bucket"
    style="display: block; margin: 0 auto;"
  >
  <figcaption>
    The buckets for the suffix array of T.
  </figcaption>
</figure>


# 4. Induced sorting

Now, after having tunnel-visioned on the classification of these L/S types for so long, let's return to our original goal of finding $A$. Why did we do all of this? As it turns out, it's really convenient to sort L-suffixes and S-suffixes separately.

## 4.1 L-induce

Say we were tasked with producing $A$ partially, i.e. only at positions $i$ such that $A_i$ was an L-type position. Does the problem get meaningfully easier?

The observation that the entire algorithm is built upon is that *we don't need any S-type suffixes except the LMS-types to induce the sorted order of L-type suffixes*.

#### Theorem 4.1 

> Given the sorted order of LMS-suffixes (a permutation $G$ of $l_0, l_1 \dots l_{m - 1}$ where $S_{G_i} < S_{G_{i + 1}}$ for $i + 1 < m$), we can compute in $O(n)$ time all $A_i$ where $A_i$ is an L-type position. Less formally, we can fill out all the "L-buckets" of $A$ in $O(n)$ time.

The rest of subsection 4.1 will be spent realising an algorithm which does this.

Let's first consider a really inefficient procedure to sort L-type suffixes while only making use of LMS-types (besides the L-types). This is really the sort of algorithm where it's simpler to use an unambiguous, real programming language rather than pseudocode, so you'll have to bear with C++ snippets throughout.

<details><summary class ="spoiler-summary">Procedure 1</summary>
<div class = "spoiler-content">

```cpp
// Given n, T, Q, S, bucket boundaries (see code in theorem 2.4)
int n;
vector<int> T, Q, head, tail;
vector<vector<int>> S;          //suffixes

vector<int> A(n + 1, -1);

set<pair<vector<int>, int>> q;

auto extend = [&](int i) -> void
{
  int j = i - 1;
  if(j >= 0 and is_L_type(Q[j]))
    q.insert({S[j], j});
};

for(int i = 0; i <= n; i ++)
  if(is_LMS_type(Q[i]))
    q.insert({S[i], i});

while(!q.empty())
{
  auto [v, i] = *q.begin();
  q.erase(q.begin());

  //we do not place the LMS types into A
  if(is_L_type(Q[i]))
  {
    A[head[T[i]]] = i;
    head[T[i]] ++;
  }

  extend(i);
}
```

</div>
</details>

This inefficient procedure essentially does the following:
1. It first inserts all the LMS-suffixes into a heap (that uses the standard lexicographical comparator).
2. Then, it repeatedly picks the smallest suffix from the heap and:
    1. If the suffix corresponds to an L-type position $i$, it places $i$ at the first free position in the L-bucket corresponding to $T_i$ in $A$.
    2. Then, if position $i - 1$ is L-type, it inserts $S_{i - 1}$ into the heap (i.e. it extends the removed suffix by one character on the left, or equivalently in the slope-view - moves one step up to the left).

Before we prove that this procedure is correct, I encourage you to intuit why this is correct by visualising the slope view. We essentially "seed" the heap by inserting all the valley positions, and then inch up each L-type slope to the left (remember, L-type slopes slant upwards from right to left).

Anyway, why is the procedure correct?

Notice that when suffix $S_i$ is deleted from the heap, it can only result in the insertion of a *strictly greater suffix* back into the heap ($S_{i - 1}$, where $i - 1$ must be L-type, so $S_{i - 1} > S_i$. In the slope view, $i - 1$ must be above $i$). Since we always delete the smallest suffix from the heap, this implies that all suffixes to ever be inserted in the heap are deleted in non-decreasing order (for any two L or LMS-type positions $i$ and $j$, if $S_i < S_j$, then $i$ is deleted from the heap before $j$).

Now consider the manner in which we insert elements into $A$. It's easy to see that every suffix $i$ is guaranteed to be placed somewhere within the L-bucket of $i$. Within every L-bucket, suffixes are placed correctly too, as they were deleted in non-decreasing order from the heap, and therefore placed into the L-bucket in the same order.

What about coverage? Does *every* L-type position eventually get placed into $A$? Yes! Remember that the last element is always LMS-type (a valley), and therefore, every L-type position has an LMS-type position somewhere after it (more formally, every L-type position has either an L-type position or LMS-type position to its right).

Now, we make a subtle modification to this procedure that preserves correctness, but allows us to later optimise it. Consider the following:

<details><summary class ="spoiler-summary">Procedure 2</summary>
<div class = "spoiler-content">

```cpp
// Given n, T, Q, S, bucket boundaries (see code in theorem 2.4)
int n;
vector<int> T, Q, head, tail;
vector<vector<int>> S;          //suffixes

vector<int> A(n + 1, -1);       //suffix array

set<pair<vector<int>, int>> q;

auto extend2 = [&](int i) -> void
{
  int j = i - 1;
  if(j >= 0 and is_L_type(Q[j]))
  {
    A[head[T[j]]] = j;
    head[T[j]] ++;
    q.insert({S[j], j});
  }
};

for(int i = 0; i <= n; i ++)
  if(is_LMS_type(Q[i]))
    q.insert({S[i], i});

while(!q.empty())
{
  auto [v, i] = *q.begin();
  q.erase(q.begin());

  extend2(i);
}
```

</div>
</details>

What changed? Instead of placing L-type $i$ into $A$ when $S_i$ gets deleted from the heap, we place $i$ into $A$ *when it gets inserted into the heap*. When does it get inserted into the heap? When $S_{i + 1}$ is deleted.

Why is this procedure correct? First, observe that elements are still deleted from the heap in non-decreasing order.

All L-type positions are necessarily placed within their buckets in $A$, so for any two L-type positions $i$ and $j$ with $T_i < T_j$, $i$ will necessarily be placed before $j$ in $A$. Therefore, we need only show that the relative placement of L-type positions *within* buckets is correct.

Consider any two L-type positions $i$ and $j$ with $T_i = T_j = c$. Since $T_i = T_j$, $S_i < S_j \iff S_{i + 1} < S_{j + 1}$. But recall that elements are still deleted from the heap in non-decreasing order! Since $i$ and $j$ are L-type, $i + 1$ and $j + 1$ are L or LMS-type, and pass through the heap before $i$ and $j$ respectively ($S_i > S_{i + 1}$ and $S_j > S_{j + 1}$). Assume WLOG $S_{i + 1} < S_{j + 1}$. But then, $S_{i + 1}$ is deleted before $S_{j + 1}$, and $i$ is placed in the L-bucket of $c$ before $j$, just like we require. Therefore, suffixes are placed in the correct order within buckets.

This proves that the L-regions of $A$ are correctly filled by this procedure too.

Notice that our proof only relied on suffixes being deleted from the heap in non-decreasing order.

#### Theorem 4.2

> Sequentially calling `extend2(i)` on some non-decreasing sequence of suffixes $i_1, i_2, i_3, \dots$ which contains all L/LMS-type positions exactly once results in the L-regions of $A$ being correctly filled.

Now, how can we do this faster? 

First, we divorce `extend2(i)` from the heap. From this point onward, it will no longer add anything to the heap. 

Let's make use of Theorem 4.2. Imagine that we had access to some pre-built, valid $A'$. We could then simply call `extend2(A'[i])` in increasing order of $i$, where $A'_i$ was L or LMS-type. Alas, we do not have access to a pre-built $A'$... But we notice that calling `extend2(A'[i])` only possibly places an element into $A$ to the right of $i$ (so as we walk from left to right, we only place elements to our right, and there are no "circular dependencies").

What if we could do the following at the same time?:

- Build $A$.
- *Use $A$ itself as a pre-built $A'$* that we walk from left to right and call `extend2(A'[i])` on? 

Effectively (and I switch to pseudo-code now):

```python
A = [-1] * (n + 1)
for i from 0 to n:
  if (A[i] != -1) and (A[i] is L or LMS type):
    extend2(A[i])
```

This is of course incorrect, for the simple reason that everything remains -1, but the fix is smaller than you might expect. 

The problem is illustrated well by considering this procedure's equivalence to procedure 2. Remember that we delete suffixes $S_i$ in non-decreasing order. This effectively means that the position of $S_i$ in $A$ keeps increasing as time goes on, and the deletion order can be grouped like this:

- First, we delete all indices in the L-bucket of $0$ (L-suffixes that begin with $0$).
- Then, LMS indices in the S-bucket of $0$.
- Then, all indices in the L-bucket of $1$.
- Then, LMS indices in the S-bucket of $1$
- and so on

The issue here is that while we don't need the heap *at all* to handle the L-regions, it's doing critical work for us in the S-regions.

In particular, we can already modify procedure 2 to run in linear time *for the L-regions* in the following manner:

<details><summary class ="spoiler-summary">Procedure 2.5</summary>
<div class = "spoiler-content">

```python
A = [-1] * (n + 1)

put {S[i], i} for all LMS-type i into heap H

# we iterate over the first character of suffixes
for character c from 0 to n:

  # we first process the L-region of c
  let A[l, r] be the L-region for c
  for i from l to r:
    extend2(A[i])
  
  # we then process the LMS-types of c, naively
  while H is not empty and the smallest suffix in H begins with c:
    pop out {S[i], i}, the smallest element of H
    extend2(i)
```

</div>
</details>

Why is this correct? Because `extend2(i)` is called on exactly the same sequence of $i$ in both, procedure 2 and 2.5.

<details><summary class ="spoiler-summary">Annoying Proof</summary>
<div class = "spoiler-content">

We can prove this using induction. Assume that the first $k$ calls to `extend2()` are made on the exact same sequence of indices in both procedures. Then let the $k + 1$-th call in procedure 2 be on index $i$. 

1. If $i$ is LMS type: Suffix $i$ is then present within both heaps from the very beginning. We will make use of the fact that no two suffixes can be equal. Procedure 2 would have already deleted all strings strictly smaller than it from the heap (remember that it calls `extend2()` in strictly increasing order of suffixes), and since 2.5 also called `extend2()` for the same indices, it would also have deleted all suffixes smaller than $S_i$ from its own heap. Therefore, at this point of time $S_i$ must be the smallest string in procedure 2.5's heap, and we will pop it out now.   
2. If $i$ is L-type: Then it will be placed somewhere in the L-region of $T_i$. Notice that its position in both procedures is determined solely by the number of times we call `extend2(j)` for $j$ such that $j > 0, Q_{j - 1} = \text{L}, T_{j - 1} = T_i$ before we call `extend2(i + 1)`. All of these calls lie within the first $k$ calls ($i$ is L-type so $S_i > S_{i + 1}$), and are therefore the same for both procedures, implying that $i$ gets placed at the same position in both.

</div>
</details>


Looking at the second stage for each $c$, it's easy to see that the heap was only really responsible for sorting the LMS-suffixes (all insertions are before all deletions now, so we don't need its "online" nature, we just need the sorted order of all LMS suffixes). This brings us back to theorem 4.1. We don't really need the entirety of a pre-built $A'$ - we only need $G$!

Let's finally look at the L-induce procedure, which takes $G$ and computes the L-regions of $A$. An implementation choice here is that since the S-regions of $A$ are otherwise unused during this phase, we just put all LMS positions from the given $G$ at the ends of their respective S-buckets in $A$, preserving their order.

<details><summary class ="spoiler-summary">Procedure 3</summary>
<div class = "spoiler-content">

```cpp
// Given n, T, Q, and the bucket boundaries (see code in theorem 2.4)
int n;
vector<int> T, Q, head, tail;

// Of course, given G too!
vector<int> G;

vector<int> A(n + 1, -1);       //suffix array

// Seeding - we put LMS positions at the tails of their S-buckets 
reverse(G.begin(), G.end());
for(auto i : G)
  A[--tail[T[i]]] = i;

auto extend2 = [&](int i) -> void
{
  int j = i - 1;
  if(j >= 0 and is_L_type(Q[j]))
  {
    A[head[T[j]]] = j;
    head[T[j]] ++;
  }
};

// induce L positions into A
auto l_induce = [&]() -> void
{
  for(int i = 0; i <= n; i ++)
    if(A[i] != -1)
      extend2(A[i]);
};
l_induce();

// clean up LMS types from A
for(int i = 0; i <= n; i ++)
  if(A[i] != -1 and is_LMS_type(Q[A[i]]))
    A[i] = -1;
```

</div>
</details>

It's easy to see that this procedure is correct (it's just the previous procedure with the second stage for each $c$ made efficient), and that apart from the magical acquisition of $G$, it runs in $O(n)$ (placing LMS-positions into $A$, L-induce itself, cleanup).

## 4.2 S-induce

Let us now deal with the S regions. 

The basic idea is symmetrical - just like we processed L-suffixes in non-decreasing order to fill the L-regions (left to right in $A$), we will process S-suffixes in *non-increasing* order to fill the S-regions (right to left). In the slope view, we previously inched upwards on slopes that were slanted upward from right to left, after having seeded the valleys ($G$). Now, we will inch downwards on slopes that are slanted downward from right to left (remember the slant of slopes for S-suffixes). We have an advantage here though! The analogous seeds are going to be the "leftmost L" (LML) positions (peaks in the slope view), which lie in the L-regions of $A$. Since we have already computed the L-regions, we already have the analogue of $G$ here!

Anyway, let's look at the procedure and then talk about it:

<details><summary class ="spoiler-summary">Procedure 4</summary>
<div class = "spoiler-content">

```cpp
// Given n, T, Q, bucket boundaries, and A with L-regions computed
// Note that these are freshly computed bucket boundaries, not those
// modified in the L phase. 
int n;
vector<int> T, Q, head, tail, A;

auto extend3 = [&](int i) -> void
{
  int j = i - 1;
  if(j >= 0 and is_S_type(Q[j]))
  {
    tail[T[j]] --;
    A[tail[T[j]]] = j;
  }
};

// place the sentinel position separately
A[0] = n;

// induce S positions into A
auto s_induce = [&]() -> void
{
  for(int i = n; i >= 0; i --)
    if(A[i] != -1)
      extend3(A[i]);
};
s_induce();
```
</div>
</details>

Why does this work? The proof is structurally symmetric to that of L-induce (we now process strings in non-increasing order, so we go from right to left in $A$, and every call to `extend3(A[i])` can only add something to $A$ strictly before $i$), but with one caveat: coverage previously relied on the fact that every sequence of L positions ended in an LMS position (every downward slope ends in a valley), and us manually placing the LMS positions into $A$ first. The equivalent requirement here would be every upward slope ending in a peak, and us having placed every peak first. As all L regions have already been computed, all the peaks have been placed into $A$. The only source of nuisance is the very last position, which is LMS-type and doesn't have an L-type peak after it. 

Thankfully:

- $T_n$ is the unique minimum and must therefore be the very first element in $A$, so we manually place it.
- Because it's the unique minimum, $n - 1$ is L-type. Therefore, all other S-type positions have some peak after them (a "Leftmost L type"). 

I leave the formal proof of correctness to the reader, and return to the broader picture. 

We now know that just having $G$ would allow us to set off a convenient chain of events (the induction phases) which would end in $O(n)$ time, with us having computed $A$. The entire problem therefore reduces to being able to sort the LMS-suffixes efficiently.

# 5. Sorting LMS-suffixes

Okay, so how do we sort LMS suffixes efficiently? The S induce would of course give us their sorted order, but that needs the L induce, which needs the sorted order... It's a bit of a chicken-and-egg problem.

Let's think outside the box. The observant reader will remember that the number of LMS positions, $m$ is no more than $\frac{n + 1}{2}$. What if we could somehow "compress" $T$ to $T'$ of length $m$, where the $i$-th suffix of $T'$ corresponded to $S_{l_i}$, and the sorted order of the suffixes of $T'$ gave us the sorted order of the corresponding LMS-suffixes of $T$ (that is, the $i$-th suffix of $T'$ is smaller than the $j$-th, iff $S_{l_i} < S_{l_j}$)? If we could create such a $T'$, then finding its suffix array would just be an identical subproblem to our original task, but with smaller size!

Let's imagine a magical procedure `compress(T)` which gives us such a $T'$ *in linear time*. Then we can define `SA(T)`, which computes the SA of $T$ (assuming that $T$ satisfies the conditions in section 1) in the following manner:

```python
#input T satisfies properties from section 1
SA(T):
  N = |T|

  #base case
  if N == 1:
    return [0]

  T2 = compress(T)

  G = SA(T2)
  for i from 0 to |G| - 1:
    G[i] = l[G[i]]    #G[i]-th LMS position in T

  A = [-1] * (N)
  run L induce on A using G
  run S induce

  return A
```

What would the time complexity of `SA(T)`, $f(N)$ ($N = \vert T \vert$) be? We have $f(N) = O(N) + f(N/2) + O(N) + O(N) + O(N)$ (the recursive call takes $f(N/2)$ time, and every other phase takes linear time). Therefore, $f(N) = O(N) + f(N/2)$. Also, the base case is handled with $f(1) = O(1)$. Since $O(N) + O(N/2) + O(N/4) + \dots = O(N)$, we have $f(N) = O(N)$.

All that remains is to design such a `compress(T)`.

Since the $i$-th suffix of $T'$ = `compress(T)` is going to correspond to the $i$-th LMS suffix of $T$ (which starts with $l_i$), it should be reasonably intuitive that we try to assign $T'_i$ a symbol that somehow represents the substring from the $i$-th LMS position to the $(i + 1)$-th (or if $i = m - 1$, the end of the string). Note that choosing this particular substring to be represented by $T'_i$ is only a design choice here.

## 5.1 LMS Substrings

We define the **LMS-end** of position $i$, $E_i$, as the smallest LMS-position such that $i < E_i$. For $i = n$, we separately define $E_i = i$.
The **LMS-substring** of position $i$, $P_i$ is defined as $T[i, E_i]$. Additionally, we refer to $P_i$ as a "full" LMS-substring if $i$ is LMS-type.

Now, return to `compress(T)`. We wish to find a labelling function $R : \lbrace P_i \rbrace \rightarrow Z$ that will assign an integer label to each full LMS-substring such that the resultant string, $T'$ ($T'_i = R(P_{l_i})$) meets the following conditions:

1. $T'_i$ is an integer in $[0, \vert T' \vert)$
2. The last element of $T'$ is the unique minimum.
3. The $i$-th suffix of $T'$ is smaller than the $j$-th, iff $S_{l_i} < S_{l_j}$.

To recap, why do we need these conditions? The first and second are needed so that $T' =$ `compress(T)` can directly be passed to `SA(T)` (which assumes that the conditions from section 1 are met). The third is needed so that $G$ can be computed from the suffix array of $T'$.

The first and second conditions are relatively simple to satisfy, but the third isn't. A condition on $R$ that naively seems helpful for the third is $R(P_i) < R(P_j) \iff P_i < P_j$, let's try to build $R$ around it.

Consider the labelling function: $R(P_i) = \vert \lbrace P_j : P_j < P_i, Q_j = \text{LMS} \rbrace  \vert$ (the number of unique full LMS substrings that are strictly smaller than it). It trivially satisfies the first two conditions, but what about the third?

Let's compare the $i$-th and $j$-th suffixes of $T'$.

- Since the last character of $T'$ is the unique minimum, no suffix of $T'$ can be a proper prefix of another suffix.
- Therefore, consider the smallest $x \geq 0$ such that $T'_{i + x} \neq T'_{j + x}$. Clearly  $T'[i, m) < T'[j, m) \iff T'_{i + x} < T'_{j + x}$.
- Let $u = l_{i + x}, v = l_{j + x}$. Since $T'[i, i + x - 1] = T'[j, j + x - 1]$, we have $T[l_i, u) = T[l_j, v)$ (easy to prove, left as an exercise). Now, $T[l_i, n] < T[l_j, n] \iff T[u, n] < T[v, n]$.
- We know that $P_{u} \neq P_{v}$ ($T'_{i + x} \neq T'_{j + x}$). There are two cases:
  - If neither $P_{u}$ nor $P_{v}$ is a proper prefix of the other, then $ T[u, n] < T[v, n] \iff P_{u} < P_{v} \iff R(P_{u}) < R(P_{v}) \iff T'_{i + x} < T'_{j + x}$! Therefore, in this case, we have $T'[i, m) < T'[j, m) \iff T[l_i, n] < T[l_j, n]$.
  - Otherwise, WLOG assume $P_{u}$ is a proper prefix of $P_{v}$. In this case, the lex comparator says $P_{u} < P_{v} \implies R(P_{u}) < R(P_{v}) \implies T'_{i + x} < T'_{j + x} \implies T'[i, m) < T'[j, m)$. For $T'[i, m) < T'[j, m) \iff T[l_i, n] < T[l_j, n]$ to now be satisfied, we need $T[l_i, n] < T[l_j, n]$. Let's examine this in more detail.

Surprisingly, properties of the L/S classification trivialise this. Let $p = \vert P_{u} \vert$. Notice that $P_{u} = T[u, u + p - 1] = T[v, v + p - 1]$, so $T[l_i, n] < T[l_j, n] \iff T[u + p - 1, n] < T[v + p - 1, n]$. We know that $T_{u + p - 1} = T_{v + p - 1}$ and  position $(u + p - 1)$ is LMS-type (it's the end of an LMS-substring). What about position $v + p - 1$? Using theorem 3.1, $T_{u + p - 2} > T_{u + p - 1} \implies T_{v + p - 2} > T_{v + p - 1}$, so position $v + p - 2$ must be L-type. Recall that the types of positions in an LMS substring take the following form: `LMS S S S S ... L L L L LMS`. Since $P_v$ doesn't end at $v + p - 1$, position $v + p - 1$ must be L-type too!

Recall theorem 2.4! Since $S_{u + p - 1}$ and $S_{v + p - 1}$ begin with the same character, and the former is S-type while the latter is L-type, we must have $T[u + p - 1, n] > T[v + p - 1, n] \implies T[l_i, n] > T[l_j, n]$! which is... the exact opposite of what we wanted. But since the issue is so localised (i.e. in the comparison of full LMS substrings where one is a proper prefix of the other), could we make do with a localised fix?

We indeed can! We introduce the **alex** comparator, $\prec$. For strings $a$ and $b$, it is defined in the following manner:

- If $a = b$ under lex, then they're equal under alex too.
- Otherwise if neither $a$ nor $b$ is a proper prefix of the other, then $a \prec b \iff a < b$.
- Otherwise, $a \prec b \iff \vert a \vert > \vert b \vert$.

Simply put, it's just the standard lexicographical comparator, except we flip the comparison result when one string is a proper prefix of the other.

Also, we can show that alex imposes a *total order*. Why? Because $A \prec B \iff A\infty < B \infty$ and $A = B \iff A\infty = B \infty$. That is, the result of alex comparison is equal to the result of lex comparison if you append a character that's larger than all others to the end of both strings. Since lex imposes a total order, alex does too.

Redefine $R$ as $R(P_i) = \vert \lbrace P_j : P_j \prec P_i, Q_j = \text{LMS} \rbrace  \vert$, and recall the three required conditions on $R$:

1. $T'_i$ is an integer in $[0, \vert T' \vert)$ - trivially satisfied.
2. The last element of $T'$ is the unique minimum - satisfied because $P_{l_{m - 1}}$ remains the unique minimum amongst all full LMS substrings, so $R(P_{l_{m - 1}}) = 0$.
3. The $i$-th suffix of $T'$ is smaller than the $j$-th, iff $S_{l_i} < S_{l_j}$.

Consider the third condition. When we previously attempted to prove $T'[i, m) < T'[j, m) \iff T[l_i, n] < T[l_j, n]$ for $T'$ defined using the old definition of $R$ (using the regular lex comparator), there were only four relevant properties:

- For character $c$, and strings $A$ and $B$, $cA < cB \iff A < B$, and $cA = cB \iff A = B$.
- For full LMS substrings $A$ and $B$:
  - If neither was a prefix of the other, $R(A) < R(B) \iff A < B$.
  - $R(A) = R(B) \iff A = B$.
  - When $A$ is a proper prefix of $B$, we required $R(A) > R(B)$, but our old $R$ yielded $R(A) < R(B)$.

Clearly, our new definition of $R$ satisfies all four! I won't restate the entire proof again, but encourage you to go through the argument again to convince yourself of this.

## 5.2 Sorting LMS Substrings under alex

Okay, so we've finally found a suitable definition for $R$ - $R(P_i) = \vert \lbrace P_j : P_j \prec P_i, Q_j = \text{LMS} \rbrace  \vert$ where $\prec$ is the alex comparator. But how do we efficiently compute it?

What if we just sort full LMS substrings in alex order, and then label them? Namely, compute an array $X$ of length $m$ where $P_{X_i} \preceq P_{X_j} \forall i \leq j$, and $X_i$ is an LMS position in $T$ for all $i$. Consider the following procedure:

```python
N = |T|

somehow compute X

R = [-1] * N
label = -1, last = -1

for i in X:
  if last == -1 or !equal(P[last], P[i])
    label += 1
  R[i] = label
  last = i
```

One concern is that assuming $X$ is given to us, is the labelling procedure efficient? What if the `equal(A, B)` function is implemented naively, i.e. in $O(\vert A \vert + \vert B \vert)$ time? Since each full LMS substring contributes its length at most twice, and $\sum{\vert P_{l_i} \vert} = O(n)$, the total time taken is $O(n)$.

Alright, so we just need to sort full LMS substrings under alex now. It shouldn't be surprising that we'll lean on the machinery (L and S induce) we built for sorting *suffixes* previously. Further, we'll sort *all* LMS substrings, and then just extract the subsequence of full LMS substrings from this sorted order.

Let's state our goal more formally. We want to compute array $C$ of length $n + 1$, which will contain every index in $[0, n]$ exactly once, and satisfy $i \leq j \implies T[C_i, E_{C_i}] \preceq T[C_j, E_{C_j}]$. A "partial suffix array" of sorts.

Now, consider the L-induce, which was previously used to sort L-type suffixes. Can we repurpose it to sort L-type LMS-substrings instead? When we previously discussed it, we seeded $A$ with $G$, which contained the sorted order of all the LMS suffixes. Why? Because for every L-type suffix $T[i, n]$, its final position in $A$ depended on the LMS suffix $T[E_i, n]$ having been seeded correctly relative to the other LMS suffixes. In a certain sense, the position of $T[E_i, n]$ (relative to other LMS suffixes) was storing all that the L-induce needed about its value when implicitly comparing $T[i, n]$ against other suffixes. 

But now that we're sorting $T[i, E_i]$ instead of $T[i, n]$, would it do to seed our array with $T[E_i, E_i]$ instead?

The answer is yes, but we'll need to first prove some facts about LMS substrings.

#### Theorem 5.1

> For any LMS-substring $T[i, E_i]$ with $i \neq n$, its second-to-last character is strictly greater than the last.

This is just theorem 3.1 again, but it's quite fundamental to our arguments ahead, so I restate it.

#### Theorem 5.2

> If position $i$ is L-type, then $T[i + 1, E_i] \prec T[i, E_i]$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

Since position $i$ is L-type, $i + 1$ can either be L or LMS-type.

- If $i + 1$ is LMS type, then $T_i > T_{i + 1} \implies T[i + 1, E_i] \prec T[i, E_i]$
- Otherwise, $T_i \geq T_{i + 1}$.
  - If $T_{i} > T_{i + 1}$, then $T[i + 1, E_i] \prec T[i, E_i]$ trivially.
  - Otherwise, we know that for the smallest $x \geq 0$ where $T_{i + x} \neq T_{i + x + 1}$, we have $T_{i + x} > T_{i + x + 1}$ (definition of L-type suffixes). Since $T_{E_i - 1} \neq T_{E_i}$, we must have $i + x + 1 \leq E_i$, and the two strings differ before either ends.

</div>
</details>


#### Theorem 5.3

> (Analogue of theorem 2.4) If $T_i = T_j$, suffix $i$ is of L-type, and suffix $j$ is of S-type, then $P_i \prec P_j$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

Consider the proof of theorem 2.4. It applies to any strings which have prefixes of the form `[>= 1 occurrences of b][1 occurrence of a]...` and `[>= 1 occurrences of b][1 occurrence of c]...` respectively. We know that $S_i$ and $S_j$ have this form, but do $P_i$ and $P_j$ do?

Since $P_i$ is a prefix of $S_i$, the only way it cannot be of this form is if it consists only of $b$-s. But since $P_i = T[i, E_i]$ contains both $T_{E_i - 1}$ and $T_{E_i}$, and $T_{E_i - 1} > T_{E_i}$, it cannot possibly consist of only one character.

The same argument applies to $P_j$.

Therefore, the two must have the same form and the proof of theorem 2.4 applies.

</div>
</details>

Consequently, $C$ can be divided into buckets just like $A$. That is, it takes the following form:

- First, we have L-type suffixes that start with symbol $0$.
- Then, we have S-type suffixes that start with symbol $0$.
- Then, L-type suffixes that start with symbol $1$.
- Then, S-type suffixes that start with symbol $1$.
- Then, L-type suffixes that start with symbol $2$.
- Then, S-type suffixes that start with symbol $2$.
- ...and so on

Now, let's try to adapt our old procedure 2 to produce $C$:

<details><summary class ="spoiler-summary">Procedure 5</summary>
<div class = "spoiler-content">

```python
C = [-1] * (n + 1)

put {T[i, i], i} for all LMS-type i into heap H, which uses the alex comparator

# just like our previous extend2 function, except here we insert T[j, E[j]] into the heap
def extend2(i):
  j = i - 1
  if (j >= 0) and (position j is L-type)
    place j in the first empty position of the bucket of T[j] in C
    put {T[j, E[j]], j} into H

while H is not empty:
  pop out {v, i}, the smallest element of H
  extend2(i)
```

</div>
</details>

The proof for procedure 5 correctly filling the L-regions of $C$ is quite similar to that for procedure 2 correctly producing $A$.

First, notice that the deletion of any string from the heap can only result in the insertion of a strictly larger substring under alex (or no insertion at all):
- If the string being deleted is $T[i, i]$ with LMS $i$, then by theorem 5.1, we have $T[i, i] \prec T[i - 1, E_{i - 1}]$.
- Otherwise, $T[i, E_i]$ ($i$ is L-type) being deleted results in the insertion of $T[i - 1, E_{i - 1}]$, then $T[i, E_i] \prec T[i - 1, E_{i - 1}]$ (theorem 5.2).

Since we always erase the alex-smallest substring from the heap, the order in which we delete LMS substrings from the heap is alex-non-decreasing. Coverage (every L-type LMS substring is inserted into the heap at some point) is also guaranteed for the same reason as before.

Now, consider any two L-type LMS substrings $T[i, E_i]$ and $T[j, E_j]$. We will show that their relative position in $C$ aligns with the result of their comparison under alex.

- If $T[i, E_i] = T[j, E_j]$, then their relative order doesn't matter.
- Otherwise, if $T_i \neq T_j$, WLOG assume $T_i < T_j$. Then we necessarily have $T[i, E_i] \prec T[j, E_j]$, and the two are placed in different buckets, with the former's bucket lying to the left of the latter's.
- Otherwise, if $T_i = T_j$, then $T[i, E_i]$ and $T[j, E_j]$ will be placed in the same bucket. Recall that for any character $c$ and strings $A, B$, we have $cA \prec cB \iff A \prec B$. Therefore, $T[i, E_i] \prec T[j, E_j] \iff T[i + 1, E_i] \prec T[j + 1, E_j]$. Note that we cannot have $T[i + 1, E_i] = T[j + 1, E_j]$ here. Consider the other two cases
  - If $T[i + 1, E_i] \prec T[j + 1, E_j]$, then the former is deleted before the latter from the heap, and $T[i, E_i]$ is placed in their common bucket before $T[j, E_j]$. Since we also have $T[i + 1, E_i] \prec T[j + 1, E_j] \implies T[i, E_i] \prec T[j, E_j]$ here, their relative order in $C$ is valid.
  - If $T[j + 1, E_j] \prec T[i + 1, E_i]$, then the former is deleted before the latter from the heap, and $T[j, E_j]$ is placed in their common bucket before $T[i, E_i]$. Since we also have $T[j + 1, E_j] \prec T[i + 1, E_i] \implies T[j, E_j] \prec T[i, E_i]$ here, their relative order in $C$ is valid.

This implies $i \leq j \implies T[C_i, E_{C_i}] \preceq T[C_j, E_{C_j}]$ for the placed L-type LMS substrings $C_i, C_j$ so far.

The observant reader will have noticed that our arguments have been almost identical to the initial use of L-induce. We shall continue in a similar vein. Consider this optimised version of procedure 5 (adapted from procedure 2.5):

<details><summary class ="spoiler-summary">Procedure 5.5</summary>
<div class = "spoiler-content">

```python
C = [-1] * (n + 1)

put {T[i, i], i} for all LMS-type i into heap H

# once again, we don't place anything into the heap any more
def extend2(i):
  j = i - 1
  if (j >= 0) and (position j is L-type)
    place j in the first empty position of the bucket of T[j] in C

# we iterate over the first character of the suffix
for character c from 0 to n:

  # we first process the L-region of c
  let C[l, r] be the L-region for c
  for i from l to r:
    extend2(C[i])
  
  # we then process the LMS-types of c, naively
  while H is not empty and the smallest string in H begins with c:
    pop out {T[i, i], i}, the smallest element of H
    extend2(i)
```

</div>
</details>

Why is this correct? The proof is almost identical to that of procedure 2.5 - `extend2(i)` is called over the same sequence of $i$. The only subtlety is that while the strings in 2.5 were suffixes and could therefore not be equal to each other, strings here can be equal. Fortunately, the order in which equal strings are processed doesn't matter at all (so it's technically not the exact same sequence of $i$, you can swap indices which correspond to the same string). All of this should be fairly natural by now, so I'll leave the formal proof to the reader.

Now, recall that at this point in the old L-induce, we revealed the need for $G$, as in procedure 2.5, we *needed* the heap to sort the LMS suffixes $T[E_i, n]$ for us. But now? We're only using the heap to sort $T[E_i, E_i]$! There's no chicken-and-egg problem like before with $T[E_i, n]$, because since these are just length-1 strings, we can easily sort them in $O(n)$ using counting-sort instead!

This allows us to easily optimise procedure 5.5 to the following $O(n)$ procedure (note that we don't explicitly sort $T[E_i, E_i]$, instead we just place each LMS position at the tail of its respective bucket).

<details><summary class ="spoiler-summary">Procedure 6</summary>
<div class = "spoiler-content">

```cpp
// Given n, T, Q, and the bucket boundaries (see code in theorem 2.4)
int n;
vector<int> T, Q, head, tail;

vector<int> C(n + 1, -1);

// Seeding - we put LMS positions at the tails of their S-buckets 
for(int i = 0; i <= n; i ++)
  if(is_LMS_type(Q[i]))
    C[--tail[T[i]]] = i;

auto extend2 = [&](int i) -> void
{
  int j = i - 1;
  if(j >= 0 and is_L_type(Q[j]))
  {
    C[head[T[j]]] = j;
    head[T[j]] ++;
  }
};

// induce L positions into C
auto l_induce = [&]() -> void
{
  for(int i = 0; i <= n; i ++)
    if(C[i] != -1)
      extend2(C[i]);
};
l_induce();

// clean up LMS types from C
for(int i = 0; i <= n; i ++)
  if(C[i] != -1 and is_LMS_type(Q[C[i]]))
    C[i] = -1;
```

</div>
</details>

The justification of its correctness is basically identical to that of procedure 3, and is left as an exercise to the reader.

Now that we have filled the L-regions of $C$, we turn our attention back to the S-induce. A (perhaps) surprising fact - we don't need to change anything at all in procedure 4. Once again, the proof is very similar to what we've done before (one change to note is that the position of an L-type $i$ within the suffix array previously encoded information about $S_i$, but now encodes information about $P_i$), and is left as an exercise to the reader.

And... we end up with $C$, correctly and efficiently computed.

# 6. Putting it all together

Let's finally assemble our algorithm from the pieces we've painstakingly built:

```python
# T satisfies conditions from section 1
SA(T):
  N = |T|
  n = N - 1

  if N == 1:
    return [0]

  classify L, S, LMS types in O(n)

#PHASE 1: sort LMS substrings under alex
  C = [-1] * (n + 1)
  seed C with T[i, i] for all LMS positions i, in O(n)
  run L induce on C   # we compute fresh bucket boundaries before every L and S induce
  run S induce on C

#PHASE 2: construct T2 and sort its suffixes to get G
  #label full LMS substrings
  R = [-1] * (n + 1)
  label = -1, last = -1
  for i from 0 to n:
    if C[i] is LMS type:
      j = C[i]
      if last == -1 or !equal(last, j):     #equal(i, j) compares P[i] and P[j]
        label += 1
      R[j] = label
      last = j
  #construct T2 and sort its suffixes
  T2 = []
  for i from 0 to n:
    if i is LMS type:
      T2.append(R[i])
  A2 = SA(T2)
  #construct G from A2
  G = A2
  for i from 0 to |G| - 1:
    G[i] = l[G[i]]  #l[i] is i-th LMS position in T

#PHASE 3: seed A with G and run the final L and S induce 
  A = [-1] * (n + 1)
  seed A with G
  run L induce on A
  run S induce on A

  return A
```

My own [implementation](https://github.com/welcome-to-the-sunny-side/libra/blob/main/string/suffix_array.cpp) of SAIS was unfortunately created before I wrote this blog, and doesn't really follow the exposition, but here's a highly readable one by my friend Opus 5.5 that does:

<details><summary class ="spoiler-summary">Code</summary>
<div class = "spoiler-content">

```cpp
#include <bits/stdc++.h>
using namespace std;

// Types of positions (section 2, 3). An LMS position is also S-type.
enum Type : uint8_t { L_TYPE, S_TYPE, LMS_TYPE };

// Computes the suffix array of T.
// T must satisfy the conditions from section 1: with n = |T| - 1,
//   - T[n] == 0 is the sentinel (the unique minimum), and
//   - T[i] lies in [1, n] for all i < n.
vector<int> SA(const vector<int> &T)
{
    const int N = (int)T.size(), n = N - 1;

    // base case
    if(N == 1)
        return {0};

    // ---------------------------------------------------------------
    // Classify positions as L / S / LMS (theorem 2.3, section 3)
    // ---------------------------------------------------------------
    vector<Type> Q(N);
    Q[n] = S_TYPE;
    for(int i = n - 1; i >= 0; i --)
    {
        if(T[i] < T[i + 1])
            Q[i] = S_TYPE;
        else if(T[i] > T[i + 1])
            Q[i] = L_TYPE;
        else
            Q[i] = Q[i + 1];
    }

    vector<int> l;      // l[k] = k-th LMS position, so l = {l_0 < l_1 < ... < l_{m - 1}}
    for(int i = 1; i <= n; i ++)
        if(Q[i] == S_TYPE and Q[i - 1] == L_TYPE)
        {
            Q[i] = LMS_TYPE;
            l.push_back(i);
        }
    const int m = (int)l.size();

    auto is_L = [&](int i) { return Q[i] == L_TYPE; };
    auto is_S = [&](int i) { return Q[i] != L_TYPE; };
    auto is_LMS = [&](int i) { return Q[i] == LMS_TYPE; };

    // ---------------------------------------------------------------
    // Bucket boundaries (section 2): the bucket for symbol c is [head[c], tail[c])
    // ---------------------------------------------------------------
    vector<int> cnt(N, 0);      // symbols lie in [0, n]
    for(int x : T)
        cnt[x] ++;

    // induce L/S both modify the boundaries, so we hand out fresh copies every time
    auto get_buckets = [&](vector<int> &head, vector<int> &tail) -> void
    {
        head.assign(N, 0);
        tail.assign(N, 0);
        for(int c = 0, sum = 0; c < N; c ++)
        {
            head[c] = sum;
            sum += cnt[c];
            tail[c] = sum;
        }
    };

    // ---------------------------------------------------------------
    // Induced sorting (section 4)
    //
    // `seeds` contains the LMS positions, in sorted order. Returns the array
    // obtained by seeding them at the tails of their S-buckets, then running
    // L-induce (procedure 3) followed by S-induce (procedure 4).
    //
    // Phase 1 and phase 3 differ *only* in the seeds they pass here.
    // ---------------------------------------------------------------
    auto induced_sort = [&](const vector<int> &seeds) -> vector<int>
    {
        vector<int> A(N, -1);
        vector<int> head, tail;

        // seeding: walk the seeds from largest to smallest, filling each S-bucket from its tail
        get_buckets(head, tail);
        for(int k = (int)seeds.size() - 1; k >= 0; k --)
        {
            int i = seeds[k];
            A[-- tail[T[i]]] = i;
        }

        // L-induce: walk left to right; if A[i] - 1 is L-type, append it to the
        // first free slot of its L-bucket (this is extend2)
        for(int i = 0; i < N; i ++)
        {
            if(A[i] == -1)
                continue;
            int j = A[i] - 1;
            if(j >= 0 and is_L(j))
                A[head[T[j]] ++] = j;
        }

        // clean up: remove the seeded LMS positions, the S-induce places them again
        for(int i = 0; i < N; i ++)
            if(A[i] != -1 and is_LMS(A[i]))
                A[i] = -1;

        // S-induce: walk right to left; if A[i] - 1 is S-type, prepend it to the
        // last free slot of its S-bucket (this is extend3)
        get_buckets(head, tail);
        A[0] = n;               // the sentinel is the smallest suffix, place it manually
        for(int i = n; i >= 0; i --)
        {
            if(A[i] == -1)
                continue;
            int j = A[i] - 1;
            if(j >= 0 and is_S(j))
                A[-- tail[T[j]]] = j;
        }

        return A;
    };

    // ---------------------------------------------------------------
    // PHASE 1: sort all LMS substrings under alex (section 5.2)
    //
    // Seeding with T[i, i] for each LMS position i: these are single
    // characters, so any order works, as long as each one lands in its own
    // bucket (procedure 6).
    // ---------------------------------------------------------------
    vector<int> C = induced_sort(l);

    // ---------------------------------------------------------------
    // PHASE 2: label full LMS substrings, build T2, recurse (sections 5.1, 6)
    // ---------------------------------------------------------------

    // equal(i, j) checks whether P_i == P_j for LMS positions i != j.
    // P_i = T[i, E_i] ends at the next LMS position, so we walk both substrings
    // together until one of them ends. They are equal iff both end at the same
    // offset with all characters equal along the way.
    // (If one of them is the sentinel n, the very first characters differ, so
    // we never read past the end of T.)
    auto equal = [&](int i, int j) -> bool
    {
        for(int k = 0; ; k ++)
        {
            if(T[i + k] != T[j + k])
                return false;
            bool end_i = (k > 0 and is_LMS(i + k));
            bool end_j = (k > 0 and is_LMS(j + k));
            if(end_i or end_j)
                return end_i and end_j;
        }
    };

    // walk C (which is alex-sorted) and give equal full LMS substrings equal labels
    // R[i] = label of P_i, for LMS positions i
    vector<int> R(N, -1);
    int label = -1, last = -1;
    for(int k = 0; k < N; k ++)
    {
        int j = C[k];
        if(!is_LMS(j))
            continue;
        if(last == -1 or !equal(last, j))
            label ++;
        R[j] = label;
        last = j;
    }
    // C[0] = n is the first LMS position seen, so the sentinel gets label 0,
    // and every other label lies in [1, m - 1]: T2 satisfies section 1

    // T2[k] = label of the k-th full LMS substring
    vector<int> T2(m);
    for(int k = 0; k < m; k ++)
        T2[k] = R[l[k]];

    // G = LMS positions in sorted order of their suffixes
    vector<int> G = SA(T2);
    for(int k = 0; k < m; k ++)
        G[k] = l[G[k]];

    // ---------------------------------------------------------------
    // PHASE 3: seed with G and induce the actual suffix array (section 4)
    // ---------------------------------------------------------------
    return induced_sort(G);
}

// Convenience wrapper for arbitrary non-negative input: s[i] in [0, K).
// Remaps s to satisfy section 1 in O(n + K), and drops the sentinel from the result.
vector<int> suffix_array(const vector<int> &s, int K)
{
    const int n = (int)s.size();

    // rank[x] = 1 + number of distinct symbols in s smaller than x
    vector<int> rank(K, 0);
    for(int x : s)
        rank[x] = 1;
    for(int x = 0, r = 0; x < K; x ++)
        if(rank[x])
            rank[x] = ++ r;

    vector<int> T(n + 1);
    for(int i = 0; i < n; i ++)
        T[i] = rank[s[i]];
    T[n] = 0;

    vector<int> A = SA(T);
    return vector<int>(A.begin() + 1, A.end());     // A[0] is always the sentinel
}
```

</div>
</details>
