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

Recall that the suffix array $A$ gives us the position of each string in sorted order of all suffixes $T[i, n]$. Our goal in this section is to produce a "partially sorted" suffix array $X$, which gives us the position of each string in the sorted order of all LMS-substrings $P_i = T[i, E_i]$ ("partially sorted" because we only sort suffixes up to the ends of their LMS-substrings). Note that unlike with entire suffixes, certain LMS substrings might be proper prefixes of others. We will resolve such comparisons arbitrarily (instead of declaring a proper prefix of a string to be smaller).

An observant reader might feel some discomfort at our new goal of finding $X$ instead of $A$, because Theorem 2.4 applies when we're sorting entire suffixes, and not LMS-substrings. Worry not, we can show that it applies for LMS-substrings too!

### Theorem 4.1

> Any LMS substring $P_i$ ($i \neq n$) contains at least two different characters.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

[tba]
If position $i$ is LMS type, then $T_{i - 1} \neq T_i$ because if they were, then they would have same type
and every LMS substring contains its $T_{E_i}$ and $T_{E_{i - 1}}$
</div>
</details>

### Theorem 4.2 

> If $T_i = T_j, i < j$, and $i$ and $j$ lie on the same "downward slope" (i.e. $i$ is L-type and there lie no S-type positions between $i$ and $j$), then $P_i$ > $P_j$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">
[tba]
just like theorem 4.3
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

```cpp
// Given n, T, Q, P and the bucket boundaries (see code in theorem 2.4)
int n;
vector<int> T, Q, head, tail;
vector<vector<int>> P;          //LMS substrings

vector<int> X(n + 1, -1);       //suffix array

set<pair<vector<int>, int>> q;
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

  int j = i - 1;
  if(j >= 0 and Q[j] == L_TYPE)
    q.insert({P[j], j});
}
```

This inefficient procedure essentially does the following:
1. It first inserts the ends of all LMS substrings into a queue.
2. Then, it repeatedly picks the smallest substring from the queue and:
    1. If the substring corresponds to an L-type position $i$, it places $i$ at the first free position in the bucket corresponding to $T_i$ in $X$.
    2. Then, if position $i - 1$ is L-type, it inserts $P_{i - 1}$ into the queue (i.e. it extends $P_i$ by one step to the left).

[insert visual showing this procedure unfolding]

Why is this procedure correct?

From theorem 4.2, $P_{i - 1} > P_i$ when $i - 1$ and $i$ lie on the same downward slope. In our procedure, the selection of $\lbrace P_i, i \rbrace$ from the queue only results in the insertion of $\lbrace P_{i - 1}, i - 1 \rbrace$ if $i - 1$ and $i$ lie on the same downward slope. Therefore, the deletion of an element from the queue can only result in the insertion of a *strictly* greater element.
Since we always delete the smallest element from the queue, this implies that all elements to ever be inserted in the queue are processed in non-decreasing order.





[showing the optimised version]

```cpp
// Given n, T, Q, and the bucket boundaries (see code in theorem 2.4)
int n;
vector<int> T, Q, head, tail;

vector<int> X(n + 1, -1);       //suffix array

// insert LMS positions into X
for(int i = 0; i <= n; i ++)
  if(Q[i] == LMS_TYPE)
    X[--tail[T[i]]] = i;

//induce L positions into X
auto l_induce = [&]() -> void
{
  for(int i = 0; i <= n; i ++)
    if(X[i] != -1 and X[i] > 0)
    {
      int j = X[i] - 1;
      if(Q[j] == L_type)
        X[head[T[j]]++] = j;
    }
};
l_induce();

// L-type LMS-substrings are now at the correct positions in X!!!
```

First, we "seed" $X$ with LMS positions by placing these positions within the S area of their respective buckets. Note that these are not necessarily the true positions of these LMS substrings within $X$, we're just placing them *somewhere* within the S area (in our code, we place them at the end of the bucket, because that's simple to implement).

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

Then, we must understand 


## 4.2. S-induce

[explain S-induce, it sorts all S-types (including LMS types) up to LMS boundaries, show that it's symmetric-ish to L-induce]

# 5. Sorting the LMS-reduced string

[naturally, LMS types also get sorted up to boundaries]
[finding label for each LMS-substring starting at LMS position in O(n), reducing T to a smaller string using these substrings, sending this into the recursion]
[show that they can now be labelled in O(n), we reduce to just the LMS label string, length <= n/2, recursively sort this, T(n) = O(n) + T(n/2) = O(n)]

# 6. Finally producing $A$

[we will now use this]

[then circle back to the crude LMS seeding done for the first L-induce, and how the correct LMS seeding before this L-induce will indeed sort entire L suffixes]

[then circle back to the crude L seeding done for the first S-induce, same argument, now S-induce sorts entire S suffixes]

[done? ]