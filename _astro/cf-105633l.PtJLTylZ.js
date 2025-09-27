const e=`---
displayMode: blog
title: CF-105633L
date: 2025-09-27
tags: [editorial]
---
### Problem [CF-105633L](https://codeforces.com/gym/105633/problem/L)

### Statement

> You're given an array $a$ of non-negative integers, of length $n$, and two integers $f, g$, such that $f < g$.
> 
> You start off with a score of $0$ and can repeatedly perform the following operation any number of times:
> Choose some subarray $a[l, r]$ such that $(\\sum_{l \\leq i \\leq r} a_i) \\mod g = f$. Then, add $(\\sum_{l \\leq i \\leq r} a_i) - f$ to your score and delete the subarray $a[l, r]$ (note that this results in the (potentially non-existent) element to the left of the subarray now becoming adjacent to the (potentially non-existent) element to the right of the subarray).
>
> What's the maximum score you can achieve?

Constraints:

- $n \\leq 500$
- $0 \\leq a_i \\leq 10^8$
- $1 \\leq g \\leq 10^8$
- $1 \\leq f < g$

### Solution

Firstly, it's easy to see that each deleted segment corresponds to a subsequence in the original array. For every deleted subsequence $i_1, i_2, i_3 \\dots i_m$ (indices of the elements in the original array $a$), we create a segment $[i_1, i_m]$, and add it to a set $S$. Let $I_{[l, r]} = \\{i_1 = l, i_2, \\dots , i_m = r \\}$ be the subsequence corresponding to $[l, r]$.

> Claim 1: No two segments in $S$ can partially intersect, or equivalently, $S$ is a laminar family.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">

Let's say we have two segments $[l_1, r_1]$ and $[l_2, r_2]$ in $S$ which partially intersect. Then $l_1 < l_2 < r_1 < r_2$ holds.

Notice that at all points of time, relative order of these four elements with original indices $l_1, r_1, l_2, r_2$ will be preserved.

Assume WLOG that we delete $I_{[l_1, r_1]}$ first. $I_{[l_2, r_2]}$ hasn't been deleted, implying that element with original index $l_2$ hasn't been deleted and still lies between elements with original index $l_1$ and $r_1$. Therefore, if we delete $I_{[l_1, r_1]}$ now, it would result in the deletion of $l_2$, which we earlier stated to definitionally be deleted when we delete $I_{[l_2, r_2]}$. This is a contradiction and no such pair of segments can therefore exist.
</div>
</details>

Why do we make this reduction? Because doing dp on an optimal set of nested segments is a standard subproblem and easy to reason about.

Define the subtree of $[l, r] \\in S$ to be $T(l, r) = \\{[x, y] : ([x, y] \\in S) \\land (l \\leq x \\leq y \\leq r) \\land ([x, y] \\neq [l, r])\\}$. Define the child-set of $[l, r] \\in S$ to be $C(l, r) = \\{[x, y] : ([x, y] \\in T(l, r)) \\land (\\not\\exists [a, b] \\in T(l, r) : [x, y] \\in T(a, b))\\}$. These definitions obviously draw from the underlying "tree-structure" of any laminar family of intervals.

Let's say that a segment $[l, r] \\in S$ is a "root segment" if it isn't in the child-set of any segment in $S$. Define $R$ to be the set of root segments. The final score must be:

$$\\sum_{[l, r] \\in S} (\\sum_{i \\in I_{[l, r]}} (a_i) - f)$$ 
$$= \\sum_{[l, r] \\in S} \\sum_{i \\in I_{[l, r]}} (a_i) - \\vert S \\vert  \\cdot f$$ 

Notice that any $i \\in I_{[l, r]}$ where $[l, r] \\in S$ will lie in exactly one root segment.

$$\\implies \\sum_{[l, r] \\in S} \\sum_{i \\in I_{[l, r]}} (a_i) - \\vert S \\vert  \\cdot f = \\sum_{[l, r] \\in R} \\sum_{l \\leq i \\leq r} (a_i) - \\vert S \\vert  \\cdot f$$ 
$$\\implies \\text{score} = \\sum_{[l, r] \\in R} \\sum_{l \\leq i \\leq r} (a_i) - \\vert S \\vert  \\cdot f$$

Let's analyse the validity condition during deletions. When deleting $I_{[l, r]}$ (where $[l, r] \\in S$), we require:
$$(\\sum_{i \\in I_{[l, r]}} a_i )\\bmod g = f \\tag{1}$$ 

Further, we add $\\sum_{i \\in I_{[l, r]}} a_i - f$ to our score.

Now, let's try and understand the relation of the second term in the expression of the final score ($ \\vert S \\vert  \\cdot f$) with $R$. We can rewrite the expression in the following way:

$$\\sum_{[l, r] \\in R} \\sum_{l \\leq i \\leq r} (a_i) - \\vert S \\vert  \\cdot f$$
$$ = \\sum_{[l, r] \\in R} ( \\sum_{l \\leq i \\leq r} (a_i) - f - \\vert T(l, r) \\vert \\cdot f)$$

Consider a root segment $[l, r]$. We have:

$$(\\sum_{i \\in I_{[l, r]}} a_i )\\bmod g = f \\quad \\text{(from (1))}$$
$$\\implies (\\sum_{l \\leq i \\leq r} a_i - \\sum_{(l \\leq i \\leq r) \\land (i \\notin I)} a_i) \\bmod g = f$$
$$ \\implies (\\sum_{l \\leq i \\leq r} a_i - \\sum_{[x, y] \\in T(l, r)} \\sum_{i \\in I_{[x, y]}} a_i) \\bmod g = f$$
$$ \\implies (\\sum_{l \\leq i \\leq r} a_i - \\sum_{[x, y] \\in T(l, r)} f) \\bmod g = f \\quad \\text{(from (1))}$$
$$ \\implies (\\sum_{l \\leq i \\leq r} a_i - \\vert T(l, r) \\vert \\cdot f) \\bmod g = f $$
$$ \\implies \\vert T(l, r) \\vert \\cdot f \\bmod g = (\\sum_{l \\leq i \\leq r} a_i - f) \\bmod g \\tag{2}$$

We now observe that the segments in $T(l, r)$ for root-segment $[l, r]$ (which are obviously disjoint for different root segments) affect us in only two ways:

1. They have a direct contribution of $-\\vert T(l, r) \\vert \\cdot f$ to the final score.
2. $\\vert T(l, r) \\vert$ must satisfy $(2)$.

It's therefore optimal to choose $T(l, r)$ such that it:
1. Is internally valid.
2. Satisfies $(2)$.
3. Has the smallest possible size.

Also note that we **only** care about the number of segments in $T(l, r)$, and not about their actual structure.

Let's define $p(l, r, x)$ to be true if it's possible to delete $x$ subsequences only from the subarray $a[l, r]$ in a valid manner w.r.t. $f$ and $g$.  

> Claim 2: If $p(l, r, x)$ is true for $x > 1$, then $p(l, r, x - 1)$ **must** be true.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">
Let the set of segments corresponding to the $x$ subsequences here be $S$. Then there must exist at least one root segment $[l, r] \\in S$, and $S \\setminus \\{[l, r]\\}$ is also valid, because $[l, r] \\not \\in T(x, y) \\forall [x, y] \\in S$.
</div>
</details>

This motivates us to try and find the greatest number of valid subsequences we can delete from subarray $[l, r]$, $\\text{dp}(l, r)$ for all subarrays, because upon doing that, one can find the answer in the following manner:

\`\`\`
compute dp[][]  #for convenience, ensure that dp[l][r] = 0 if l > r

initialize dp2[n + 1] with 0s      #dp2[i] = maximum score we can get from prefix i

for r from 1 to n:
    dp2[r] = dp2[r - 1]
    for l from 1 to r:
        sum = sum of subarray a[l, r]
        sub = dp[l + 1][r - 1]                
        y = smallest x such that (x * f) % g = (sum - f) % g
        if y exists and y <= sub:
            dp2[r] = max(dp2[r], dp2[l - 1] + sum - (y + 1) * f)

ans = dp2[n]
\`\`\`

Ok, so how do we compute $\\text{dp}$? Well, it's rather simple:

\`\`\`
initialize dp[n + 1][n + 1] with 0s

for s from 1 to n:
    for r from s to n:
        l = r - s + 1
        sum = sum of subarray a[l, r]

        #we do not delete the segment [l, r]
        for m from l to r - 1:
            sub = dp[l][m] + dp[m + 1][r]
            dp[l][r] = max(dp[l][r], sub)  

        #we try to delete the segment [l, r] with an optimal choice of T(l, r)
        sub = dp[l + 1][r - 1]
        y = the greatest x <= sub such that x and sum satisfy (2) from earlier
        if such y exists: 
            dp[l][r] = max(dp[l][r], y + 1)
\`\`\`

Now, the only subproblem left unsolved is finding the greatest solution <= a threshold to (2) in our innermost loop. More formally, solving the following suffices:

> Given $a, s, f, g$, find the greatest $x \\leq a$ such that $x \\cdot f \\bmod g = (s - f) \\bmod g$.

Ignoring the $\\leq a$ constraint, it's easy to see that some solution exists iff $\\text{gcd}(f, g) \\vert (s - f)$. Let $d = \\text{gcd}(f, g)$, $G = g/d, F = f/d, A = (s - f)/d$, then the solution set is defined by the arithmetic progression $(((A/F) \\bmod G) + c \\cdot G)$. Finding the greatest term less than a given threshold for an arithmetic progression is trivial, and we have therefore solved this subproblem.

Our solution is finally complete and takes $O(n^3)$ time.

Note: the official problem also allows $f = 0$, but I've omitted its consideration here since it's tedious and trivially follows from the analysis for $f > 0$.`;export{e as default};
