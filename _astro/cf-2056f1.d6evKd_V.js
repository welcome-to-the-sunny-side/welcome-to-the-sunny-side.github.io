const e=`---
displayMode: blog
title: CF-2056
date: 2025-07-27
tags: [editorial]
---

There isn't anything particularly interesting or difficult about this problem, writing this blog is just a way for me to regain a general coherence in my problemsolving mindset and shake off rust.

### Problem [CF-2056F1](https://codeforces.com/problemset/problem/2056/F1)

### Statement

A sequence $a$ of $n$ integers is called **good** iff the following condition holds:

- Let $cnt_x$ be the number of occurrences of $x$ in the sequence $a$.
- For all pairs $0 \\leq i < j < m$, at least one of the following must be true:
  - $cnt_i = 0$
  - $cnt_j = 0$
  - $cnt_i \\leq cnt_j$

In other words, if both $i$ and $j$ are present in the sequence, then the number of occurrences of $i$ must be **less than or equal to** the number of occurrences of $j$.

You are given integers $n$ and $m$. Compute the **bitwise XOR of the medians** of all **good** sequences $a$ of length $n$, where each element $a_i$ satisfies $0 \\leq a_i < m$.

Constraints:
$n \\leq 2^{200}$ (given to us in its binary form)
$m \\leq 500$

### Solution

A reasonable (and probably the only immediately obvious) direction to take is to fix the median and then consider the set of good sequences that correspond to that median, as $m$ is conveniently sized.

Clearly, for a fixed $m$, the only thing that matters is the number of sequences having their median as $m$. If this number is even, $m$ has a no contribution at all to the overall answer. A potential solution then begins to take form in one's mind:
- Iterate over $m$.
- Find the parity of the number of good sequences with $m$ as their median.
- If the aforementioned value is odd, include $m$ within the final set of terms to be XORed to get the answer.

Let's define two functions for convenience:
- $\\text{cnt}(m)$: The number of good sequences with $m$ as their median.
- $\\text{par}(x) = (x \\mod 2)$.

One can be excused for taking a preemptive sigh of relief upon the assumption that `;export{e as default};
