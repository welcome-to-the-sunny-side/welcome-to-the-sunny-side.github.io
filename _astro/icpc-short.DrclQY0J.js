const e=`---
displayMode: blog
title: AWF 2026
date: 2026-03-18
tags: ["contest"]
---


### The Contest

Some parts of the building that contained the contest hall seemed to be under renovation, and as we coughed our way through the dusty corridors in search of our destination, I wondered if the loud noises being made by power tools yesterday would trouble us during the contest. The dysfunction in this country would appear charming on paper if I didn't have to live in it. We eventually found the right room around 9:15 AM, and settled ourselves in for the next 6 hours or so (the contest was to take place from 10 AM to 3 PM).

Typing out templates in the allotted 15-30 minutes before the contest begins has always been one of those things that I imagine a layman would naively predict to matter a lot (even if only in the initial few hours), but doesn't quite seem to in practice. Nevertheless, I typed some boilerplate code to be used across all files, a fenwick tree, and a modular arithmetic template (I always ask GeometryDashAddict to type the modular inverse function for some reason). In previous editions, most of this time would have been spent typing some over-engineered debug helpers. It's hard to explain why I *absolutely needed* these without sounding like an obstinate asshole, so I won't.


<details><summary class ="spoiler-summary">Some more details on debugging</summary>
<div class = "spoiler-content">

Here's a somewhat elegant function that can debug most STL types and nested versions thereof, but it requires C++20, which wasn't guaranteed to be available:

\`\`\`cpp
template<typename T> 
void __print(const T& x) {
    if constexpr (is_arithmetic_v<T> or is_same_v<T, string>) cerr << x;
    else {
        cerr << '{';
        if constexpr (requires {x.first;})
            __print(x.first), cerr << ", ", __print(x.second);
        else {
            int f = 0; for(auto i : x) cerr << (f ++ ? ", " : ""), __print(i);}
        cerr << '}';
    }
}
template <typename... A>
void _print(const A&... a) {((__print(a), cerr << ", "), ...);}
#define debug(...) cerr << "[" << #__VA_ARGS__ << "] = ["; _print(__VA_ARGS__); cerr << "]\\n";
\`\`\`

Here's a blog I wrote asking for help on this: [link](https://codeforces.com/blog/entry/135911)


</div>
</details>


Previously, I've tried to avoid spending time at the keyboard for as long as possible (out of a belief that it exhausted me and degraded my mindsolving ability), and instead preferred to delegate the implementation of mindsolved solutions to my teammates. This had always seemed pretty irrational to my teammates as I was the fastest amongst us in individual contests, but as you might be beginning to understand - I'm a pretty stubborn person. Anyway, I had been gradually made to see reason over the practice contests we took in the last few months, and was going into the contest with the knowledge that I would be implementing the bulk of the code we submitted.

A few minutes before 10:00 AM, it was announced that the contest was to be delayed by 15 minutes, so I typed as much of our lazy segment tree as I could before the contest started.

Note: I will be referring to problems by their letter codes going forward. The problemset can be found [here](https://www.dropbox.com/scl/fi/lydx7brjj1v24qe4bpfn0/asiawest2025-2026.pdf?rlkey=m4hpai7rfd866lkl0jdb1fum0&st=p469gn61&dl=0) and also on CodeChef [here](https://www.codechef.com/ICPCAWOS25).

10:15 eventually arrived and we were upon the problemset like a rash. Having previously been burned due to a lack of attention at the start of contests, we gave every problem a cursory glance while constantly refreshing the solve counts. There weren't any solves for the first few minutes, so I looked for problems with reasonably simple setups (a decent proxy for difficulty).

Amongst the problems I had seen, G and L seemed to be the most promising candidates.

L was the following:

> Given integers $n \\in \\lbrace 8, 10^6 \\rbrace$ and $k$, find any permutation $p$ of integers in $[1, n]$ such that $\\sum_{i = 1}^{i = n - 1} \\gcd(p_i, p_{i+1}) = k$.

I didn't like the look of the problem, and handed it over to GeometryDashAddict, who tends to enjoy problems like these.

G on the other hand, seemed rather straightforward, and the outline of an implementation-heavy solution with a trie was materializing in my head. As I showed the problem to GrokSponsoredPS5, some part of me warned me to not fixate upon non-trivial problems at the beginning of the contest (which had been my most reliable strategy for ruining our performances in the past).

In the midst of this, E got its first solve, drawing the attention of me and GrokSponsoredPS5. I don't know how this problem managed to slip through our initial sweep of the problemset, as it was quite unimpressive in both appearance and actual difficulty:

> An array of integers $a$ is said to be good if for every pair of subarrays (of this $a$) $x$ and $y$: $$\\vert x \\vert > \\vert y \\vert \\implies \\text{sum}(x) > \\text{sum}(y)$$
> 
> Given some $n$ $(1 \\leq n \\leq 500)$, find any good permutation of integers in $[1, n]$ if one exists. Otherwise, report that none exist.

This is the sort of problem for which you find some plausible construction(s) from a couple of observations, and then pray to your deity of choice while frantically implementing code that outputs said construction. In this case, I observed that no two elements with value $< \\lfloor n/2 \\rfloor$ could be adjacent in a good permutation, as the 2-length subarray containing them would have a strictly smaller sum than the 1-length subarray containing value $n$. I told this to GrokSponsoredPS5, and we both agreed that the construction \`1 n 2 (n-1) 3 (n-2) ...\` seemed reasonable. It seemed like this construction would work for all $n$, but with the level of uncertainty these guesses involve, it would be foolish not to implement a check. I spent a couple of minutes writing code that computed the maximum/minimum sum for each subarray length, and then compared these for all lengths with an absolute difference of 1. This turned out to be a waste of time, as the construction did work for all $n$. I wonder if the sole reason for having $n \\leq 500$ instead of typical linear-time constraints was to troll participants into implementing the $O(n^2)$ check. I submitted our code at 10:30 AM, and we got our first solve of the day.

While I had been implementing E, A had also received a few solves, and upon noticing this, GeometryDashAddict and GrokSponsoredPS5 mindsolved it within a couple of minutes. I promptly gave up the PC to them and began going through the printed copy of the problemset. They discussed the solution for a few minutes and one of them implemented a few lines of code (I didn't remember which one of them implemented it, as I wasn't observing them at the time. Looking at our submission now, it was obviously GrokSponsoredPS5, as the code follows the objectively inferior convention of not putting a newline before opening braces). They submitted the code at 10:38 AM, and we were pleasantly greeted with another AC.

In the past, GeometryDashAddict and I have been wary of "exposing ourselves" to the ranklist during the contest. For me, this goes beyond just ICPC - I hate having information about how I'm performing relative to other participants in any competitive activity, during the period of participation. Imposing this restriction upon me is simple enough during online contests, as a browser extension can easily block specific HTML on troublesome webpages, but such luxuries as uBlock Origin aren't made available during ICPC. This had been especially annoying because CodeChef shows your current rank on the same page that displays invaluable information about solve counts, and not visiting this page was out of the question. In previous editions, we had tried some (admittedly insane) workarounds at my behest, with the most effective being increasing the zoom of the webpage to 200% to make the site serve the mobile version of the webpage. None of these worked well though (in particular, the zoom trick didn't work because it would also increase the zoom of the problem statement pages), and I was forced to learn to not freak out upon being made aware of our exceptionally good/bad pace. Funnily enough, neither of our third teammates (previously WellGroomedHair, and now GrokSponsoredPS5) faced this problem. Many of these thoughts rushed through my mind as we saw our rank jump to 6 after the AC on A.

Throughout my ICPC career, good starts have been scarce, with the best we've had ending in disaster at the-regional-that-shall-not-be-named. Knowing this, I kept my expectations in check. As we enthusiastically resumed our perusal of the problemset, D received its first solve about a minute after our solve on A.

D reduced to the following:

> You are given a simple, connected, undirected graph with $n$ vertices and $m$ edges ($n, m, \\leq 2000$). The $i$-th edge in the input has a weight of $2^i$. You are also given an integer $k$, such that **$\\lceil n/2 \\rceil \\leq k \\leq n$**.
> 
> Find the minimum possible total weight of a spanning tree of this graph, such that no vertex in the spanning tree has a degree greater than $k$. If no such spanning tree exists, report so.

I'm decent at trees and combinatorics, so I gladly took up this problem.

At first glance, it seemed fairly plausible that the high-level strategy would be the following:

- As $2^i > \\sum_{j < i} 2^j$, it's beneficial to remove an edge from our spanning tree even if it means having to include all edges with smaller weights to preserve validity.
- This leads to a straightforward selection algorithm:
  - Define a procedure \`check(i, S)\`, which checks if it's possible to select some subset $P$ of edges with indices in $[1, i)$ such that $S \\cup P$ is a valid spanning tree.
  - Start with an empty edge-set $S$. We will add edges that belong to the final spanning tree to this $S$.
  - Iterate over edge $i$ in decreasing order of weight, and on every iteration, add $i$ to $S$ iff \`check(i, S)\` returns false.
  - Finally, $S$ will constitute an optimal spanning tree if one exists, and will otherwise contain an invalid one (violating connectivity or degree constraints).

Now, only one question remained: how to implement \`check(i, S)\` efficiently?

I decided to think about what could "go wrong" if one tried a naive strategy - iterate over the edges in $[1, i)$ in increasing order of $i$, and simply add edges to the spanning tree if they: (i) unite two disconnected components (ii) do not lead to a violation of the degree constraints.

Well, the only way it would go wrong was if there were multiple connected components at the end. We're only interested in false negatives here, as there is no possibility of a false positive. In the case of a false negative, some subset from $[1, i)$ would be valid, but our naively chosen one wouldn't.

I was only a few minutes into the problem at this point, and all of this seemed rather abstract, so I asked GeometryDashAddict to just construct some concrete examples that showcased the failure of the naive strategy. As he worked on this, I pre-emptively wrote some code that we would almost certainly use, no matter our final solution - I/O and a DSU. A few minutes later, he showed me the following, with $n = 7$ and $k = 3$:

<figure style="text-align: center;">
  <img
    src="https://i.ibb.co/ynPc1WL9/Screenshot-2026-03-14-at-2-47-17-PM.png"
    alt="Alt text"
    width="600"
    style="display: block; margin: 0 auto;"
  >
  <figcaption>
    Graph 1: n = 7, k = 3.
  </figcaption>
</figure>


The issue here was that the only valid selection of edges is $\\lbrace 1, 2, 3, 4, 6, 7 \\rbrace$, but naive selection (in increasing order of edge labels) would include edge $5$, disallowing the inclusion of $6$ and $7$ later. However, this counter-example doesn't conform to problem's constraints, as $(k = 3) < \\lceil (n = 7)/2 \\rceil$. Nevertheless, it gave us reason to pause.

$k \\geq \\lceil n/2 \\rceil$ had seemed obviously important from the very beginning and we knew that our strategy wasn't exploiting it at all. I suddenly realized that it was impossible for more than one node to have a degree greater than or equal to $k$ in any spanning tree, as it was guaranteed that $k \\geq \\lceil n/2 \\rceil$. This meant that in the case of a false-negative, the forest induced by the naively chosen edge-set took on a very specific structure:

- We're referring to the internal execution of a call to \`check(i, s)\` here. Let's call edges in $S$ "static edges", edges in $[1, i)$ that we include within $P$ - "taken edges", and edges from $[1, i)$ that we don't include - "ghost edges".
- There would be more than one connected component in the forest defined by $S \\cup P$.
- There would be exactly one node with degree equal to $k$, and all other nodes would have a strictly smaller degree. Let's call this node "heavy", the connected component contained it "big", and the other connected components "small".
- There would obviously be no static or taken edges between different connected components, but the key observation is that **all** the inter-component ghost edges take the form $(\\text{heavy node}, \\text{some node in a small component})$.

As I explained this to GeometryDashAddict, the team sitting in front of us audibly celebrated getting the first solve on B. I hope such a physical reminder of how we were throwing away our excellent start and falling behind, was reason enough to justify the way I threw caution to the wind in response. Or well, it would have been if my recklessness had worked out.

Wanting to be done with D as soon as possible, I offered GeometryDashAddict a hand-wavy justification for why $k \\geq \\lceil n / 2 \\rceil$ was indeed enough for the naive strategy to be correct. He agreed with me, and the rapidly growing number of solves on the problem also seemed to indicate that the solution was simple. After telling GrokSponsoredPS5 to work on B, I began finishing the half-complete code for D. The code was ready in about 10 minutes and I submitted it at 11:19 AM with bated breath. WA.

I still believe that the Codeforces UI has the highest ratio of $\\frac{\\text{rage induced through annoying visual indicators for a WA}}{\\text{satisfaction induced through pleasant visual indicators for an AC}}$, but the urge to flip the PC over that ran through me at this moment probably makes a strong case for CodeChef.

After taking a few deep breaths, I tried to calmly go through my code once again. It's hard to explain why, but in situations like these, I don't look for actual mistakes so much as I do excuses to submit incorrect code again. Deep down, I *know* that making more submissions with trivial modifications will lead to more WAs, which will further frustrate me, but it's hard to keep myself from scratching the itch. Perhaps it's self-sabotage, or perhaps it's me needing the weight of the additional WAs as motivation to actually do the work of examining the incorrect solution beyond just a superficial look-over. Continuing this trend, I invented a plausible-sounding story about how we might be failing to detect the violation of validity constraints upon adding edge $i$ to $S$ when \`check(i, S)\` returned false. GeometryDashAddict wasn't very convinced that this was the actual issue, but I convinced him that adding a few more checks was worth a try. It wasn't, and I added another WA on D to our tally at 11:33 AM.

While I had been busy making meaningless changes to our code for D, the team in front of us also solved C, claiming their spot at the top of the ranklist. Talk about contrast.

GeometryDashAddict noticed that I was getting agitated and told me that it would probably be for the better if we just switched to another problem for some time. He started working on C, and I asked GrokSponsoredPS5 what he had been doing with B.

B cleanly reduced to a problem on a DAG, and GrokSponsoredPS5 told me about this reduction. I confirmed the reduction by reading the problem statement from the source to be safe. The reduction was the following:

> You are given a DAG with $n$ nodes and $m$ edges ($n, m \\leq 500$).
> 
> In one operation, you are allowed to choose some node $u$ and do one of the following:
> 
> - Delete all of its incoming edges
> - Delete all of its outgoing edges
> 
> What is the minimum number of operations in which one can delete all edges from the DAG?

I tried to think about B for a few minutes, but it was apparent that I wouldn't be able to focus on it until I solved D. GrokSponsoredPS5 wanted to try some weird greedy strategy, but even after the limited time I had spent on the problem, I was sure that wouldn't work. The problem reeked of flows, and I told him to try and remodel it, but he said that he hadn't solved very many flow problems before.

After a few unproductive minutes, I just went back to D. I pestered GeometryDashAddict until he also agreed to work on it for some more time, and asked him to find a concrete counter-example for our strategy that conformed to the constraint on $k$.

While he worked on this, I pretended to think about D for some time. If one could peek into my mind and sample random phrases from my internal monologue at this point in time, a fair few of them would seem vaguely related to D, but what I was really thinking about, even if I couldn't recognize it at the time, was the undecided manner in which I was going to cope with yet another failure at AWF. Would I spend the entire summer rewatching *Welcome To the NHK* over and over like in 2024? Or perhaps play video games for 12 hours a day, every day like in 2025? With my teammates graduating this year, this was realistically my last chance at qualification, and I was blowing it away in real-time. Worse yet, I knew that I was blowing it away, and couldn't escape the ensuing paralysis. As I whiled away some precious tens of minutes, the team in front of us got YET ANOTHER solve. To add to my misery, it was D.

GeometryDashAddict shook me out of this spiral with a constraint-conforming example where our naive strategy failed. I do not remember the exact graph he drew, but this was the relevant subgraph, with $n = 5$ and $k = 3$:


<figure style="text-align: center;">
  <img
    src="https://i.ibb.co/wNJ3sGSY/Screenshot-From-2026-03-20-05-18-48.png"
    alt="Alt text"
    width="600"
    style="display: block; margin: 0 auto;"
  >
  <figcaption>
    Graph 2: n = 5, k = 3.
  </figcaption>
</figure>


Of course it was an embarrassingly trivial oversight that either one of us could have easily resolved in a couple of minutes, if this had happened in an online contest. Instead, I had spent the last two hours idly watching our rank plummet to the late twenties as I daydreamed of increasingly novel methods of self-sabotage at my disposal.

As I write this, I feel the urge to replace this detailed exposition on how thoroughly I fucked up on D with something vaguer. Something like a short paragraph that sarcastically plays these mistakes off as a "cute" scare which never posed any real threat. Something that while technically true, allows me to cower behind plausible deniability and allude to some more respectable explanations, instead of having the workings of my imperfect mind laid out bare.

As some consolation, GeometryDashAddict told me that C had been mindsolved. After some discussion with GrokSponsoredPS5, the two of them took control of the PC, and I resumed the unenviable task of wrestling D into submission.

The problem was that \`check(i, S)\` was still producing false-negatives. Say we run the naive strategy and end up with an incomplete spanning tree (ie. disconnection). I feel physically uncomfortable as I admit this, but for the last two hours, I had failed to realize the fact that in some situations, one can recover from this state by doing the following:

- Remove some "taken" edge of the form $(\\text{heavy node}, c)$ from $P$.
- Add a ghost edge from some node in the now-disconnected component containing $c$ to any node in the big component except the heavy one.
- This reduces the degree of the heavy node by 1 while maintaining the same connectivity relations. We can now add a ghost-edge from the heavy node to a small component, which was previously not possible.

After some more unpleasant analysis, I realized that performing these "rebalancing" operations was indeed enough to always produce a valid spanning tree in \`check(i, S)\` if one existed. However, a concrete solution still wasn't in sight, as a naive implementation of this strategy would run in cubic time. By this point, my dread for this problem had turned into an impatient annoyance. I knew that I had all but solved the problem. The problem knew that I had all but solved it. And yet, it continued to teasingly dart out of reach whenever I made an advance.

In what was to be a successful attempt to calm down, I excused myself to the bathroom. Strolling through the corridors at a leisurely pace, I was reminded of something from the distant past of 4 hours ago - my concerns about noise from the power tools had been pleasingly unfounded.

As I returned to the contest hall, the solution came to me in that inexplicable and annoyingly natural way that solutions to problems like these do, making the prior drought of ideas seem so utterly pointless. Perhaps the problem felt that my miserable devotion over the last few hours had proved me worthy, or perhaps it was made jealous by me wondering if I would return to an unexpected AC on C.

Progress required considering $k$ once again. When the naive strategy ended with multiple components in the case of a false negative, the heavy node had exactly $k$ children. This allowed the following (simple) strategy to work:

- Run a naive first pass like before to get an edge set $P$.
- Then, remove all the static edges incident to the heavy node from $P$. Run a second pass where you add edges with the exact same logic as the first, but instead of doing it for all ghost edges in $[1, i)$, do it only for the ghost edges in this range that aren't incident to the heavy node.
- Then, run a final third pass where you consider all the remaining ghost edges.

I settled back into our booth, cheerfully informed my teammates that I could begin implementing D (again), and was met with an understandable lack of enthusiasm. GeometryDashAddict asked me if I was *sure* that the solution was correct, and if this time wouldn't be better spent with me just going to another problem. I justified implementing the solution with the fact that they had stepped away from the PC due to some logical problem with their solution for C, and I might as well use keyboard-time now. Thankfully, it took me only about 10 minutes to code the additional two passes and verify the absence of simple bugs.

Even after testing the code against a few hand-crafted samples, I wasn't quite sure that I had implemented it correctly. After a sufficient amount of iterative modifications, one transitions from marvelling at code behaving correctly *because* of its structure, to marvelling at its ostensible correctness *in spite* of its structure. With this uneasy admiration, I pasted my code into the CodeChef IDE, and hit "Submit" at 1:03 PM.

AC.

The change in the atmosphere was immediate. At least we weren't going to end the contest with a humiliating total of 2 solves. I heaved a sigh of relief, and was suddenly all too aware of a sensation I had been inured to over the last few hours - my head was painfully throbbing. My teammates, appearing somewhat hopeful after the suffocating monotony of the last few hours, immediately took back the keyboard to implement C. While this solve had mattered a lot to our emotional state, it barely registered on the scoreboard. We had simply gone from being amongst the teams with 2 solves and really low penalty, to having 3 solves with really high penalty, and still remained in the late twenties.

In hindsight, it's quite unusual that I didn't just give up at this point (even if in a passive, unspoken manner). With little more than 100 minutes remaining, we were languishing in the midwit's zone of the scoreboard with 3 solves, and several teams already had \\>= 5. It's not really the case that I was consciously making some sort of conscientious decision to do my best till the very end, I was probably just too emotionally exhausted to even be able to care any more.

Whatever the reason, I suddenly found myself able, and in fact compelled, to calmly and unconditionally devote myself to the unsolved problems that remained. At this point in time, B, C, and D all had about 20 solves. G, J, L, and H appeared to represent a sharp jump in difficulty, with all of them having \\<5 solves. Since we almost necessarily needed to get B if we were to stand any real chance of qualifying, I turned to it once again.

In graph problems with as simple, and general reductions as this one, it's hard to get any "handholds" of specificity that you can use to put said problem into a chokehold that would make it tractable. There's always this suspicion that you might have missed a few details that would prevent you from needing to solve the fully general version of the reduction. This anxiety combined with some unpleasant associations I had built between B and D from my brief encounter with the former during the painful process of solving the latter, and led to me setting aside the problem once again.

As I went through the set of "hard" problems with non-zero solves, my teammates made more progress on C. At 1:15 PM, they made our first submission for the problem, and were promptly met with a WA. Unlike our previous submissions, where every WA felt like a punch to the gut, our response was more calibrated to the actual banality of a single WA - mild displeasure, and an eagerness to resolve it. They began examining the code for bugs, and I returned to my own search for a problem to solve.

G called once again. I knew that I would almost certainly mindsolve it quickly, but I hesitated in committing to it. It was clear that the solution would involve DFS over a trie in some capacity, and I have had an unpleasant relationship with tries throughout my entire career. We simply didn't have the time for me to write long and buggy code that I then spent tens of minutes laboriously debugging. I turned to the other hard problems - I had already seen L at the beginning of the contest and it had seemed cancerous even then, so the only real choice was between J and H. Both of them had just one solve till that point. Scarier yet, the only solve on both of them was from what was by far the strongest team in the entire continental region - a team being carried by India's only LGM.

I pettily reminded myself of the fact that [I had technically AKed a div-2 before him once](https://codeforces.com/contest/2173/standings) and read H. 

The statement was as follows:

> You are given a string $s$ of length $n$ ($1 \\leq n \\leq 400$) consisting of lowercase Latin letters.
> 
> You need to partition $s$ into two disjoint subsequences $x$ and $y$ such that each character of $s$ belongs to exactly one of the two subsequences.
> 
> Without loss of generality, assume $\\vert x \\vert \\geq \\vert y \\vert$ (otherwise, swap $x$ and $y$). Append character 'a' to the end of $y$ until $\\vert x \\vert = \\vert y \\vert$.
> 
> Now define a string $z$ of length $\\vert x \\vert$ such that $z_i=\\max(x_i, y_i)$ for every $1 \\leq i \\leq \\vert x \\vert$.
> 
> Find the lexicographically smallest possible string $z$.

$n \\leq 400$ immediately made my ears perk up. I love problems with cubic solutions (despite this filter being so wide and ambiguous) in a stupid and superficial manner, like a dog loves bones whether they be real or made from rubber. Problems with low constraints feel more approachable to me at the outset, because it's more natural to think of naive solutions for them first, and then gradually climb the optimizational ladder.

I considered a naive strategy: let's build $x$ and $y$ by iterating over $s$ from left to right. At every $i$, we choose to add $s_i$ to either $x$ or $y$.

When adding $s_i$, what decisions of the past matter? WLOG assume $\\vert x \\vert > \\vert y \\vert$ before adding this character (in the case where the two lengths are equal, we can add the character to either of the two strings without worsening our state). We notice that the first $\\vert y \\vert$ characters of $z$ have already been fixed by now, and we have two options:

- Add $s_i$ to $x$, further increasing the "overhang" of $x$ over $y$.
- Add $s_i$ to $y$, fixing the $\\vert y \\vert$-character of $z$.

I now considered the simplest DP I could think of: define $f(a, b)$ (assume $a \\geq b$) to be the lexicographically smallest possible $z$ we can obtain from partitioning the first $a + b$ characters of $s$ into subsequences of length $a$ and $b$.

Somewhere in the background, my teammates got another WA on C.

How do we perform transitions? From $f(a, b - 1)$ and $f(a - 1, b)$ to $f(a, b)$?... wait, what? This had just $O(n^2)$ transitions, with each one taking $O(n)$ time, making the DP already fast enough. Surely, the problem was gaslighting me? There's no way something that easy could have just one solve 3.5 hours into the contest... right? I looked at my states and transitions more carefully with some unease. The $f(a - 1, b) \\rightarrow f(a, b)$ transition was straightforward enough, and so was the... oh wait. $f(a, b - 1) \\rightarrow f(a, b)$ was strange.

When placing $s_i$ into $y$, the $b$-th character of $z$ would get fixed to $\\max(x_b, s_i)$. Let's say we have $s_i = $ 'z'. We would have previously (for the state $f(a, b - 1)$) made some decisions that minimized $z$. In other words, we would have minimized the suffix $x[b, a]$ after minimizing the fixed prefix of $z$ of length $b - 1$. This implied that we would previously have accepted any "sacrifices" in minimizing $x[b + 1, a]$ to be able to minimize $x_b$. But if $z_b$ was now being fixed to $\\max(x_b, s_i) = \\max(x_b, \\text{'z'}) = \\text{'z'}$, $x_b$ was irrelevant, and we could have "made sacrifices" w.r.t. $x_b$ in $f(a, b -1)$ to be able to further minimize $x[b + 1, a]$. All of a sudden, my previous assumptions felt comically untrue.

This was confirmed by considering the string "aabaab". Here, the state $f(4, 1)$ should be "aaba" with $x = $ "aaba" and y = "a". However, transitioning from this $(x, y)$ isn't optimal when going to $f(4, 2)$, as it would result in $x = $ "aaba" and $y =$ "ab", leading to $z =$ "abba". Instead, if we had stored information for the state $x = $ "abaa" and $y = $ "a", it would have led to a suboptimal $z = $ "abaa" for $f(4, 1)$, but would allow us to have $x =$ "abaa" and $y =$ "ab", leading to a more optimal $z$ = "abaa". However, I noticed that even the true values for these incorrectly computed states seemed to lead to strictly less optimal states than the true optimum (for the examples I worked out on paper)... Could it be possible that this was always true?

<details><summary class ="spoiler-summary">Proving the conjecture</summary>
<div class = "spoiler-content">

In particular, I began to suspect that whenever the DP made an "incorrect" decision to put a new character into $y$, the better thing to do would be to spam the remaining characters into $x$. If the PC had been free at this point, I would have just implemented the solution right then (due to its simplicity) and hoped for a proof by AC, but my teammates were still going over their code for C. Wanting to make the best use of this time, I tried to prove the conjecture.

How exactly could the solution go wrong? For convenience, we define $c(x, y)$ to be the $z$ we can produce from strings $x$ and $y$ using the procedure in the problem statement. Let's say we have two states $(x, y)$ and $(p, q)$ with $a = \\vert x \\vert = \\vert p \\vert, b = \\vert y \\vert = \\vert q \\vert, z = c(x[1, b], y) = c(p[1, b], q)$. The solution could only go wrong if we had $c(x, y) < c(p, q)$ AND the true optimum for the entire problem went through the state $(p, q)$. But could this actually happen?

To simplify things, I reduced both the states to just two strings instead of four. $(x, y)$ got reduced to \`z <lcp between x[b + 1, a] and p[b + 1, a]> <XD = first character of difference between x[b + 1, a] and p[b + 1, a]> <XS = remaining suffix of x[b + 1, a]>\` and $(p, q)$ similarly got reduced to \`z <lcp between x[b + 1, a] and p[b + 1, a]> <PD = first character of difference between p[b + 1, a] and x[b + 1, a]> <PS = remaining suffix of p[b + 1, a]>\`. Because of our assumptions, we must have $XD < PD$. For convenience, I hastily assumed $XS > PS$, as it would be strictly more adversarial.

Now, for every character in $s[a + b + 1, n]$, we would choose to add it to either the first or second subsequence in our state. Let's assume that there exists some evil insertion strategy, which will allow the *best* $z$ we can achieve starting from $(p, q)$ to be the true optimum, such that this optimum couldn't have been reached through any strategy from $(x, y)$. What happens if we just copy the operations that this strategy performed on $(p, q)$, but for $(x, y)$ instead? ie. we put the $i$-th character into the first subsequence iff it does. We notice that the first point at which our state can worsen relative to the one that started at $(p, q)$ is when we add a character into the second subsequence that matches with $XD$ (is at the same position as it, but in the second subsequence). If the character being added, $s_i$ is greater than or equal to $PD$ ($> XD$), then we transition to a strictly worse state...

All seemed lost for a moment until I realized that I had just restated a prior observation, without actually considering the new context at hand. Could this sequence lead to a global optimum? NO! Because, if, starting from $(x, y)$ we diverge from the evil strategy used on $(p, q)$ at the exact moment where $PD$ would have been dominated by the incoming character, and instead add all the remaining characters to $x$ instead, the resultant $z$ is strictly smaller than the one generated by the evil strategy, due to the final character at the position $XD$!


</div>
</details>


The conjecture was true after all!

Feeling slightly giddy with excitement, I informed my teammates that I *might* have solved H, in as modestly unoptimistic a manner as I could. I did not want to get their hopes up, in the likely case that something had gone terribly wrong in the last 25 minutes of breathless analysis. This caution was probably unwarranted, as they didn't exactly respond in the most enthusiastic manner anyway (my antics in the past have conditioned them to not get their hopes up at me claiming to have solved a hard problem, better than any effort on my part could).

The issues in GeometryDashAddict's solution to C still hadn't been resolved, and it increasingly seemed like it had a logical mistake, so I took over the PC. 5 minutes and 20 lines of code later, I was... done? Despite being almost certain that the DP was correct, I took pause. The problem still remained at a single solve. This was surely a grand, elaborate ruse to gaslight me, with all the organizers and participants involved, right? HOW THE FUCK WAS H STILL AT ONE SOLVE?

My teammates had been almost entirely unaware of what I had been up to for the last 30 minutes, with C taking up all of their attention. I had similarly been oblivious to their presence, and consequently forgot to inform them of my upcoming submission for H. At 1:40 PM, I pasted my code into the IDE, glared at it with suspicion for a few seconds, and hit "Submit". The first thought that rushed through my mind as the screen went green almost anti-climactically fast, was the fact that I had just made it possible for us to finish the contest without a solve on B and C, but with one on the ostensibly harder H.

In what GrokSponsoredPS5 later described as a stereotypical scene depicting a twist in the plot of a movie, I tapped him on the back, and just pointed at the screen. For a moment, he seemed to think that I was showing him an AC on one of the three problems we had previously solved. As I pointed to the title of the page, a bewildered smile formed on his face. Where there had previously been vague, intangible delusions about qualification, there was now a terribly real path forward, and very little time to traverse it. In the potential aftermath of failing to do so, there would also be an abundance of a previously unknown flavour of self-hatred to flagellate myself with.

Once again, our rank barely changed due to several teams having solves on A, E, and 2 of \\{B, C, D\\}. Feeling a bit frustrated with the delay on C, I asked my teammates if they wanted me to examine their solution, with the hope that I wouldn't also be led astray by any blind spots they may have developed out of familiarity. GeometryDashAddict agreed, so I quickly read the problem again.

The statement was as follows:

> There are $n$ $(1 \\leq n \\leq 2 \\cdot 10^5)$ hidden operation variables $op_1, op_2, \\dots, op_n$.
> 
> Each of them is one of three bitwise operators: $\\&$, $\\vert$, or $\\oplus$, representing bitwise AND, OR, and XOR, respectively.
> 
> You are also given $m$ $(1 \\leq m \\leq 2 \\cdot 10^5)$ equations. The $i$-th equation is: $$ a_i \\ op_{l_i} \\ b_i = c_i \\ op_{r_i} \\ d_i $$
> where all values $a_i, b_i, c_i, d_i$ are bits (each is either $0$ or $1$).
> 
> Determine whether it is possible to assign an operator to every $op_i$ so that all $m$ equations are satisfied. If there are multiple valid assignments, output any of them.

GeometryDashAddict's solution, as I imagine every solution for this problem to be, involved casework that enforced pairwise constraints between $op_{l_i}$ and $op_{r_i}$ for some $i$ and just fixed the values of $op_{l_i}$ and $op_{r_i}$ for others. Once these constraints were in place, he used BFS to propagate values without ambiguity.

The only part of the solution with any potential for errors seemed to be the casework for enforcing pairwise constraints. 


We first normalized every equation by sorting the operands on each side lexicographically (bitwise operators are commutative), and then swapped the sides and operators themselves if it made the equation lexicographically smaller. After this, we initialized all operators with value $\\vert$ and then did the following casework for every equation:

- If the operand set on the LHS and the RHS are equal, then do not enforce any constraints.
- Otherwise, do the following

| LHS                    | RHS                    | Constraints                                             |
|:---------------------- |:----------------------:|:-------------------------------------------------------:|
| $\\lbrace 0, 0 \\rbrace$ | $\\lbrace 0, 1 \\rbrace$ | force $op_{r_i} = \\&$                                   |
| $\\lbrace 0, 0 \\rbrace$ | $\\lbrace 1, 1 \\rbrace$ | force $op_{r_i} = \\oplus$                               |
| $\\lbrace 0, 1 \\rbrace$ | $\\lbrace 1, 1 \\rbrace$ | add constraint $(op_{l_i} = \\& \\iff op_{r_i} = \\oplus)$ |

- Any operand that isn't touched after we propagate changes from the fixed values can be safely left with value $\\vert$.

An observant reader will immediately protest after having read this, and so did I to GeometryDashAddict. They had indeed developed a blind spot out of familiarity. The casework for unequal operand sets was fine, but one couldn't just ignore the equations for all equal operand sets!

It seemed like $\\lbrace 0, 0 \\rbrace$ had poisoned the well here, as it's the first set of operands one considers when going in lexicographical order, and when the LHS and RHS were both equal to this set, one could indeed ignore the equation. However, this wasn't the case for $\\lbrace 0, 1 \\rbrace$ and $\\lbrace 1, 1 \\rbrace$. 

I quickly explained the case where both LHS and RHS had operands $\\lbrace 1, 1 \\rbrace$. Here, we could not have $op_{l_i} = \\oplus$ and $op_{r_i} = \\vert$, so there were some structural restrictions after all. After some discussion, we reduced the restrictions to the following constraints:

| LHS                    | RHS                    | Constraints                                                 |
|:---------------------- |:----------------------:|:-----------------------------------------------------------:|
| $\\lbrace 0, 1 \\rbrace$ | $\\lbrace 0, 1 \\rbrace$ | add constraint $(op_{l_i} = \\& \\iff op_{r_i} = \\&)$         |
| $\\lbrace 1, 1 \\rbrace$ | $\\lbrace 1, 1 \\rbrace$ | add constraint $(op_{l_i} = \\oplus \\iff op_{r_i} = \\oplus)$ |

Suddenly, the problem felt far uglier than the impression their previous solution, with its simple propagation logic, had given us. These new constraints were of a different kind than the previous ones. GeometryDashAddict wondered if we could just patch his solution by handling these new constraints in the same way as the previous ones, but for some reason, I felt that this would introduce ambiguity to the previously deterministic propagation logic. GeometryDashAddict asked why I felt this way, and I gave the example of constraint $(op_{l_i} = \\& \\iff op_{r_i} = \\&)$. If we arrived at $op_{l_i}$ with $op_{l_i} \\neq \\&$, there was ambiguity in whether it was optimal to set $op_{r_i}$ to $\\vert$ or $\\oplus$.

It was clear that the problem was provably (one could say trivially) solvable through 2-sat, but implementing this from scratch seemed like a grossly indulgent misuse of the little time that remained. I thought about alternatives that would bypass the need for fully general 2-sat, but came up with nothing. With my hopeful excitement after the solve on H suddenly deflating at the realization that we were going to spend the last hour on C alone, I asked GrokSponsoredPS5 to implement code for finding SCCs as quickly as he could.

Just as he was about to begin, GeometryDashAddict interrupted us. The operator $\\vert$ was special. All of our constraints were of the form $(a = op_1 \\iff b = op_2)$ with $op_1, op_2 \\neq \\vert$, and ambiguity only arose when $a \\neq op_1$. But in such cases, we could always leave $op_2 = \\vert$ as (a) it didn't set up further implications ($op_1 \\neq \\vert$) and (b) it could be overwritten further down the line by another implication. This was in fact the reason that propagation in the initial solution had worked, and I had overlooked this detail in the heat of the moment.

GeometryDashAddict began frantically patching his old code as the timer ticked down to 60 minutes. When the scoreboard froze, we were at the 22nd position with 4 solves. 6 teams had solved 6 problems by now, but more importantly, 16 teams had \\>= 5 solves. Even if we were to solve C the very next second, our egregious penalty would ensure that we landed outside the top-15 (which was where the cutoff for qualification had been in the previous years). 

B coyly beckoned to me. It was the 4th most solved problem by now, was this of all problems going to be the nail in the coffin of my ICPC career? The one that would engender a traumatized hatred for all graph problems for the rest of my life?

While I pondered upon this, some blessed part of me was hard at work in the background, pattern-matching onto previously seen problems, and suddenly presented me with [this one](https://codeforces.com/problemset/problem/1906/I).

In particular, it involved the following subproblem:

> Given a DAG $G(V, E)$, find the smallest number of vertex-disjoint paths one can decompose $G$ into, such that every vertex is a part of some path.

Being rather weak at flows, I had been pleasantly surprised when I realized the admittedly simple solution to this problem: build a bipartite graph with partitions $L, R$ where $L = \\lbrace v_{out} : v \\in V \\rbrace$, $R = \\lbrace v_{in} : v \\in V \\rbrace$ and edges $\\lbrace (u_{out}, v_{in})  : (u, v) \\in E \\rbrace$. The answer is equal to the size of the maximum matching on this bipartite graph. 

WHAT. THE. FUCK.

The pain barely registered as I slapped myself in the face hard.

Even as my heartbeat rose with the knowledge of what this meant, I hesitated in allowing myself to admit that I had solved the problem, as it would require me to admit the embarrassing simplicity of the solution, and the fact that I had made no progress for so long.

We first build the exact auxiliary bipartite graph defined earlier from our DAG. And then we just... find the minimum vertex cover.

Performing an operation on $u$ that deletes outgoing edges is equivalent to selecting the vertex $u_{out}$ in the bipartite graph, and performing one that deletes incoming edges is equivalent to selecting $u_{in}$. The objective in the problem (deleting edges) is clearly equivalent to that of vertex cover.

I pulled GrokSponsoredPS5 over and explained the solution to him. His eyes lit up as he nodded along. There was no way this was actually happening. Where was the caveat? The one thing that went wrong at the very last moment?

I wondered if it would be C, as GeometryDashAddict submitted his code at 2:15 PM, to be met with a... why was the spinner in the UI still spinning? As a few seconds passed, our disappointed expectation of a TLE turned into a more hopeful annoyance. We had encountered a CodeChef bug at the-regional-that-shall-not-be-named where the spinner kept spinning regardless of the result. The actual result could be confirmed by looking at the top left of the scre- GrokSponsoredPS5 exclaimed with joy a little too loudly. AC. The PC was quickly freed for me.

I began typing out Hopcroft-Karp from our team notebook with shaking hands. Suddenly, it was our contest to somehow throw away in the hour that remained. In what was a comical overcorrection to ensure the absence of any more fuck-ups, I asked GrokSponsoredPS5 to explain the solution to GeometryDashAddict and have him mentally verify it too, and for GrokSponsoredPS5 to then examine my code line-by-line as I typed.

With my body occupied with the trivial task of copying the code, my mind began to think of creative ways in which things could still go wrong.

We had made very few changes to the team notebook since last year, and the flows code hadn't been touched at all. This was mostly because of the fact that WellGroomedHair had laboriously reduced the size of all our code by formatting it manually, and I had been too lazy to do the same for the templates I had updated since then.

For instance, he had reduced my code for bipartite flows from this:

<details><summary class ="spoiler-summary">code I use</summary>
<div class = "spoiler-content">

\`\`\`cpp
class bipartite_chan
{
    /*
        tc: O(E sqrt(V))
        mc: O(V + E)

        vars:
            n, m: size of left and right partitions
            adj: left to right edges ONLY
        info:
            Both partitions are individually 0 indexed
            After calling max_matching():
                - matching = size of max matching
                - l[u] = matched right node for u (l[u] = -1 => unmatched)
                - r[u] = matched left node for u (r[u] = -1 => unmatched)
            MVC is found by:
                - orienting matched edges from right to left, unmatched opposite
                - running dfs from all unmatched left side nodes
                - (unvis nodes on the left) + (visited nodes on right) = mvc
            MIS is complement of MVC
    */
public:
    int n, m;
    int matching = 0;
    vector<vector<int>> adj;
    vector<int> l, r, lvl;
    bipartite_chan(int n, int m, const vector<vector<int>> &adj) : 
        n(n), m(m), l(n, -1), r(m, -1), adj(adj) {};

    // void Add(int u, int v)  { adj[u].push_back(v); }
    bool dfs(int u)
    {
        int t = exchange(lvl[u], -1) + 1;
        for (int v : adj[u])
            if (r[v] == -1 or (lvl[r[v]] == t and dfs(r[v])))
                return l[u] = v, r[v] = u, 1;
        return 0;
    }

    int max_matching()
    {
        matching = 0;   
        vector<int> q(n);
        for (int s = 0, t = 0;; s = t = 0)
        {
            lvl = vector<int>(n);   bool f = 0;
            for(int i = 0; i < n; i ++) 
                if (l[i] == -1) 
                    lvl[i] = 1, q[t ++] = i;

            while (s < t)
            {
                int u = q[ s++];
                for (int v : adj[u])
                {
                    int x = r[v];
                    if (x == -1)
                        f = 1;
                    else if (!lvl[x])
                        lvl[x] = lvl[u] + 1, q[t++] = x;
                }
            }

            if (!f)
                break;

            for(int i = 0; i < n; i ++) 
                if (l[i] == -1) 
                    matching += dfs(i);
        }
        return matching;
    }

    vector<pair<int, int>> max_matching_edges()
    {
        vector<pair<int, int>> mme;
        for(int u = 0; u < n; u ++)
            if(l[u] != -1)
                mme.push_back(make_pair(u, l[u]));
        return mme;
    }

    pair<vector<int>, vector<int>> min_vertex_cover()
    {
        vector<bool> lv(n, false), rv(m, false);

        auto dfs = [&](int u, auto &&dfs) -> void
        {
            lv[u] = true;
            for(auto v : adj[u])
                if(r[v] != u and !rv[v])
                {
                    rv[v] = true;
                    if(r[v] != -1 and !lv[r[v]])
                        dfs(r[v], dfs);
                }
        };
        for(int u = 0; u < n; u ++)
            if(l[u] == -1 and !lv[u])
                dfs(u, dfs);

        vector<int> lc, rc;
        for(int u = 0; u < n; u ++)
            if(!lv[u])
                lc.push_back(u);
        for(int u = 0; u < m; u ++)
            if(rv[u])
                rc.push_back(u);

        assert(matching == (int)lc.size() + (int)rc.size());
        return {lc, rc};
    }
};
\`\`\`


</div>
</details>


to the far more compact (and less readable) form that I was currently typing:

<details><summary class ="spoiler-summary">code in our notebook</summary>
<div class = "spoiler-content">

\`\`\`cpp
class bipartite_chan {
/*tc: O(E sqrt(V))
  mc: O(V + E)
  vars:
    n, m: size of left and right partitions
    adj: left to right edges ONLY
  info:
    Both partitions are individually 1 indexed
    After calling max_matching():
      - matching = size of max matching
      - l[u] = matched right node for u (l[u] = -1 => unmatched)
      - r[u] = matched left node for u (r[u] = -1 => unmatched)
    MVC is found by:
      - orienting matched edges from right to left, unmatched opposite
      - running dfs from all unmatched left side nodes
      - (unvis nodes on the left) + (visited nodes on right) = mvc
    MIS is complement of MVC
*/
public:
  int n, m, matching = 0;
  vector<vector<int>> adj;
  vector<int> l, r, lvl;
  bipartite_chan(int n, int m, const vector<vector<int>> &adj) :
      n(n), m(m), l(n, -1), r(m, -1), adj(adj) {};
  // void Add(int u, int v)  { adj[u].push_back(v); }
  bool dfs(int u) {
    int t = exchange(lvl[u], -1) + 1;
    for (int v : adj[u])
      if (r[v] == -1 or (lvl[r[v]] == t and dfs(r[v])))
        return l[u] = v, r[v] = u, 1;
    return 0;
  }
  int max_matching() {
    matching = 0; vector<int> q(n);
    for (int s = 0, t = 0;; s = t = 0) {
      lvl = vector<int>(n);   bool f = 0;
      for(int i = 0; i < n; i ++)
        if (l[i] == -1)
          lvl[i] = 1, q[t ++] = i;
      while (s < t) {
        int u = q[ s++];
        for (int v : adj[u]) {
          int x = r[v];
          if (x == -1) f = 1;
          else if (!lvl[x])
            lvl[x] = lvl[u] + 1, q[t++] = x;
        }
      }
      if (!f) break;
      for(int i = 0; i < n; i ++)
        if (l[i] == -1) matching += dfs(i);
    }
    return matching;
  }
  vector<pair<int, int>> max_matching_edges() {
    vector<pair<int, int>> mme;
    for(int u = 0; u < n; u ++)
      if(l[u] != -1) mme.push_back(make_pair(u, l[u]));
    return mme;
  }
  pair<vector<int>, vector<int>> min_vertex_cover() {
    vector<bool> lv(n, false), rv(m, false);
    auto dfs = [&](int u, auto &&dfs) -> void {
      lv[u] = true;
      for(auto v : adj[u])
        if(r[v] != u and !rv[v]) {
          rv[v] = true;
          if(r[v] != -1 and !lv[r[v]]) dfs(r[v], dfs);
        }
    };
    for(int u = 0; u < n; u ++)
      if(l[u] == -1 and !lv[u]) dfs(u, dfs);
    vector<int> lc, rc;
    for(int u = 0; u < n; u ++)
      if(!lv[u]) lc.push_back(u);
    for(int u = 0; u < m; u ++)
      if(rv[u]) rc.push_back(u);
    assert(matching == (int)lc.size() + (int)rc.size ());
    return {lc, rc};
  }
};
\`\`\`


</div>
</details>


I had already made a few typos, and subsequently corrected them as I typed the dense code out. I shuddered with dread. What if WellGroomedHair had accidentally deleted a character while formatting the code last year? All it would have taken was an accidental backspace to convert a \`-1\` into a \`1\`.

Some part of me hoped against hope that this had actually happened, even as another annoyingly rational part reminded me that it was highly unlikely, and even in the case that it had happened, I could easily find the error in the time that remained.

My heartbeat had been doing its best to mimic the [Shepard Tone](https://en.wikipedia.org/wiki/Shepard_tone) as I finished implementing the code and ran it against the samples. Why was the output nonsensical? Was this the caveat from earlier? Surely, we had collectively hallucinated a laughably invalid solution in the style of an LLM?

No. There was just a stupid mistake in how I had constructed the initial DAG. I fixed this in a few seconds and ran the code against the samples, daring the outputs to be nonsensical again. They weren't. I consoled myself with the fact that the samples were trivial, and we would surely be greeted with an unresolvable WA that dashed our hopes into the ground once I actually made the submission. With all six of our eyes riveted to the screen, I pasted the code into the IDE and hit "Submit", hoping, no, praying that something had gone wrong.

AC.

The 40 minutes that remained passed by like a blur while simultaneously being the longest of my life. If these had been the first 40 minutes of the contest, we might have acquired another AC (G), but most of my attention was now captured by the awareness that with every minute that passed, other teams could rise above us by getting 6 solves with better penalty.

I idly observed the team in front of us hastily typing and debugging code in the meantime. They had also solved 6 problems, and were to remain at this tally till the end of the contest.

Time eventually ran out. As we exited the hall, I remarked that this was the first time I wasn't leaving an ICPC contest feeling depressed, and GeometryDashAddict agreed.`;export{e as default};
