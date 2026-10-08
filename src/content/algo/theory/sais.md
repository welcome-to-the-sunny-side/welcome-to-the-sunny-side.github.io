---
displayMode: blog
title: "Suffix arrays in O(n) using SAIS"
date: 2026-08-11
tags: [algorithm]
---

# Introduction

While the usual $O(n \log{n})$ suffix array algorithm described [here](https://cp-algorithms.com/string/suffix-array.html) suffices for almost all of one's competitive-programming needs, suffix structures turn out to be useful in several other fields which require faster algorithms. Lossless compression is one such field, and I happened to need a faster SA algorithm in an LZ-compressor I've [been working on recently](https://github.com/welcome-to-the-sunny-side/misa77).

In this blog, we'll learn how to build suffix arrays in linear time, using the algorithm I learned for this purpose. It's called SAIS ("Suffix Array by Induced Sorting"), and was originally described [in this paper](https://ieeexplore.ieee.org/document/4976463).

# 1. Preliminaries

We have a string $T$ of length $n$.

For the sake of convenience:

- We assume that $T_i \in \lbrace 1, 2, \dots n \rbrace$ for all $ i \in [0, n)$.
- We add a unique sentinel element with value $0$ at the end of $T$. Note that this sentinel is the unique minimum in $T$ and the length now becomes $n + 1$.
- We define $S_i$ to be the $i$-th suffix, ie. $T_i T_{i + 1} \dots T_n$. At several places ahead, I will simply use "$i$-th suffix" or "suffix $i$" to refer to $S_i$.

The goal is to construct the suffix array of $T$ in $O(n)$ time. The suffix array is defined as the array $A$ of length $n + 1$, where $A_i$ corresponds to the index of the $i$-th smallest suffix amongst all suffixes of $T$ (when compared lexicographically). One can note that the last character being unique ensures that no suffix is a prefix of another.

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

Let $l_0 < l_1 < \dots < l_{m - 1}$ be the LMS positions of $T$.

A key observation is that there are $m \leq \frac{n + 1}{2} $ LMS positions (the existence of each LMS position "consumes" a unique L-type and S-type). As you will later see, the efficiency of SAIS is dependent on this.

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
- An upward slope (from left to right) corresponds to S-type suffixes.
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


# 4. Induced sorting

Now, after having tunnel visioned on the classification of these L/S types for so long, let's return to our original goal of finding $A$. Why did we do all of this? As it turns out, it's really convenient to sort L-suffixes and S-suffixes separately.

## 4.1 L-induce

Say we were tasked with producing $A$ partially, i.e. only at positions $i$ such that $A_i$ was an L-type position. Does the problem get meaningfully easier?

The observation that the entire algorithm is built upon is that *we don't need any S-type suffixes except the LMS-types to induce the sorted order of L-type suffixes*.

### Theorem 4.1 

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

Consider any two L-type positions $i$ and $j$ with $T_i = T_j = c$. Since $T_i = T_j$, $(S_i < S_j) \iff (S_{i + 1} < S_{j + 1})$. But recall that elements are still deleted from the heap in non-decreasing order! Since $i$ and $j$ are L-type, $i + 1$ and $j + 1$ are L or LMS-type, and pass through the heap before $i$ and $j$ respectively ($S_i > S_{i + 1}$ and $S_j > S_{j + 1}$). Assume WLOG $S_{i + 1} < S_{j + 1}$. But then, $S_{i + 1}$ is deleted before $S_{j + 1}$, and $i$ is placed in the L-bucket of $c$ before $j$, just like we require. Therefore, suffixes are placed in the correct order within buckets.

This proves that the L-regions of $A$ are correctly filled by this procedure too.

Notice that our proof only relied on suffixes being deleted from the heap in non-decreasing order.

### Theorem 4.2

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

Why is this correct? Because `extend2(i)` is called on exactly the same sequence of $i$ in both, procedure 2 and 2.5. You might feel some discomfort at us calling `extend2(A[i])` though - are we really sure that `A[i]` has been correctly computed yet? Assume that it hasn't been correctly computed, and consider the first occurrence of this happening for our $T$ as we run 2.5. Notice that until this point, both procedures would have called `extend2()` on exactly the same set of $i$ in the same order, and since $A_i$ would have been computed by this point (we would be deleting $S_{A_i}$ from the heap in procedure 2 at this point), `A[i]` would have been correctly computed in this new procedure too.

Looking at the second stage for each $c$, it's easy to see that the heap was only really responsible for sorting the LMS-suffixes (all insertions are before all deletions). This brings us back to theorem 4.1. We don't really need the entirety of a pre-built $A'$ - we only need $G$!

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

The basic idea is symmetrical - just like we processed suffixes in non-decreasing order to fill the L-regions (left to right in $A$), we will process them in non-increasing order to fill the S-regions (right to left). In the slope view, we inched upwards on slopes that were slanted upward from right to left, after having seeded the valleys ($G$). Now, we will inch downwards on slopes that are slanted downward from right to left (remember the slant of slopes for S-suffixes). We have an advantage here though! The analagous seeds are going to be the "leftmost L, LML" positions (peaks in the slope view), which lie in the L-regions of $A$. Since we have already computed the L-regions, we already have the analogue of $G$ here!

Anyway, let's look at the procedure and then discuss in more formally in brief:

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

- $T_n$ is the unique minimum and must therefore be the very first element in $X$, so we manually place it.
- Because it's the unique minimum, $n - 1$ is L-type, and must be part of an upward slope that culminates in a peak before any L position occurs. Therefore, all other S-type positions have some peak after them. 

I leave the formal proof of correctness to the reader, and return to the broader picture. 

We now know that just having $G$ would allow us to set off a convenient chain of events (the induction phases) which would end in $O(n)$ time, with us having computed $A$. The entire problem therefore reduces to being able to sort the LMS-suffixes efficiently.

# 5. Sorting LMS-suffixes

Okay, so how do we sort LMS suffixes efficiently? The S induce would of course give us their sorted order, but that needs the L induce, which needs the sorted order... It's a bit of a chicken-and-egg problem.

Let's think outside the box. The observant reader will remember that the number of LMS positions, $m$ is no more than $\frac{n + 1}{2}$. What if we could somehow "compress" $T$ to $T'$ of length $m$, where the $i$-th suffix of $T'$ corresponded to $S_{l_i}$, and the sorted order of the suffixes of $T'$ gave us the sorted order of the corresponding LMS-suffixes of $T$? If we could create such a $T'$, then finding its suffix array would just be an identical subproblem to our original task, but with smaller size!

Let's imagine a magical procedure `compress(T)` which gives us such a $T'$ *in linear time*. Then we can define `SA(T)`, which computes the SA of $T$ (assuming that $T$ satisfies the conditions in section 1) in the following manner:

```python
SA(T):
  T2 = compress(T)

  G = SA(T2)
  for i from 0 to |G| - 1:
      G_i = (G_i)-th lms position of T

  A = [-1] * (n)
  run L induce on A using G
  run S induce

  return A
```

What would the time complexity of `SA(T)`, $f(n)$ ($n = \vert T \vert$) be? We have $f(n) = O(n) + f(n/2) + O(n) + O(n) + O(n)$ (the recursive call takes $f(n/2)$ time, and every other phase takes linear time). Therefore, $f(n) = O(n) + f(n/2)$. It's also easy to see that $f(1) = O(1)$ (when the string has size 1, the suffix array is trivial and we handle it separately). Since $O(n) + O(n/2) + O(n/4) + \dots = O(n)$, we have $f(n) = O(n)$.

All that remains is to design such a `compress(T)`.

## 5.1 LMS Substrings

Since the $i$-th suffix of $T'$ = `compress(T)` is going to correspond to the $i$-th LMS suffix of $T$ (which starts with $l_i$), it should be reasonably intuitive that we try to assign $T'_i$ a symbol that somehow represents the substring from the $i$-th lms position to the $(i + 1)$-th (or to the end of the string).

We define the **LMS-end** of position $i$, $E_i$, as the leftmost LMS-position such that $i < E_i$. For $i = n$, we separately define $E_i = i$.
The **LMS-substring** of position $i$, $P_i$ is defined as $T[i, E_i]$. Additionally, we refer to $P_i$ as a "full" LMS-substring if $i$ is LMS-type.

Some simple observations:

- In the slope-view, $P_i$ is just the substring starting at $i$, and ending at the first valley after $i$ ($E_i$).
- Since the last position in the string is LMS-type, all $E_i$ and $P_i$ are well-defined.




I won't pretend to offer motivation on how sorting LMS-substrings is important at this point. I just request that you trust me on this being important for sorting LMS-suffixes.

Recall that the suffix array $A$ gives us the position of each string in sorted order of all suffixes $T[i, n]$. Our goal in this section is to produce a "partially sorted" suffix array $X$, which gives us the position of each string in the sorted order of all LMS-substrings $P_i = T[i, E_i]$ ("partially sorted" because we only sort suffixes up to the ends of their LMS-substrings). 



Let's now define LMS-substrings.





---
EVERYTHING BELOW IS OUTDATED, TO BE REWORKED


# 4. Sorting LMS-substrings

I won't pretend to offer any motivation on why sorting LMS-substrings is important at this point. I just request that you trust me when I say it's important. The deeper reason behind this will become apparent when you internalise the entire algorithm.

Recall that the suffix array $A$ gives us the position of each string in sorted order of all suffixes $T[i, n]$. Our goal in this section is to produce a "partially sorted" suffix array $X$, which gives us the position of each string in the sorted order of all LMS-substrings $P_i = T[i, E_i]$ ("partially sorted" because we only sort suffixes up to the ends of their LMS-substrings). 

Note that unlike with entire suffixes, certain LMS substrings might be prefixes of others. We define a new comparator $\prec$ for strings $a$ and $b$, called **alex** (and we use $<$ for regular lexicographical comparison), in the following manner:

- If either $a$ or $b$ is a prefix of the other:
    - If $\vert a \vert = \vert b \vert$, then $a = b$ under alex.
    - Else, $a \prec b$ iff $\vert a \vert > \vert b \vert$.
- Else, $a \prec b$ iff $a < b$.

(so essentially lex comparison but with the opposite result for proper-prefixes)

A simple observation (that we'll use a lot!):

> For any strings $A, B$ and character $c$, the result of alex comparison of $A$ and $B$ is equal to that of $cA$ and $cB$.

Call a sequence **alex-valid** if for any pair of strings $a$ and $b$ (with $a$ occurring before $b$ in the sequence), either $a = b$, or $a \prec b$. Our goal is to find an alex-valid $X$.

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

> If $i$ and $j$ ($i < j$) lie on the same "downward slope" (i.e. $i$ is L-type and there lie no S-type positions between $i$ and $j$), then $P_j < P_i$, and neither is a prefix of the other (so $P_j \prec P_i$ too).

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">
[tba]
</div>
</details>

### Theorem 4.3

> If $T_i = T_j$, suffix $i$ is of L-type, and suffix $j$ is of S-type, then $P_i < P_j$, and neither is a prefix of the other (so $P_i \prec P_j$ too).

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

//ASSUME THAT THE C++ COMPARATOR FOR VECTOR<INT> IS ALEX!!!
set<pair<vector<int>, int>> q;

auto extend = [&](int i) -> void
{
  int j = i - 1;
  if(j >= 0 and is_L_type(Q[j]))
    q.insert({P[j], j});
};

for(int i = 0; i <= n; i ++)
  if(is_LMS_type(Q[i]))
    q.insert({{T[i]}, i});

while(!q.empty())
{
  auto [v, i] = *q.begin();
  q.erase(q.begin());

  //we do not place the LMS types into X 
  if(is_L_type(Q[i]))
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
2. Then, it repeatedly picks the smallest substring from the heap (assuming the alex comparator) and:
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

From theorem 4.2, $P_i \prec P_{i - 1}$ when $i - 1$ and $i$ lie on the same downward slope (also, $T[i, i] \prec P_{i - 1}$ when $i$ is LMS-type from theorem 4.1). In our procedure, the selection of $\lbrace P_i, i \rbrace$ (or $T[i, i]$ when $i$ is LMS-type) from the heap only results in the insertion of $\lbrace P_{i - 1}, i - 1 \rbrace$ if $i - 1$ and $i$ lie on the same downward slope. Therefore, the deletion of an element from the heap can only result in the insertion of a *strictly greater* element under the alex comparator.
Since we always delete the smallest element from the heap, this implies that all elements to ever be inserted in the heap are deleted in non-decreasing alex order (for any two L-type positions $i$ and $j$, if $P_i \prec P_j$, then $i$ is deleted from the heap before $j$).

Consider the placement of L-type positions within $X$. For any character $c$, we know that all L-type LMS-substrings that begin with $c$ (a) will be deleted from the heap in non-decreasing order and (b) lie within the L-prefix of $c$'s bucket in $X$ (theorem 4.3). Therefore, step 2.1 is correct (placing L-type position $i$ at the first available position in the bucket of $T_i$ in $X$, when we're deleting $\lbrace P_i, i \rbrace$ from the heap).

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


//ASSUME THAT THE C++ COMPARATOR FOR VECTOR<INT> IS ALEX!!!
set<pair<vector<int>, int>> q;

auto extend2 = [&](int i) -> void
{
  int j = i - 1;
  if(j >= 0 and is_L_type(Q[j]))
  {
    X[head[T[j]]] = j;
    head[T[j]] ++;
    q.insert({P[j], j});
  }
};

for(int i = 0; i <= n; i ++)
  if(is_LMS_type(Q[i]))
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

Why is this procedure correct? First, observe that elements are still deleted from the heap in non-decreasing alex order.

All L-type positions are necessarily placed within their buckets in $X$, so for any two L-type positions $i$ and $j$ with $T_i < T_j$, $i$ will necessarily be placed before $j$ in $X$. Therefore, we need only show that the relative placement of L-type positions *within* buckets is correct.

Consider any two L-type positions $i$ and $j$ with $T_i = T_j = c$. 

- If $P_i = P_j$, then their relative order in $X$ doesn't matter (recall alex-validity).
- Else if WLOG $P_i$ is a proper prefix of $P_j$, $P_j \prec P_i$. Notice that then $T[i + 1, E_i]$ must be a proper prefix of $T[j + 1, E_j]$ and $T[j + 1, E_j] \prec T[i + 1, E_i]$. Since substrings are deleted in non-decreasing alex order, `extend2(j + 1)` is called before `extend2(i + 1)`, and $j$ is correctly placed into $X$ before $i$.
- Else, $T[i + 1, E_i] \neq T[j + 1, E_j]$. Assume WLOG $T[i + 1, E_i] < T[j + 1, E_j]$. As substrings are deleted from the heap in non-decreasing alex order, `extend2(i + 1)` is called before `extend2(j + 1)`, so $i$ occurs before $j$ in their bucket in $X$. Since $P_i = c + T[i + 1, E_i]$ and $P_j = c + T[j + 1, E_j]$, we have $P_i < P_j$. As $P_i < P_j$ and $i$ occurs before $j$ in $X$, their relative order is correct.

Just like procedure 1, all L-type positions are eventually placed into $X$.

This proves that the L-regions of $X$ are correctly filled by this procedure too.

Notice that our proof only relied on substrings being deleted from the heap in non-decreasing alex order.

### Theorem 4.4 

> Sequentially calling `extend2(i)` on some alex-valid sequence $i_1, i_2, i_3, \dots$ (an index $i_j$ represents $P_{i_j}$ if $i_j$ is L-type, and $T[i_j, i_j]$ otherwise) which contains all L/LMS-type positions exactly once results in the L-regions of $X$ being correctly filled.

Now, how can we do this faster? 

Let's make use of Theorem 4.4. Imagine that we had access to some pre-built, valid $X'$. We could then simply call `extend2(X'[i])` in increasing order of $i$, where $X'_i$ was L or LMS-type. Alas, we do not have access to a pre-built $X'$... But we notice that calling `extend2(X'[i])` only possibly places an element into $X$ to the right of $i$ (so as we walk from left to right, we only place elements to our right, and there are no "circular dependencies").

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
  if(is_LMS_type(Q[i]))
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
  if(X[i] != -1 and is_LMS_type(Q[X[i]]))
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

Why is this valid? In this context, any LMS-type position $i$ just corresponds to string $T[i, i]$, that is, a single character $c$. By Theorem 4.4, we just need alex-validity for $X$. Consider any character $c$ and its bucket (all strings that begin with $c$). It's easy to see that for any bucket within an alex-valid sequence, all the length-1 strings must be at the end of their buckets (and they're alex-equal to each other, so their relative order can be anything). In this context, all the substrings corresponding to L-type positions will have a length of at least 2. Therefore, this initial placement is safe.  

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

Ok, so we've shown that every L-position eventually gets inserted into $X$, but zoom out a bit - is it still true that the L-regions in $X$ are being filled in an alex-valid manner?

Recall the proof of Theorem 4.4. All we needed was an alex-valid sequence to repeatedly call `extend2()` upon. Consider the sequence formed by filled entries in any intermediate state of $X$ after any number of `extend2()` operations in `l_induce()`.

We can show that all such intermediate sequences are alex-valid by induction.

- The base case is the initial placement of the LMS positions. This placement is trivially alex-valid due to buckets.
- Consider the inductive step - a position $i$ that gets placed into $X$ due to the call `extend2(i + 1)`. The intermediate sequence before this step was alex-valid. Does it still remain alex valid? Let's compare $P_i$ to all the already placed strings:
  - For placed $j$ such that $T_i \neq T_j$, their relative order is trivially correct due to bucketing.
  - For placed LMS positions $j$ with $T_i = T_j$, their relative order doesn't violate alex-validity (as shown previously for length-1 strings).
  - For placed L-position $j$ with $T_i = T_j = c$, $j$ lies behind $i$ in $X$ (as `head[T[i]]` only increases). This implies that $T[i + 1, E_i]$ occurred after $T[j + 1, E_j]$ in $X$ (as `extend2(i + 1)` is called after `extend2(j + 1)`). Since the sequence was previously alex-valid, we have $T[j + 1, E_j] \preceq T[i + 1, E_i]$. But then $c + T[j + 1, E_j] \preceq c + T[i + 1, E_i] \implies P_j \preceq P_i$, and therefore placing $i$ after $j$ in $X$ doesn't violate alex-validity.

Therefore, the final filled sequence in $X$ is alex-valid. For the sake of clarity, we do a final cleanup pass where we remove the LMS-type positions from $X$.

It's easy to see that this entire procedure runs in $O(n)$ (placing LMS-positions, L-induce, cleanup).
.
## 4.2. S-induce

Let us now deal with the S regions. We will use a symmetrical procedure to `l_induce` called `s_induce`, which runs from *right to left* instead.

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
  if(j >= 0 and is_S_type(Q[j]))
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

Why does this work? The proof is structurally symmetric to that of `l_induce` (we now process strings in non-increasing alex order, so we go from right to left in $X$, and every call to `extend3(X[i])` can only add something to $X$ strictly before $i$), but with one caveat: coverage (i.e. all L-positions eventually get placed into $X$) previously relied on the fact that every sequence of L positions ended in an LMS position (every downward slope ends in a valley), and us manually placing the LMS positions into $X$ first. The equivalent requirement here would be every upward slope ending in a peak, and us having placed every peak first. As all L regions have already been computed, all the peaks have been placed into $X$. The only source of nuisance is the very last position, which is LMS-type and doesn't have an L-type peak after it. Thankfully, $T_n$ is the unique minimum and must therefore be the very first element in $X$, so we manually place it.

I'll leave the complete proof to the reader but will just add a few observations that should seem natural if you've internalised the details:

- If we ran `s_induce()` after removing all the non-peak L-type positions from $X$, the resultant $X$ would still have its S regions correctly filled.
- For `l_induce()`, adding the LMS-type seeds (valleys) into $X$ was quite simple as their corresponding strings had a length of 1. Here, the "seeds" for the induction phase are L-type peaks whose corresponding strings are their LMS-substrings, whose relative order in $X$ cannot be trivially determined in the same way.

# 5. Sorting suffixes for LMS positions

Our goal in this section is to sort an important subset of entire suffixes - those that begin at LMS positions. We'll refer to these as LMS-suffixes. The importance of these LMS-suffixes might seem arbitrary now, but will become apparent in section 6 just like how the importance of having sorted LMS-substrings under the alex-comparator in section 4 will become apparent now.

### Theorem 5.1 

> Full LMS-substrings can be assigned alex-order-preserving integer labels in O(n). More formally, each LMS position $i$ can be assigned integer $R_i$ such that for any two LMS positions $i$ and $j$, $R_i = R_j \iff P_i = P_j$, and $R_i < R_j \iff P_i \prec P_j$.

How can we do this? We just go over the subsequence of LMS positions in $X$, and assign $R_i$ in an increasing fashion. The only subtlety is assigning equal labels when two adjacent LMS positions in this subsequence have equal LMS-substrings. Since the sum of sizes of all full LMS-substrings is $O(n)$ (notice that a full LMS-substring only intersects with at most two other full LMS-substrings, and only at the boundaries), we can naively compare all adjacent LMS-substrings in the subsequence for equality.

<details><summary class ="spoiler-summary">Code</summary>
<div class = "spoiler-content">

```cpp
// Given all of this
int n;
vector<int> T, Q, X;
vector<vector<int>> P;

vector<int> R(n + 1, 0);
int label = 0;
int last = -1;

for(int i = 0; i <= n; i ++)
{
  int j = X[i];
  if(is_LMS_type(Q[j]))
  {
    if(last == -1)
      R[j] = label;
    else
    {
      //O(n) in total over all iterations
      if(P[last] != P[j])
        ++ label;
      R[j] = label;
    }
    last = j;
  }
}

```

</div>
</details>

Using these labels, we now reduce $T$ to a "LMS-reduced" string, $T'$. We do this by going over all LMS positions $i$ in $T$ from left to right, and appending $R_i$ to $T'$ (which starts off empty).

More formally, let $l_0 < l_1 \dots < l_{m - 1}$ be all the LMS positions in $T$. Then $T'$ is a string of length $m$ where $T'_i = R_{l_i}$.

What's so special about $T'$? Three things:

1. We built it in $O(n)$ time.
2. $\vert T' \vert \leq \frac{n + 1}{2}$, as it is equal to the number of LMS positions in $T$. Further, $0 \leq T'_{i} < \vert T' \vert$, and the last element in $T'$ is the unique minimum within it, as the last full LMS-substring is just $T[n, n]$ and therefore the only one beginning with the unique minimum of $T$.
3. As we will show below, us having assigned $R_i$'s in alex order will have a delightful consequence - the sorted order of suffixes of $T'$ will correspond to the sorted order of LMS-suffixes of $T$!!!

Let's restate point 3 formally.

### Theorem 5.2

> For any two positions $0 \leq a < b < m$, the suffix of $T'$ beginning at $a$ is lexicographically smaller than the suffix beginning at $b$ iff $S_{l_a} < S_{l_b}$.

We prove this after proving the following Theorem.

### Theorem 5.3

> If $P_i \neq P_j$, then $P_i \prec P_j \iff S_i < S_j$.

If you were previously confused by the seemingly arbitrary decision to use the alex comparator, abandon your confusion here! This is the beautiful payoff for having used it.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

1. If neither $P_i$ nor $P_j$ is a proper prefix of the other, then the definition of the alex comparator suffices.
2. Otherwise WLOG, assume $P_i$ is a proper prefix of $P_j$.

[tba]

</div>
</details>

We now prove Theorem 5.2. Consider comparing the suffixes of $T'$ beginning at $a$ and $b$ ($a < b$). Let's call these $p$ and $q$ respectively.

1. Clearly, $p \neq q$ as $\vert p \vert \neq \vert q \vert$. Further, as the last element of $T'$ is unique, neither can be a proper prefix of the other. 
2. Therefore, they must differ at some point before either ends. Let $x$ be the smallest non-negative integer such that $T'_{a + x} \neq T'_{b + x}$. Clearly, $(p < q) \iff (T'_{a + x} < T'_{b + x}) \iff (R_{l_{a + x}} < R_{l_{b + x}})$.
3. It's easy to see that $T[l_a, l_{a + x}) = T[l_b, l_{b + x}) = C$. Since $S_{l_a} = T[l_a, l_{a + x}) + T[l_{a + x}, n] = C + S_{l_{a + x}}$ and $S_{l_b} = T[l_b, l_{b + x}) + T[l_{b + x}, n] = C + S_{l_{b + x}}$, we have $(S_{l_a} < S_{l_b}) \iff (S_{l_{a + x}} < S_{l_{b + x}})$.
4. Using Theorems 5.1 and 5.3, we have $(p < q) \iff (S_{l_a} < S_{l_b})$.

We have therefore shown that the sorted order of suffixes of $T'$ is equal to the sorted order of the corresponding LMS-suffixes of $T$.

## Time for a subproblem!

Let's play a game. I hand you a string $T$ meeting the conditions described in section 1, and demand its suffix-array in $O(\vert T \vert)$ time. However, I'm feeling particularly generous and allow you to access a blackbox `SA_BLACKBOX(T')` that returns the suffix array of $T'$ in $O(\vert T' \vert)$ time, given that $T'$ also meets the section 1 conditions. You look at me incredulously - surely, there's a catch? You could just use this box on $T$ after all! I confirm your fears with the following condition: you can only call `SA_BLACKBOX(T')` once, with $\vert T' \vert \leq \lceil \frac{\vert T \vert}{2} \rceil$.

You quickly whip out your phone and open this blog. As you read these words, you heave a sigh of relief - you've come to the right place! We're constructing a function `SA(T)` that essentially does the following:

1. Construct the LMS reduced string $T'$ from $T$ in $O(n)$ time.
2. Use `SA_BLACKBOX()` on $T'$ to get its suffix array in $O(\vert T' \vert) = O(n/2)$ time.
3. Use the suffix array of $T'$ to construct that of $T$ by doing some additional things in $O(n)$ time.

Assuming we can do step 3 (section 6), we'll clearly be done! Displeased at you having cheated, I snatch the blackbox away from you. "No blackbox for you, give me the SA without using it! \>\:\(". You're rattled for but a moment, before realisation dawns. "I'll just use `SA()` instead of `SA_BLACKBOX()` in step 2".

I groan, remembering that $T(n) = O(n) + T(n/2)$ with $T(1) = O(1)$ implies that $T(n) = O(n)$.

# 6. Finally producing $A$

[we will now use this]

[then circle back to the crude LMS seeding done for the first L-induce, and how the correct LMS seeding before this L-induce will indeed sort entire L suffixes]

[then circle back to the crude L seeding done for the first S-induce, same argument, now S-induce sorts entire S suffixes]

[should be technically done]

# 7. Parting thoughts

