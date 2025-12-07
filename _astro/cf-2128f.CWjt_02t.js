const t=`---
displayMode: blog
title: CF-2128F
date: 2025-12-07
tags: [editorial]
---

This problem is somewhere in my top-5 problems for 2025. The solution is surprisingly simple and intuitive for a 3200 rated problem.

### Problem [CF-2128F](https://codeforces.com/problemset/problem/2128/F)

### Statement

>  You are given an undirected connected graph with $n$ nodes and $m$ edges. The weight wi of the $i$-th edge is not yet decided and must be a real number between $l_i$ and $r_i$. 
> 
> You are given a node $k$. Determine if there exists a valid assignment of weights $(w_1, \\dots, w_m)$ such that:
> 
> - $l_i \\leq w_i \\leq r_i$ for all $i$
> 
> - $\\text{dis}_w(1,n) \\neq \\text{dis}_w(1,k) + \\text{dis}_w(k,n)$

Constraints:

- $4 \\leq n \\leq 200000$

- $n - 1 \\leq m \\leq 200000$

- $2 \\leq k \\leq n - 1$

- no self-loops

- $1 \\leq l_i \\leq r_i \\leq 10^9$

### Solution

It's easy to see that the problem requires us to check if there exists an assignment of weights for which the node $k$ doesn't lie on any shortest path from $1$ to $n$. Alternatively, the shortest path from $1$ to $n$ must have a strictly smaller total weight than the shortest path from $1$ to $n$ which contains the node $k$.

Let's consider some shortest path in a valid assignment of weights $w$ and play around with the weight relations (with the hope of simplifying things). Let's consider a particular shortest path $P$ containing the edges indexed $e_1, e_2 \\dots e_p$ (this will obviously (a) be a simple path with no repeated edges or nodes (b) not contain the node $k$).  

**Observation 1**:

> For all $e_i \\notin P$, we can set $w_{e_i} = r_{e_i}$ without affecting the validity of $w$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

Doing so doesn't affect the weight of $P$ and only potentially increases the weight of the paths from $1$ to $n$ which go through $k$. SInce the shortest one amongst the latter was strictly worse than $P$ before these changes, the shortest one amongst the latter after these changes is also strictly worse.

</div>
</details>

**Observation 2**:

> For all $e_i \\in P$, we can set $w_{e_i} = l_{e_i}$ without affecting the validity of $w$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

Consider a single change, on edge $e_i$. Let's say performing this change results in its weight decreasing by $\\triangle$. This results in the total weight of $P$ decreasing by exactly $\\triangle$ (since $P$ contains no repeated edges). We want to show that there can exist no shortest path through $k$ after this change. Paths from $1$ to $n$ through $k$ can be classified into three categories:

1. Paths that don't contain the edge $e_i$: they were worse than $P$, and remain so.

2. Paths that contain the edge $e_i$ once: they were initially worse than $P$, and their total edge weight is reduced by the same amount as $P$, so they remain worse.

3. Paths that contain the edge $e_i$ multiple times: while they receive a greater decrease to their total weight than $P$, simply cannot be the shortest paths from $1$ to $n$ as they're not simple, and all edge weights are strictly positive.

</div>
</details>

A vague skeleton for a potential solution begins to take form: maybe we fix some simple path from $1$ to $n$, set the weights of all edges on it to $l_{e_i}$, all outside it to $r_{e_i}$, and check if:

- It's the shortest path from $1$ to $n$.

- Its total weight is strictly smaller than that of the shortest path from $1$ to $n$ through $k$.

We can observe that the first condition is actually unnecessary: it suffices to check for the second condition, because the second being satisfied implies that there's some path from $1$ to $n$ with strictly smaller total weight than the shortest one through $k$. For now, continue to assume that $P$ is a shortest path from $1$ to $n$.

Let us now look at the intersection between $P$ and the shortest path from $1$ to $n$ through $k$, $P'$.

This leap might feel a bit arbitrary to the passive reader, so the intuitive justification I provide is that since we reach nodes on $P$ in an optimal manner w.r.t. $1$ and $n$, (for any shortest path from $s$ to $t$, the path from $s$ to any intermediate node $p$ is one of the shortest paths from $s$ to $p$, and the path from $t$ to any intermediate node $p$ is one of the shortest paths from $t$ to $p$), and that $P$ and $P'$ necessarily intersect at their extremes ($1$ and $n$), one needs to "deviate" from $P'$ only to visit $k$. A more formal justification follows.

Let the vertices on $P'$ be $v_1, v_2, \\dots v_q$. Define $f(u)$ to be $1$ if the node $u$ lies on $P$, and $0$ otherwise.

**Observation 3**:

>  There exists some $P'$ (shortest path from $1$ to $n$ through $k$) such that the sequence $S(P') = f(v_i) : 1 \\leq i \\leq q$ takes the following form: $1 1  \\dots 1 1 0 0 \\dots 0 0 1 1 \\dots 1 1$ (ie. a non-empty segment of $1$s, followed by a non-empty segment of $0$s, followed by a non-empty segment of $1$s). 

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">


<ol>

<li>

$S(P')_1 = 1$ as $v_1 = 1, f(1) = 1$. 

</li>

<li>

$S(P')_q = 1$ as $v_q = n, f(n) = 1$. 

</li>

<li>

There exists some $j \\in (1, q)$ such that $v_j = k$, and $S(P')_j = 0$ as $f(k) = 0$. 

</li>

<li>

Let us now consider *some* shortest path from $1$ to $n$ through $k$, $R$ and show that we can transform $R$ to $P'$ while still having the same weight.

The first three points imply that the sequence $S(R)$ looks like $1 \\dots [\\text{arbitrary mix of 0s and 1s}] \\quad 0 \\quad [\\text{arbitrary mix of 0s and 1s}] \\quad 1$ (with the guaranteed $0$ at position $j$ existing due to the guaranteed (and singular) existence of $k$ in $R$). Now consider the closest $1$s to $S(R)_j$ to the left and right (both are guaranteed to exist as the first and last elements are $1$s). Let their position be $l$ and $r$ respectively. Let the $l$-th and $r$-th nodes in $R$ be $g$ and $h$ respectively.

Let's now construct the following path, $R'$:

<ol>

<li>

We go from $1$ to $g$ through the same sub-path we do on $P$ (note that $g$ is guaranteed to exist in $P$).

</li>

<li>

We go from $g$ to $h$ through the same sub-path we do on $R$ (note that this ensures we go through $k$).

</li>

<li>

We go from $h$ to $n$ through the same sub-path we do on $P$ (note that $h$ is guaranteed to exist in $P$).

</li>

</ol>

**Claim 3.1**:

> The total weight of $R'$ is not greater than that of $R$.

Proof: 

Consider the three subpaths that both $R$ and $R'$ can be divided into: $1 \\rightarrow g \\rightarrow h \\rightarrow n$. The second sub-path ($g \\rightarrow h$) is the same in both $R$ and $R'$, and therefore has an equal contribution to the weight. Now, since $P$ is one of the shortest paths from $1$ to $n$, the sub-paths $1 \\rightarrow g$ and $h \\rightarrow n$ on $P$ are the shortest paths between those nodes, and therefore cannot have greater weights than their counter-parts in $R$.

**Claim 3.2**:

> $S(R') = f(v_i) : 1 \\leq i \\leq q$ takes the following form: $1 1 \\dots 1 1 0 0 \\dots 0 0 1 1 \\dots 1 1$ (ie. a non-empty segment of 1s, followed by a non-empty segment of 0s, followed by a non-empty segment of 1s).

Proof:

Obvious.

We have therefore showed the existence of a valid $P'$.

</li>

</ol>

</div>
</details>

Fuck, I now feel stupid for putting the proof above into a spoiler as I'm going to be using terms defined therein. Just read it if you haven't.

Anyways, how does all of this even help us? It helps us because it implies that if there exists a valid assignment of weights, then there exists a pair of paths $P, P'$ (and the implicit assignment of weights $w$ defined by $P$ as mentioned above) such that:

- $P$ is the shortest path from $1$ to $n$.
-  $P'$ is the shortest path from $1$ to $n$ through $k$, and satisfies that nice property we derived earlier (follows $P$, only deviates once to visit $k$, and then follows $P$ again).
- $P$ has a smaller total weight than $P'$.

This is extremely convenient as we can now look at the smallest path from $1$ to $n$ through $k$ by only considering the previously defined $g$ and $h$ on $P$.

Let's now define $d_k(u)$ to be the shortest distance between $u$ and $k$ when all the edge weights are set to $r_{e_i}$.

We observe that for a fixed $P$, the shortest path from $1$ to $n$ through $k$ has the weight:

$$\\min_{g, h \\in P}(\\text{dis}_w(1, g) + d_k(g) + d_k(h) + \\text{dis}_w(h, n))$$

The only point of contention one may have with this formula is that for certain $g$ (or symmetrically $h$), $d_k(g)$ may not actually represent the shortest distance between $g$ and $k$ in the current path, as some edge weights set to $r_{e_i}$ in the graph $d_k$ is derived from may lie on $P$ here and consequently be set to $l_{e_i}$. 


**Observation 4**:
> The minimum for $(1)$ is produced by at least one pair $g, h$ for which both $d_k(g)$ and $d_k(h)$ are valid. 

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

Easy to prove but tedious and mostly left as an exercise to the reader.

Hint: WLOG, let's say $d_k(g)$ is invalid. This means that we go over some edge in $P$ when travelling from $g$ to $k$. We could instead just have travelled to this edge using $P$, and arrived with no greater cost.

</div>
</details>

Let's simplify things a bit for us now.

**Observation 5**
> If $(1)$ is satisfied for any path $P$ without $k$, then the weight assignment induced by $P$ is valid. 

<details><summary class ="spoiler-summary">Proof</summary> 
<div class = "spoiler-content"> 
Exercise for the reader.
Just examine the places where we used the fact that $P$ was a shortest path until now, and realize that we can make do with weaker claims.
</div> </details>


How does this relate to our original requirement of having $P$ be strictly shorter than $P'$? We now require:

$$\\min_{g, h \\in P}(\\text{dis}_w(1, g) + d_k(g) + d_k(h) + \\text{dis}_w(h, n)) > \\text{dis}_w(1, n)$$
$$\\implies d_k(g) + d_k(h) > \\text{dis}_P(g, h) \\quad \\forall g, h \\in P \\tag{1}$$

$\\text{dis}_P(g, h)$ just refers to the distance between $g$ and $h$ on $P$ here.

Alright, with all of that foreplay out of the way, how do we design an efficient algorithm that exploits these properties? All we care about is finding a path $P$ in the graph such that $(1)$ is satisfied for it. 

Consider a simple line graph from $1$ to $n$. How would we check if the unique path from $1$ to $n$ satisfies $(1)$? Let's obviously assume that $d_k$ has been precomputed.

Consider the following pseudo-code that does this:

\`\`\`
p = nodes on the path from 1 to n
sat = true

for i from 1 to n:
    v = p[i]
    for j from 1 to i:
        u = p[j]
        if dk[u] + dk[v] <= dis_P(u, v):
            sat = false
\`\`\`

This works in $O(n^2)$ (forget about the precomputation for now), but can we do better? We realize that the distance function $\\text{dis}_P(u, v)$ has a rather "continuous" nature, and we can exploit this to do something similar to kadane's algorithm (just maintain the value of the extreme suffix).

This leads to the following $O(n)$ solution:

\`\`\`
p = nodes on the path from 1 to n
sat = true
worst_suffix = -dk[p[1]]

for i from 2 to n:
    v = p[i]
    worst_suffix = max(worst_suffix + dis_P(p[i - 1], v), -dk[v])
    if dk[v] <= worst_suffix:
        sat = false
\`\`\`

Alright, let's now consider doing this for arbitrary paths in a general graph. 

We will try to incrementally build good paths from node $1$ that have the potential to satisfy $1$. What properties must such a potential path from $1$ to $u$ satisfy?

- It must not contain $k$.
- $(1)$ must obviously be satisfied for $g, h$ on this prefix path.
- In addition, note that as long as $(1)$ is satisfied on this prefix, the only thing that will affect $(1)$ as we further extend this path is the analogous value of \`worst_suffix\` until now. It's easy to see that we should aim to minimise this value.


This trivially leads to the following $O(n\\cdot m)$ algorithm (just have $n$ rounds (max number of nodes in $P$) where you try to transition across every edge).

\`\`\`
precompute dk using djikstras

opt[n]

opt[1] = -dk[1]
for u from 2 to n:
    opt[u] = inf

for round from 1 to n:
    nopt = opt
    for u from 1 to n:
        for [v, l, r] in adj[u]:
            if (u != k and v != k and dk[v] > opt[u] + l)
                nopt[v] = min(nopt[v], max(-dk[v], opt[u] + l))
    opt = nopt

if opt[n] != inf:
    valid assignment exists
\`\`\`

To optimize this to $O((n + m) \\log{n})$, we can simply observe that we can use a Djikstra's like approach here due to the monotonic nature of the transitions (due to strictly positive edge weights).`;export{t as default};
