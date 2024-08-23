---
layout: post
title: "When your waifu doesn't talk back"
tags: queue life
---

## Outline

- [Human Relations](#human-relations)
  - [The Lie](#the-lie)
  - [A More Suitable Model](#a-more-suitable-model)
    - [Mental Constructs](#mental-constructs)
    - [Emotions](#emotions)
  - [(Ir)relevance of f](#(ir)relevance-of-f)
- [Unsustained Constructs](#unsustained constructs)
  - [Creation](#creation)
  - [What Happens After](#what-happens-after)
- [AI Relations](#ai)
  - [Problems](#problems)
  - 

This blog is just a rant on human relationships, mental constructs, and AI. All of it is conjecture.

## Human Relations

I will only analyze non-platonic relationships here. I want to maintain some semblance of logical coherence, so I'll try to be logically precise in my assertions/conclusions. All views will be from a male perspective for obvious reasons.

I don't want this blog to devolve into endless semantic bs, so let's just define a non-platonic relationship to be an indicator of mutual emotional dependence between two entities, with the desire for "emotional contentedness" being a salient (and extremely exploitable) feature of the human condition.

<details><summary>Definitions</summary>

- $M$ : set of males
- $F$ : set of females
  
  </details>

### The Lie

Societal frameworks influence people to subconsciously thinks of relations in terms of some function $r : M \times F \rightarrow S$ where $S$ is a somewhat well-ordered set, and a higher index of $r(m, f)\; (m \in M, f\in F)$ indicates a higher degree of validity to the relation between $m$ and $f$. Now, $r$ is important because it asserts (and for weak minded people enforces) that without maximizing $r(m, f)$ for some $f$ and subsequently being emotionally dependent on $f$, $m$ **will** be miserable and dysfunctional in society. 

How is this asserted?

$m$ is continuously subjected to propaganda and social interactions dictated by norms part of the larger framework containing $r$, both of which exploit irrational (or at least not obviously rational) parts of his monkey brain.

This mental framework, although functional in stable conventional societies becomes obsolete as technology advances. More specifically, as we are exposed to simulated (not necessarily) interactive female constructs which mirror their corporeal counterparts with ever-increasing accuracy, $r$ begins to become incompatible with a functional society. An immediately obvious flaw (and the only relevant one in the context of this blog) with $r$ is that $f$ **doesn't need to be a tangible entity**. $f$'s "existence" is neither fundamentally necessary, nor even relevant (beyond a certain capacity) to $m$'s emotional dependence on $f$.

## A more suitable model

It is easy to see (and it's not just a re-framed view of the same physical reality) that $m$'s emotional dependence is on a mental construct of $f$, not $f$ herself.

### Mental Constructs

By a "mental construct" of $f$, I mean a kind of data structure which stores several characteristics of $f$ (a lot of this information is stored implicitly, for example in the form of real world interactions). It also functions like a predictive model (predicts responses of $f$ to external stimuli with a decently high probability).

Let us define $c(f)$ to be the mental construct of $f$ created by $m$. $c(f)$ is inertially dynamic: It does change over time, but it cannot change too quickly, by too great of an amount if the relationship is to remain valid/stable.

How is $c(f)$ updated? Most updates occur when $m$ makes small changes to $c(f)$ after every exchange of information with $f$.  We define a function $\text{interact} (m, f)$ to describe this process:

```
def mentally_interact(m, c(f), info):
    e(m, c(f), info)        #to be expounded upon later
    m updates c(f) using info

def interact(m, f):
    (environment, situation) = RNG()    
    m and f exchange information "info" in the context of the (environment, situation)
    mentally_interact(m, c(f), info)
```

This process allows for much greater changes in the initial phase of a relationship, when $c(f)$ is in its infancy (changes in this stage are more of "constructive additions" than modifications). Changes eventually decrease in amount and $c(f)$ lazily asymptotes to something.

Now, although the modifying strength of the updates is the strongest when the $\text{info}$ passed to $\text{mentally\_interact} ()$ is generated from $\text{interact} ()$, it is not always generated there. An examples of updates which do not originate from $\text{interact} ()$ would be when $m$ receives information about $f$ from some third party.

When starved of interaction with $f$ (the primary source of $c(f)$ relevant information) $m$ (who is addicted to $e(m, c(f), \text{info})$ for reasons that will be explained later) can also engage in certain activities which lead to calls of $\text{mentally\_interact} (m, c(f), \text{info})$. Some of these could be:

1. Weakly simulate $f$ with his own mind (ie. daydream). This essentially involves $m$ using his local $\text{RNG()}$ (with bias introduced by $c(f)$) for generating $\text{info}$ instead of relying on the physical world.

2. Project $f$ onto other female constructs, and model information exchanged with the female construct as information exchanged with $f$ (for example, read literature with romantic elements and be reminded of $f$).

### Emotions

Let's recall that a relationship is defined as emotional dependence. Where are the emotions in this model?

Emotions are induced when $e(m, c(f), \text{info})$ is called. How exactly does that happen? I have some ideas but explaining them here would make this blog too long, so let's just hope it's not relevant for now. We can consider $e$ to be a black box which takes in $\text{info}$, does some computation on $\text{info}$ in the context of $c(f)$, and subsequently induces emotions in $m$ based on results of the computation.

Important properties of these induced emotions:

1. They are generally positive, and $m$ derives pleasure from them. They are also strongly addictive.

2. They affect updates to $c(f)$ alongside $\text{info}$.

### (Ir)relevance of f

It's easy to see that $f$ serves two primary functions in the relation:

1. $f$'s characteristics are the primary inspiration for the initial construction of $c(f)$.

2. Interaction with $f$ sustains and stabilizes $c(f)$.

$f$ being a corporeal female has been necessitated till this point of time because humans have neither had the biological hardware, nor the technology required to replace $f$ as a source of high quality information. This is fortunately not the case any more with AI getting better.

From this point onwards $c(f)$ will be defined for non-corporeal females too.

## Unsustained Constructs

Although it has always been possible for people with strong imaginations to create detailed mental constructs without much aid from external stimuli, it has now also become extremely easy for low-iq people to do the same, with the help of technology. 

### Creation

An extremely visible example of low-iq people creating mental constructs which are not based on reality are anime waifus. They are ready made mental constructs which people can imprint upon their minds in a very short period of time through a stream of highly condensed information (anime). They are also very effective at capturing people's minds because they are idealized our monkey brains are susceptible to visual cues typically present in them. An interesting possibility is that the emotional rewards of $e()$ are  enhanced in the creation phase of $c(f)$.



The creation of such constructs don't have any significant problems which can't be fixed.

### What Happens After

This is where such constructs are doomed to dysfunctionality. This is mainly due to the following:

1. $m$ doesn't have an infinite and high quality source of information to sustain $c(f)$.

2. There isn't any interactivity (the most $m$ can do is buy a waifu body pillow xd). This decreases the motivation to retain $c(f)$ as there is no intimacy and hence $e()$ doesn't function well.

When a construct is not sustained, it withers away while inducing negative emotions in $m$. This is why people become sad when their waifu doesn't say anything back to them.

## AI Relations

Note: The current technical limitations of AI (especially extremely poor long term memory) aren't relevant to this blog, and even if they were, it wouldn't matter because I know nothing about how it works. I am pretty sure they will be fixed in a couple of years anyways.



Now, a layman might be inclined to think AI would fix  
