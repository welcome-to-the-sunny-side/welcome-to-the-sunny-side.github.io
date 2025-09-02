const n=`---
displayMode: blog
title: CF-2056F2
date: 2025-09-02
tags: [editorial]
---

This is the harder version of the problem I previously discussed [here](https://www.welcome-to-the-sunny-side.com/algo/problems/cf-2056f1.html).

### Problem [CF-2056F2](https://codeforces.com/problemset/problem/2056/F2)

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

- $n \\leq 2^{10^5}$ (given to us in its binary form)
- $m \\leq 10^9$

### Solution

I'm going to pick up right where I left off in the previous blog.

Notice the changes in this version - the constraints on $k$ and $m$ have both increased by orders of magnitude, rendering our previous methods of approach (particularly those that required superlinear time w.r.t. $m$) useless.

Let's examine the algorithm we used earlier at a high level, and see if there are components vulnerable to optimization:

\`\`\`
ans = 0
for median q from 0 to m - 1:
    par = 0
    for (# of unique elements) x from 1 to min(q + 1, k):
        if (C(q, x - 1) * f(k, x)) % 2 == 1
            par ^= 1
    if par == 1
        ans ^= q
\`\`\`

Firstly, we cannot compute required values of $f$ trivially in $O(k^2)$ like we did earlier, but we can analyse the recurrence and realize that $f(i,j) = 1 \\iff (i - j) \\text{AND} ((j - 1)/2) = 0$ (where $\\text{AND}$ is the bitwise-AND operation). The proof for this is left as an exercise to the reader. We can therefore get rid of the $O(k^2)$ precomputation we were performing earlier, and look up values for $f(i, j)$ in $O(1)$.

Now, as we already know from the ideas introduced in the previous blog: $(\\binom{q}{x - 1} \\equiv 1 \\pmod{2}) \\iff ((x - 1) \\text{ is a submask of } q)$, so when iterating over the number of unique elements $x$, we can simply ignore all $x$ where $x - 1$ isn't a submask of $q$. To make things more convenient, let's redefine $x$ to be the number of unique elements besides the median (just so we can say "$x$ must be a submask of $q$" instead of "$x - 1$ must be a submask of $q$"). The algorithm now becomes:

\`\`\`
ans = 0
for median q from 0 to m - 1:
    par = 0
    for submask x of q such that x < k:
        par ^= f(k, x + 1)
    if par == 1
        ans ^= q
\`\`\`

It should not be difficult to spot some glaring redundancy here, namely the fact that $\\text{par}$ can be computed in an identical manner for several $q$!

Why is this the case? Notice that while $q$ can be rather large, we limit the submasks $x$ to the range $[0, k)$, where $k$ is at most $10^5$. This means that only the first $L = \\lceil \\log_2{k} \\rceil$ bits of $q$ determine whether $x$ is a submask of $q$ or not. 

To avoid this redundancy, we can instead compute the value of $\\text{par}$ only once for every suffix mask (least significant bits) of $L$ bits (which is feasible since $2^L \\approx O(k)$), and if it turns out to be $1$, we know that we would have individually XOR'd the answer with $q$ for all $q$ which have this mask as a suffix in our original algorithm, so we can now just try to process all of those individual changes together! Note that we can also conveniently ignore the restriction that $x \\leq k$, and instead just let it be a submask of $2 ^ L$ as $f(k, x) = 0$ for $x > k$ in any case.

Our algorithm now reduces to the following:

\`\`\`
ans = 0
for (median suffix mask) p from 0 to (2^L - 1):
    par = 0
    for submask x of p:
        par ^= f(k, x + 1)
    if par == 1
        ans ^= (q : (the first L bits of q = p))
\`\`\`

Now, the problem decomposes to two easy and independent subproblems:

1. Finding $(\\bigoplus_{x \\in p} f(k, x + 1)) \\forall p \\in [0, 2^L)$ (here $x \\in p$ means that $x$ is a submask of $p$). This is a standard application of SOS DP, and warrants no further explanation from me.
2. Finding  $(\\bigoplus_{p \\in_{L} q} q) \\forall p \\in [0, 2^L)$. This can be done in $O(1)$ but I hate digit analysis far too much to not have mindlessly bashed it in $O(\\log_2^3{m})$.

So our final solution runs in $O(k \\cdot (\\log_2{k} + \\log_2^3{m}))$ and can be optimized to $O(k \\cdot \\log_2{k}$ at the risk of one's sanity.

Code:

\`\`\`cpp
#include<bits/stdc++.h>
using namespace std;

#ifdef natural_selection
#include "../libra/misc/dbg.h"
#else
#define debug(...)
#define endl "\\n"
#endif

#define int int64_t

const int one = 1;

signed main()
{
    ios_base::sync_with_stdio(false), cin.tie(NULL);
    int t = 1;
    cin >> t;
    while(t --)
    {
        int k, m;
        cin >> k >> m;

        string n;
        cin >> n;

        k = count(n.begin(), n.end(), '1');

        int L = 0;
        while((one << (L)) <= k)
            ++ L;

        auto f = [&](int a, int b) -> int
        {
            if(a < b)
                return 0;
            return ((a - b) & ((b - 1) >> 1)) == 0;
        };

        vector<int> sos(one << L);
        for(int p = 0; p < (one << L); p ++)
            sos[p] = f(k, p + 1);
        for(int i = 0; i < L; i ++)
            for(int p = 0; p < (one << L); p ++)
                if((one << i) & p)
                    sos[p] ^= sos[p ^ (one << i)];

        int ans = 0;
        for(int p = 0; p < (one << L); p ++)
        {
            if(sos[p])
                if(p < m)
                {
                    int xorsum = 0;
                    // p0 p1 ... p(L-1) bit(L) bit(L+1) ... 
                    for(int b = L; b < 30; b ++)
                        if((one << b) + p < m)
                        {
                            vector<int> bits;
                            for(int i = L; i < 30; i ++)
                                if(i != b)
                                    bits.push_back(i);
                            
                            int sz = bits.size();
                            int l = 0, r = (1 << sz), opt = 0;
                            while(l <= r)
                            {
                                int mid = (l + r)/2;

                                int sum = (one << b) + p;
                                for(int i = 0; i < bits.size(); i ++)
                                    if((one << i) & mid)
                                        sum += (one << bits[i]);
                                
                                if(sum < m)
                                    opt = mid, l = mid + 1;
                                else
                                    r = mid - 1;
                            }

                            if((opt + 1) & 1)
                                xorsum ^= (one << b);
                        }

                    {
                        vector<int> bits;
                        for(int i = L; i < 30; i ++)
                            bits.push_back(i);
                        
                        int sz = bits.size();
                        int l = 0, r = (1 << sz), opt = 0;
                        while(l <= r)
                        {
                            int mid = (l + r)/2;

                            int sum = 0;
                            for(int i = 0; i < bits.size(); i ++)
                                if((one << i) & mid)
                                    sum += (one << bits[i]);
                            
                            if(sum + p < m)
                                opt = mid, l = mid + 1;
                            else
                                r = mid - 1;
                        }

                        if((opt + 1) & 1)
                            xorsum ^= p;
                    }                    

                    ans ^= xorsum;
                }
        }
        cout << ans << endl;
    }
}
\`\`\``;export{n as default};
