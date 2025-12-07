const e=`---
displayMode: blog
title: CF-2113E
date: 2025-08-10
tags: [editorial]
---

### Problem [CF-2113E](https://codeforces.com/problemset/problem/2113/E)

### Statement

> Marat is a native of Kazan. Kazan can be represented as an undirected tree consisting of $n$ vertices. In his youth, Marat often got into street fights, and now he has $m$ enemies, numbered from 1 to $m$, living in Kazan along with him.
> 
> Every day, all the people living in the city go to work. Marat knows that the $i$-th of his enemies lives at vertex $a_i$ and works at vertex $b_i$. He himself lives at vertex $x$ and works at vertex $y$. It is guaranteed that $a_i \\neq x$.
> 
> All enemies go to work via the shortest path and leave their homes at time 1. That is, if we represent the shortest path between vertices $a_i$ and $b_i$ as $c_1, c_2, c_3, \\dots, c_k$ (where $c_1 = a_i$ and $c_k = b_i$), then at the moment $p$ ($1 \\leq p \\leq k$), the enemy numbered $i$ will be at vertex $c_p$.
> 
> Marat really does not want to meet any of his enemies at the same vertex at the same time, as this would create an awkward situation, but **they can meet on an edge**. Marat also leaves his home at time 0, and at each subsequent moment in time, he can either move to an adjacent vertex or stay at his current one.
> 
> Note that Marat can only meet the $i$-th enemy at the moments $2, 3, \\dots, k$ (where $c_1, c_2, \\dots, c_k$ is the shortest path between $a_i$ and $b_i$). In other words, starting from the moment after the enemy reaches work, Marat **can no longer meet him**.
> 
> Help Marat find the earliest moment in time when he can reach work without encountering any enemies along the way, or determine that it is impossible.

Constraints:

- $n \\leq 10^5$ 
- $m \\leq 200$
- $1 \\leq x, y \\leq n, x \\neq y$
- $1 \\leq a_i, b_i \\leq n, a_i \\neq b_i$
### Solution

I anticipate the process of trying to explain the solution to this problem in a manner which conveys the process of me awkwardly stumbling through incorrect passages, until I happened to lay my eyes upon the obviously correct one that had lain right in front of me in a mockingly unassuming manner all this while, to be rather damaging to my ego. Consequently, I shall transport the reader to the very end of this process and spare him the assault of my fantastical ideas, some involving the use of bitsets for every path in a heavy-light decomposition of the given tree.

In problems like these, it helps to simulate the literal process unfolding with the help of your brain, with the hope of being able to glean some important/discerning information about the same. 

An attempt to visualize said process will make more self-aware readers realize that at every moment, we need only concern ourselves with the following:
- The set of nodes at which the MC can be located at the $t$-th second (let’s associate this with the color blue).
- The set of nodes upon which at least one of his enemies are located at the $t$-th second (let’s associate this with the color red).

Naturally, these (dynamic) sets maintain mutual exclusivity at any time $t$. 

Now, even before we visualize the process, one should have a vague idea of what it would involve, namely - the blue set “greedily” expanding outwards at the beginning of every second, and the red set then negating that blueness, or claiming some nodes for its own self (some subset of which may have been blue before/after the red expansion that occurred at the beginning of this second).

Eh, I think it would be better to just formally state the rules for our simulation before we proceed.

- We begin at $t=0$ with node $x$ being blue and all the starting nodes for enemies being red.
- Beginning at every second $t = i$, the following happens:
	- At $t=i + 0.2$, all the red elements (enemies) vacate their nodes and if this wasn’t the last node on their path, they hop on to the edge to their next node. Otherwise, they simply vanish.
	- At $t = i + 0.6$, all the blue nodes expand outward by 1 step (all empty nodes that are adjacent to at least 1 blue node become blue).
	- At $t = i + 0.8$, all the red enemies waiting on edges move on to the next nodes in their path and claim these for themselves (possibly from the blue set).
- The process ends at the earliest second when $y$ is blue or there is no blue node remaining. It’s easy to see that it takes at most $2 \\cdot n$ seconds to end, and always ends.

Make of the following visualization what you will ($x = 1, y = 9$ and the paths are $[9 \\rightarrow 1], [7 \\rightarrow 1]$):
<div style="text-align:center"><img src="/assets/cf-2113e/sim1.gif"/></div>

Now, if one were to try to estimate the computational expense of a literal simulation of this process, he would realize that at every second, steps 1 and 3 are cumulatively feasible to simulate (since each node is colored red a maximum of $m$ times, we process nodes at most $n \\cdot m$ times), but step 2 seems to potentially involve the consideration of $O(n^2)$ nodes across the timeline.

Solving this problem reduces to understanding that/why the latter is false, and I happened to do so by modifying our system in the following manner:
- The timeline begins at $t = -1$, with every node being initially blue.
- At $t = -1 + 0.8$ (when the waiting red elements claim their nodes), we make a one-time exception (to requiring enemies for blue -> red conversions) and give every single node except $x$ to the red set.
- The simulation continues as usual from $t = 0$.

Why is this modification helpful? Well, because it helps us internalize the idea that every node has a sort of "default" value of blue. Why is that helpful? Well, because if a node starts off as blue, then the number of times it's (re)claimed by the blue set is at most the number of times it was snatched away by the red set, and the latter corresponds to steps 1 and 3, which are tractable (so any blue node becomes red at most ~$m$ times, and any red/colorless node therefore becomes blue at most ~$m$ times).

Also note that this modification at $t = -1$ doesn't affect the computational difficulty of the problem (which one might mistakenly assume, as we effectively added $O(n)$ paths) as we only require the maximum number of times a single node switches from blue to red (and vice-versa) to be $O(m)$, and not necessarily the total number of paths.

A concrete solution now begins to assume form:

\`\`\`
start with B = {x} and R = {whatever}
ans = -1

for t from 0 to 2 * n:

	for every enemy:
		vacate its red node, move it onto an edge/kill it  

	for every non-blue node that's adjacent to a blue node:
		make it blue
	
	for every enemy:
		color the next node (potentially blue) in its path red
	
	if y is blue:
		ans = t
		stop
\`\`\`

The only thing that remains is to figure out how to efficiently iterate over non-blue nodes that are adjacent to a blue node at the $t$-th second. Let's call this set of nodes $J(t)$.

Well, upon closer inspection, we realize that any node $v$ in $J(t)$ must satisfy at least one of the following (their disjunction is necessary but not sufficient):
- $v$ is colored red at time $t$.
- Some node adjacent to $v$ was colored blue at time $t - 1 + 0.8$ (and not claimed by the red set at time $t - 1 + 0.8$).

Notice that we didn't enforce the requirement of being next to a blue node in the first case (unlike the second), this condition simply constitutes a large, convenient net we cast upon a search space, and we shall now pay the cost for potential overcatch by actually having to check for blue neighbours. This turns out to not be very punishing, as we can go over all red nodes at time $t$ and trivially check if any of their neighbours is blue at time $t$ (this is fine since any node is red at at most $m$ points of time, and this therefore takes $O(\\sum{m \\cdot \\text{deg}(u)}) = O(m \\cdot \\sum{\\text{deg}(u)}) = O(m \\cdot n)$ time across the timeline). Finding all red nodes at a certain time is obviously trivial.

Let's now consider the second condition. For every node $v$ that gets colored blue at time $t - 1 + 0.6$, we have to consider all of its neighbours at time $t + 0.6$. This amounts to incurring a computational cost of $O(\\text{deg}(u))$ every time a node is colored blue, but it's also fine, as each node is colored blue at most $m$ times, and the total computational cost across the timeline for these neighbourial considerations also sums up to $O(\\sum{m \\cdot \\text{deg}(u)}) = O(m \\cdot \\sum{\\text{deg}(u)}) = O(m \\cdot n)$.

We finally have the following solution:

\`\`\`
start with B = {x} and R = {whatever}
ans = -1

for t from 0 to 2 * n:
	
	for every enemy:
		vacate its red node, move it onto an edge/kill it  

	to_be_made_blue = {}
	for every node u that was red at time t:
		if any neighbour v of u is blue:
			put u into to_be_made_blue
	for every node u that was made blue at time t - 1 + 0.66:
		if u is still blue:
			for every neighbour v that's not blue:
				put v into to_be_made_blue
	for every node u in to_be_made_blue:
		make it blue

	for every enemy:
		color the next node (potentially blue) in its path red
		
	if y is blue:
		ans = t
		stop
\`\`\`

I shall spend no more time yapping about additional implementation details as I'm sleepy. [Here](https://codeforces.com/contest/2113/submission/332408233) is code if you want some.

Finally, our solution runs in $O(n \\cdot m)$ time, which is acceptable.

It's 5:19 AM and I'm really comfortable in my bedrot fortress, perhaps to a point where the foggy complacence induced by this leisurely state has made the blog really bad.`;export{e as default};
