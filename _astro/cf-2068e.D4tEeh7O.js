const e=`---
displayMode: blog
title: CF-2068E
date: 2025-09-13
tags: [editorial]
---

This is a surprisingly elegant ICPC problem that happens to be in the official codeforces problemset.

### Problem [CF-2068E](https://codeforces.com/problemset/problem/2068/E)

### Statement

> FC Porto and SL Benfica are the two largest football teams in Portugal. Naturally, when the two play each other, a lot of people travel from all over the country to watch the game. This includes the Benfica supporters' club, which is going to travel from Lisbon to Porto to watch the upcoming game. To avoid tensions between them and the Porto supporters' club, the national police want to delay their arrival to Porto as much as they can.
> 
> The road network in Portugal can be modelled as a simple, undirected, unweighted, connected graph with $n$ vertices and $m$ edges, where vertices represent towns and edges represent roads. Vertex 1 corresponds to Lisbon, i.e., the starting vertex of the supporters' club, and vertex $n$ is Porto, i.e., the destination vertex of the supporters' club. The supporters' club wants to minimize the number of roads they take to reach Porto.
> 
> The police are following the supporters' club carefully, and so they always know where they are. To delay their arrival, at any point the police can pick exactly one road and block it, as long as the supporters' club isn't currently traversing it. They can do this exactly once, and once they do that, the road is blocked forever. Once the police block a road, the supporters' club immediately learns that that road is blocked, and they can change their route however they prefer. Furthermore, the supporters' club knows that the police are planning on blocking some road and can plan their route accordingly.
> 
> Assuming that both the supporters' club and the police always make optimal choices, determine the minimum number of roads the supporters' club needs to traverse to go from Lisbon to Porto. If the police can block the supporters' club from ever reaching Porto, then output −1.

Constraints:

- $n \\leq 2\\cdot 10^5$
- $m \\leq 2 \\cdot 10^5$

### Solution

I'll refer to the party traversing the graph from $1$ to $n$ as player $A$ and the other as player $B$.

Let's try to think of optimal strategies for $A$ and $B$. 

When trying to analyse the situation by mentally simulating some naive strategies, one runs into a sort of "chicken and egg" problem that is common in game-theoretic problems like these - the optimal move for $A$ at some state depends on the optimal move performed by $B$ before it, which in turn depends on the optimal move performed by $A$ before it, and so on, leading to a lack of "fixed points" in the timeline to build something concrete upon.

Consider a naive strategy: What if $A$ just always follows the shortest path in the current graph to the destination? 

Now consider the following graph:

<div style="text-align:center"><img src="/assets/cf-2068e/img1.png"/></div>

If $A$ tries to take the upper path ($1 \\rightarrow 2 \\rightarrow 6$), $B$ deletes the edge $2 \\rightarrow 6$ when $A$ reaches $2$, and $A$ then has to backtrack and go to $6$ through the path $2 \\rightarrow 1 \\rightarrow 3 \\rightarrow 4 \\rightarrow 6$, having taken $5$ steps in total.

However, if we go down the lower path instead, $B$ has two equally optimal moves, which both lead to a path length of $4$:

1. Delete edge $(3, 4)$ after $A$ traverses the edge $1 \\rightarrow 3$. $A$ then takes the path $3 \\rightarrow 1 \\rightarrow 2 \\rightarrow 6$.
2. If $B$ doesn't do the above, then $A$ traverses the edge $3 \\rightarrow 4$ and $B$ deletes the edge $(4, 6)$. $A$ then goes to $6$ via $4 \\rightarrow 5 \\rightarrow 6$.

So the "always follow the shortest path" strategy is clearly not optimal for $A$. We can however note that once $B$ performs his singular move, it's obviously optimal for $A$ to take the shortest path in this modified graph from his current position to the destination. 

Notice that if $A$ reaches some node $u$ without $B$ already having performed his move, then the moves performed after that moment ($A$ reaching $u$) are totally independent of those before. Let's define $t(u)$ to be the length of the path traversed by $A$ after reaching $u$ if it reaches this position without $B$ having already performed his move. The final answer is clearly $t(1)$.

Some more definitions:
- $G(V, E)$ - the graph we operate upon.
- $\\operatorname{dis}_{E'}(u, v)$ shortest distance between the nodes $u$ and $v$ in the graph $G(V, E')$. 

Now, can we compute $t(u)$ assuming all $t(v) : v \\neq u$ are available to us? 

There are two branches, based on what $B$ does after $A$ reaches $u$:

1. $B$ deletes some edge right after we reach $u$. Which edge would $B$ delete in this case? Some edge $(x, y)$ that maximises $\\operatorname{dis}_{E \\setminus \\{(x, y)\\}}(u, n)$. 
2. $B$ stalls and decides to delete an edge later. In this case, $A$ simply moves to $\\arg \\min_{(u, v) \\in E} t(v)$, and we have $t(u) = 1 + \\min_{(u, v) \\in E} (t(v))$.

We therefore have:

$$t(u) = \\max(\\max_{(u, v) \\in E } (\\operatorname{dis}_{E \\setminus \\{(u, v)\\}}(u, n)), 1 + \\min_{(u, v) \\in E} (t(v)))$$

The first term in the outermost max is clearly problematic, as it requires the consideration of way too many edges, along with a computationally unfriendly function (shortest path from a source after the deletion of an edge), so let's think a bit more about the edges we may need to delete.

Clearly, the optimal edge $(x, y)$ that $B$ deletes needs to lie on some shortest path from $u$ to $n$, as we would otherwise always have $\\operatorname{dis}_{E \\setminus \\{(x, y)\\}}(u, n) = \\operatorname{dis}_{E}(u, n)$, which is the worst possible outcome for $B$. To be more accurate, if the edge $(x, y)$ doesn't lie on **all** shortest paths from $(u, n)$, we'll always have $\\operatorname{dis}_{E \\setminus \\{(x, y)\\}}(u, n) = \\operatorname{dis}_{E}(u, n)$.

So if there's no common edge shared between all shortest paths, we need not bother with the first term, but what if there is? Trying to optimally choose one ends up being rather cancerous once you think about it, and no sub-linear way presents itself quickly.

Notice that while trying to prune the set of potentially deleted edges $D$ above, we only considered the restriction imposed upon us after entering branch 1 (ie. when we know that $B$ definitely makes a move), but we should also consider requirements for entering branch $1$ in the first place (ie. edges for which it's more optimal for $B$ to stall and delete later as opposed to just now).

What if $(x, y)$ is "far away" from $A$'s current position $u$? One gets the intuitive sense that deleting $(x, y)$ when $A$ is just at $u$ might serve as a sort of "early warning" and prevent it from doing some backtracking that it otherwise would have.

The intuitive hope is that deleting later leads to a longer path due to $A$ "receiving a surprise (that it was already expecting) as late as possible". The image below attempts to show the picture in my mind when at this stage on the path to the solution.

<div style="text-align:center"><img src="/assets/cf-2068e/img2.png"/></div>

Upon some further thought, one realizes that it's never optimal to delete some edge $(x, y)$ if it's not incident to $u$.

<details><summary class ="spoiler-summary">Proof</summary>
<div class = "spoiler-content">
Let's say $A$ is at $u$ and $B$ is considering some edge $(x, y)$ which is not incident to $u$.

Let's say $B$ doesn't delete it now.

- If at some point of time in the future, $A$ reaches $x$ (or WLOG $y$), $B$ deletes $(x, y)$ immediately afterwards. $A$ then goes from $x$ to $n$. This leads to it taking a path $u \\rightarrow x \\rightarrow n$ (which necessarily doesn't include the edge $(x, y)$), which is at least as long as any path it could have taken from $u$ to $n$ without the edge $(x, y)$ if $B$ deleted the edge immediately after it reaching $u$.
- Otherwise, if $A$ never even visits $x$ (or $y$) in the future, then deleting $(x, y)$ wouldn't have been (strictly) optimal in the first place.
</div>
</details>

So we now know that if $B$ chooses to delete an edge after $A$ reaches $u$, it's going to be some edge $(u, v)$ that lies on at least one shortest path from $u$ to $n$ (if there are multiple such edges, then deletion is pointless as discussed before).

Define $f(u)$ to be the length of the shortest path from $u$ to $n$ if we delete one edge $(u, v)$ which lies on some shortest path from $u$ to $n$ in the original graph.

Since this seems like a standard subproblem, let's assume that we know how to solve this for now, and return to the expression:

$$t(u) = \\max(\\max_{(u, v) \\in E } (\\operatorname{dis}_{E \\setminus \\{(u, v)\\}}(u, n)), 1 + \\min_{(u, v) \\in E} (t(v)))$$

$$\\implies t(u) = \\max(f(u), 1 + \\min_{(u, v) \\in E} (t(v)))$$

Clearly, values in $t$ have interdependence, but we luckily don't have to deal with cyclic dependencies as each $u$ depends only upon the singular adjacent node $v$ which has the minimum value of $t(v)$. This is reminiscent of dijkstra's and we can indeed use it here in the following manner:

\`\`\`
precompute f[n]

initialize t[n] with t[i] = inf
t[n] = 0

set<pair<int, int>> q
q.push({t[n], n})

while(!q.empty()):
    int u = (*q.begin()).second
    q.erase(q.begin())

    for v in adj[u]:
        nx = max(1 + t[u], f[v])
        if(nx < tv):
            q.erase({t[v], v})
            t[v] = nx
            q.insert({t[v], v})

ans = t[1]
\`\`\`

Let's return to the subproblem we assumed to be solvable earlier. We consider the BFS-DAG of the given graph assuming the source to be $n$.

<details><summary class ="spoiler-summary">Definition of the BFS-DAG</summary>
<div class = "spoiler-content">
We group nodes into levels based on their distance from the source.

Then, it's easy to see that for every edge $(u, v)$, we have $\\vert \\operatorname{level}_u - \\operatorname{level}_v \\vert \\leq 1$.

Characterization of edges:

- $\\operatorname{level}_u - \\operatorname{level}_v = 0$ : cross edge
- $\\operatorname{level}_u - \\operatorname{level}_v = 1$ : back edge
- $\\operatorname{level}_u - \\operatorname{level}_v = -1$ : forward edge
</div>
</details>

Here's an accompanying visual:

<div style="text-align:center"><img src="/assets/cf-2068e/img3.png"/></div>

Notice that:

1. If some node $u$ has multiple back-edges $(u, v)$, then $f(u) = \\operatorname{dis}_E(u, n)$ (for example, $u = 5$ in the given image).
2. If a node $u$ has only one back-edge but has some cross-edge $(u, v)$, then $f(u) = \\operatorname{dis}_E(u, n) + 1$ (for example, $u = 13$ in the given image).

Let's consider the complement of the above two cases: we have a node $u$ with a single back-edge $(u, v)$ and no cross-edges incident to it (for example, $u = 10$ in the given image).

$f(u)$ is simply the shortest distance from $u$ to $n$ after having deleted the back-edge $(u, v)$. Clearly, this new shortest path is going to take the following form:

- We travel down to some node $j$ (reachable from $u$) such that $j$ has a cross-edge or back-edge $(j, k)$ such that $k$ isn't reachable from $u$.
- We take the back/cross-edge and then go from $k$ to $n$.

This path will have a length of $(\\operatorname{level}_j - \\operatorname{level}_u) + \\operatorname{level}_j + \\operatorname{cross} = 2\\cdot \\operatorname{level}_j - \\operatorname{level}_u + \\operatorname{cross}$ (where $\\operatorname{cross} = 1$ if we take a cross-edge and 0 otherwise). 

This implies that it's optimal to go to nodes with the lowest levels with such back/cross edges, and then prefer back-edges over cross-edges amongst these nodes.

Now, we don't really need to make any further simplifications as this sub-problem can be solved with some ugly small-to-large merging, but we can simplify it by a great deal.

Let's consider the BFS-Tree instead (a sub-graph of the BFS-DAG with no cross-edges and with each node having only one back-edge). The motivation for this is that it's much easier to work with trees then DAGs.

What's the problem with dealing with this BFS-Tree now? It's that some nodes that are reachable from $u$ in the BFS-DAG potentially don't lie within its subtree now. 

However, we observe that any node $j$ that's reachable from $u$ in the BFS-DAG but doesn't lie within its subtree in the BFS-Tree is a potential $j$ (as it's going to have a path to $n$ that doesn't involve the edge $(u, v)$).

This leads to the following solution (I'm only giving a rough outline as I'm tired):

- Build an euler tour on an arbitrary BFS-Tree.
- For every node, compute the following six values:
    - lowest in-time cross-edge
    - lowest in-time back-edge
    - lowest in-time forward-edge
    - greatest in-time cross-edge
    - greatest in-time back-edge
    - greatest in-time forward-edge
- Build a merge sort tree on the euler tour such that for every node $u$, you store the aforementioned six things (in the form of pairs - $(\\operatorname{time}, \\operatorname{level}_u + \\operatorname{constant})$, where $\\operatorname{time}$ is one of the six values and $ \\operatorname{constant}$ is dependent on the kind of edge being considered) at the leaf-node in the merge-sort tree at the in-time of $u$. The rest of the merge-sort tree is built using the pairs at these leaf nodes.
- To find the optimal $j$ for some node $u$, you simply need to perform a rectangle query over $[\\operatorname{tin}_u, \\operatorname{tout}_u]$ in this merge-sort tree to find a pair that (a) has first element outside $[\\operatorname{tin}_u, \\operatorname{tout}_u]$ (b) has the smallest possible value of the second element. There are a couple of edge cases though (for example, the back-edge $(u, v)$ might result in a false-positive), so deal with them in whatever manner you find convenient.

And oh, the case where the answer is $-1$ is trivial, and is left as an exercise to the reader.

My code can be found [here](https://codeforces.com/contest/2068/submission/338128423).
`;export{e as default};
