const e=`---
displayMode: blog
title: CF-2056F1
date: 2025-07-27
tags: [editorial]
---

There isn't anything particularly interesting or difficult about this problem, writing this blog is just a way for me to regain a general coherence in my approach to solving problems.

### Problem [CF-2056F1](https://codeforces.com/problemset/problem/2056/F1)

### Statement

> A sequence $a$ of $n$ integers is called **good** iff the following condition holds:
> 
> - Let $cnt_x$ be the number of occurrences of $x$ in the sequence $a$.
> - For all pairs $0 \\leq i < j < m$, at least one of the following must be true:
>   - $cnt_i = 0$
>   - $cnt_j = 0$
>   - $cnt_i \\leq cnt_j$
> 
> In other words, if both $i$ and $j$ are present in the sequence, then the number of occurrences of $i$ must be **less than or equal to** the number of occurrences of $j$.
> 
> You are given integers $n$ and $m$. Compute the **bitwise XOR of the medians** of all **good** sequences $a$ of length $n$, where each element $a_i$ satisfies $0 \\leq a_i < m$.

Constraints:

- $n \\leq 2^{200}$ (given to us in its binary form)
- $m \\leq 500$

### Solution

A reasonable (and probably the only immediately obvious) direction to take is to fix the median and then consider the set of good sequences that correspond to that median, as $m$ is conveniently sized.

Clearly, for a fixed median $q$, the only thing that matters is the number of sequences having their median as $q$. If this number is even, $q$ has a no contribution at all to the overall answer. A potential solution then begins to take form in one's mind:
- Iterate over $q$.
- Find the parity of the number of good sequences with $q$ as their median.
- If the aforementioned value is odd, include $q$ within the final set of terms to be XORed to get the answer.

Let's define two functions for convenience:
- $\\text{cnt}(q)$: The number of good sequences with $q$ as their median.
- $\\text{par}(x) = (x \\mod 2)$.

A very brief consideration should reveal to one the huge difference in computational difficulty between the analysis of $\\text{cnt}(q)$, and $\\text{par}(\\text{cnt}(q))$, but the latter will still require some basic ideas from the former, so let’s go through them.

Let’s partition all sequences with median $q$ into maximal groups that have the same multisets. These groups are obviously mutually exclusive and exhaustive. This makes analysis of all the sequences much easier, as the number of sequences that correspond to a single multiset $M$ is simply: $$\\frac{n!}{\\prod_{x \\in S(M)} \\text{freq}_M(x)!} $$
(where $S(M)$ is the set of unique elements in a multiset $M$, and $\\text{freq}_M(x)$ is the number of occurrences of $x$ in $M$)

Now, it's not difficult to see this expression and guess that it's a bit difficult to get it to be odd (ie. it is even for most partitions of $n$). If we can discover some necessary/sufficient conditions for it to be odd, we can simply ignore the groups of sequences corresponding to all multisets for which said conditions aren't satisfied (as they have no contribution to the final parity).

Let $t(x)$ be the highest $y$ such that $2^y \\mid x$.

For the aforementioned expression to be odd, we require $t(n!) = \\sum_{x \\in S(M)} t(\\text{freq}_M (x)!)$. Since the set of frequencies is always a partition of $n$, let's reduce the problem to the following:

> When does a partition $S$ of an integer $n$ have $t(n!) = \\sum_{x \\in S} t(x!)$?

Let's focus on $t(x!)$ for arbitrary $x$. It's not difficult to arrive at: $$t(x!) = \\sum_{b = 1}^{\\lceil \\log_2(x) \\rceil} \\lfloor \\frac{x}{2^b} \\rfloor$$ This definition, while pretty concise, doesn't really get us all the way to a point where we're able to state meaningful assertions about the difference between $t(n!)$ and $\\sum_{x \\in S} t(x!)$, so let's try to rewrite it in a more helpful manner. 

It shouldn't seem too unmotivated of a directional change when we now consider the binary representations of the numbers involved here (division by 2 is a right shift, we're dealing with huge numbers, etc.): We reinterpret the expression described before by considering the contribution of each bit in the binary representation of $x$ to $t(x!)$, and realize that a set bit at the $b$-th position in the binary representation of $x$ contributes $\\sum_{i = 0}^{b - 1} 2^i = 2^b - 1$ to $t(x!)$. Summing this up over all set bits $b$ yields a beautifully convenient expression!: $t(x!) = x - b(x)$, where $b(x)$ is the number of set bits in the binary representation of $x$.

The comparison of $t(n!)$ to $\\sum_{x \\in S} t(x!)$ now simply reduces to comparing $b(n)$ and $\\sum_{x \\in S} b(x)$. $\\sum_{x \\in S} b(x) \\geq b(n)$ holds trivially, but we require them to be equal. It's easy to show that $\\sum_{x \\in S} b(x) = b(n)$ holds iff every set bit in $n$ is set in exactly one element of $S$, and the proof is left as an exercise to the reader.

We finally have a result we can use:

> $\\frac{n!}{\\prod_{x \\in S} \\text{x}!}$ (where all elements in multiset $S$ sum to $n$) is odd $\\iff$ No two elements of $S$ have a common set bit

This implies that any "good" additive partition $S$ of $n$ is also a clean "Bitwise-OR partition". It also follows that $S$ can have no duplicate elements.

We now make the following key observation:
> There is a unique maximum element in $S$, and it is $\\geq n/2$ (since the most significant bit of $n$ is set in exactly one element of $S$).

Let us return to the problem at hand. To recap, we:

- Fixed median $q$.
- Fixed a multiset $M$ with median $q$ and analyzed all sequences that correspond to this multiset.

Now, how does our result help us here? Well:
- We now only care about multisets whose "frequency set" constitutes a good partition of $n$ (We will call a multiset good if it's frequency set is good).
- We're relieved of the responsibility of having to force $q$ to be the median, since exactly one element has a frequency $\\geq n/2$ in a good multiset and is indisputably the median. This element must obviously be $q$.

For a fixed $q$, all the sequences that correspond to a fixed, good multiset have a collective contribution of exactly $1$ to our answer, so for any fixed $q$, we simply have to find the number of good multisets, and if this number is odd, include $q$ within the final xor sum that is our answer.

How do we find the parity of the number of good multisets with median $q$?

This is a very simple sub-problem that can be solved with the help of dynamic programming:
- Define $f(i, j)$ to be the parity of the number of ways to partition a sequence of length $i$ into $j$ non-empty subsequences. Compute all $f(i, j)$ for $i, j \\leq k$ (where $k$ is the number of set bits in $n$) in $O(k^2)$ (using the transition $f(i, j) = ((f(i - 1, j - 1) + f(i - 1, j) \\cdot j) \\mod 2)$).
- Then, we iterate over the number of unique elements, $x$, in our good multiset. The contribution of the number of good multisets with $x$ unique elements shall be $\\binom{q}{x - 1} \\cdot f(b(n), x)$. We now apply our previously derived result again and realize that the parity of $\\binom{q}{x - 1}$ is 1 if and only if $(q - x + 1) \\oplus (x - 1) = q$ (where $\\oplus$ is the bitwise-XOR operator), and add the parity of this expression to our answer.

We therefore compute this parity for every median $q$ in $O(k^2)$ time, and XOR the answer with $q$ in the case of said parity being 1. This is an $O(m \\cdot k^2)$ solution, which fits within the problem's T/M-L. 

We can however, make our solution faster by simply precomputing the dynamic programming states, which brings the time complexity of our solution down to $O(k ^ 2 + m \\cdot k)$.

The code ends up being rather simple, and has been included below.

\`\`\`cpp
#include<bits/stdc++.h>
using namespace std;

const int K = 205;

int dp[K][K];

signed main()
{
    ios_base::sync_with_stdio(false), cin.tie(NULL);

    dp[0][0] = 1;
    for(int i = 1; i < K; i ++)
    {
        for(int j = 0; j < i; j ++)
            dp[i][j + 1] += dp[i - 1][j], dp[i][j] += dp[i - 1][j] * j;
        for(int j = 0; j <= i; j ++)
            dp[i][j] &= 1;
    }

    int t = 1;
    cin >> t;
    while(t --)
    {
        int k, m;
        cin >> k >> m;

        vector<char> n(k);
        for(int i = k - 1; i >= 0; i --)
            cin >> n[i];

        int b = count(n.begin(), n.end(), '1');

        int ans = 0;
        for(int med = 0; med < m; med ++)
        {
            int cnt = 0;
            for(int x = 1; x <= min(b, med + 1); x ++)
                if(((x - 1) ^ (med - (x - 1))) == med)
                    cnt += dp[b][x];

            ans ^= ((cnt & 1) * med);
        }

        cout << ans << endl;
    }
}
\`\`\`

`;export{e as default};
