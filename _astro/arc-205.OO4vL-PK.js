const e=`---
displayMode: blog
title: ARC-205.md
date: 2025-09-07
tags: [contest]
---

## Thoughts

I took an atcoder contest after a long while and it didn't go that well. I didn't really understand how E was getting so many solves by lower rated people, after having determined that the naive square root decomposition I was unsuccesfully attempting to squeeze within the TL couldn't possibly have been the cheese that they used; However, I realized post-contest that it was indeed the solution everyone used, and my code also passes with a modification to the block size :clown: 

## Solutions

### A

Let's solve the problem for a single query spanning the entire grid. What if the grid consists of just white cells? Well, then the answer would just be $n \\cdot m - 2$ because we can iterate over the $2 * 2$ subgrids in increasing order of $(x, y)$ (their top-left cell) and always just color $(x, y)$ black. This is optimal because $(x, y)$ won't affect any subgrids we consider in the future.

Ok, what about arbitrarily colored grids? Is the following general strategy still optimal?:

\`\`\`
iterate over (x, y) in increasing order:
    if the 2 * 2 grid with (x, y) at the top left is all-white:
        color (x, y) black
\`\`\`

One can prove that it indeed is (outline: the number of operations performed by any strategy cannot exceed the total number of $2 * 2$ all-white subgrids in the initial grid (as upon every operation, one "converts" at least one $2 * 2$ all-white sub-grid to non-all-white) and our strategy achieves exactly this upper bound). 

So the answer to any query is just the number of $2 * 2$ sub-grids that are initially all-white, which can be computed semi-naively in $O(q \\cdot n)$ using per-row prefix sums.


### B

This is my favorite problem from this contest. 

We're given a complete undirected weighted graph where each edge has a weight of $0$ or $1$. We can perform operations of the following kind: we choose three nodes $a, b, c$, and xor the weights of the three edges on the unique cycle between the three nodes with $1$. What's the maximum number of edges with weight $1$ that we can have after some (possibly empty) sequence of operations?

In problems like these (where we iteratively traverse between states towards some optimal endpoint), it helps to consider two things:

- What an optimal state looks like (ie. its salient properties).
- What invariants are maintained as we traverse between states.

Let's consider the optimal state. An observation that strikes one is that for any $3$-cycle, at least $2$ edges must have a weight of $1$. Otherwise, we could just xor the cycle and get a strict increase in the score. This strict increase is important here, as it avoids any potential cyclicity between states.

Anyways, this implies that no node can have more than one incident edge with a weight of $0$.

This nudges us in the direction of considering individual nodes. Notice that when we perform an operation on some cycle $a, b, c$, the parity of the number of $1$-weight edges incident to $a$ doesn't change. So for every node, we can deterministically check if it ends up with $0$ or $1$ edges of weight $1$ in the optimal state (we just compare its initial parity with the parity of $n - 1$, the degree of every node in the complete graph). 

### C

Maybe atcoder has changed over the past few years, because problems like these were only found in ABCs back in the good old days.

Let's divide segments $s \\rightarrow t$ into two kinds:

- Type 1: $s < t$
- Type 2: $t < s$

We quickly observe two conditions whose conjunction constitutes a necessary and sufficient condition for a solution to exist:

1. No segments of different types can intersect.
2. For any two segments of a common type, one cannot be completely contained within the other.


Note that the second condition implies that:
1. For two type $1$ segments $s_1 \\rightarrow t_1$ and $s_2 \\rightarrow t_2$, $s_1 < s_t \\iff t_1 < t_2$. 
2. For two type $2$ segments $s_1 \\rightarrow t_1$ and $s_2 \\rightarrow t_2$, $s_1 > s_t \\iff t_1 > t_2$. 

If the n&s conditions are satisfied, the following ordering is valid:

1. First, we process all type $1$ segments in decreasing order of $s_i$.
2. Then, we process all type $2$ segments in increasing order of $s_i$.

### D

This is a much better problem than D, although it's also quite standard.

It can be reduced to the following: 

Given a tree, find the maximum number of pairwise disjoint pairs of nodes $(x, y)$ such that $\\operatorname{lca}(x, y) \\notin \\{x, y\\}$.

My path to the solution looked like the following:

- Make some observations that would be instrumental to later proving why the solution I end up at works, but don't really advance my general intuition for the problem.
- Draw on intuition from other problems to model a feasible solution.
- Realize that the observations I made were actually useful if only I had thought about the problem in a different way.

An observation that we can make is that an optimal state is also maximal (ie. we cannot pair any nodes without having to break some existing pairs), so all the unpaired nodes lie on the path from the root to some leaf. I actually won't bother going into other details of this first phase.

Now, let's try using an idea that's fundamental to subtree-dp solutions here:

> If you can compute the optimal answer for the subtree of node $u$ from the optimal answers for the subtrees of the children of $u$, you can compute the answer for the root by going over nodes in a bottom-up manner.

Alright, so let's say that for some node $u$, for every child $c$, we've computed the number of unmatched nodes in the subtree of $c$ after optimally solving the matching problem for this subtree. How do we now optimally solve the matching problem for the subtree of $u$?

Let's say the node $u$ had only two children $c_1$ and $c_2$. Some "greedy" steps that come to mind are:

1. "Inter-match" the unmatched nodes between the subtrees of $c_1$ and $c_2$. This will result in only at most one subtree having some unmatched nodes.
2. Assume that $c_1$ still has some unmatched nodes. Then consider the pairs which have both nodes in the subtree of $c_2$. If we have 2 unmatched nodes in the subtree of $c_1$, we can simply break apart such a pair from $c_2$, and match both the unmatched nodes from $c_1$ with one of these newly unmatched nodes from $c_2$. The number of times we do this is just $\\min(x/2, y)$ where $x$ is the number of unmatched nodes in $c_1$ and $y$ is the number of pairs completely contained within the subtree of $c_2$.

It's easy to see that the above merging updates can be processed in $O(1)$. For multiple children, when at some child $v$, we can assume all the children we've processed before it to form a monolith that we consider to be $c_1$, the current child to be $c_2$, and just perform the same update.

How to prove that these merges are optimal? <s> proof by AC </s>

My proof is complicated and not worth explaining, just look at the editorial.

### E

My "solution" is just a naive brute-force:

- Choose a block size $B$ and partition the array $a$ into blocks with this size.
- Process elements in increasing order of $i$. Whenever you enter a new block, recompute an SOS-DP array that includes all elements before this block.
- To find the answer for some $i$, you just consult one value in the SOS-DP array (corresponding to $a_i$), and also brute-force over all elements behind it in its own block.

This takes $O((n/B)\\cdot L \\cdot 2 ^ L + n \\cdot B)$ time, and can be made to pass with a not-terrible implementation and good block size.`;export{e as default};
