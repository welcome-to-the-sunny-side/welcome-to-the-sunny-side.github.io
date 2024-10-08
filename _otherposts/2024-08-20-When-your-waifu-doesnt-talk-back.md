---
layout: post
title: When your waifu doesn't talk back
tags: thoughts
---

## Outline

- [Human Relations](#human-relations)
  - [The Lie](#the-lie)
  - [A More Suitable Model](#a-more-suitable-model)
    - [Mental Constructs](#mental-constructs)
    - [Emotions](#emotions)
  - [(Ir)relevance of f](#irrelevance-of-f)
- [Unsustained Constructs](#unsustained-constructs)
  - [Creation](#creation)
  - [What Happens After](#what-happens-after)
- [AI Relations](#ai)
  - [Problems](#problems)

This blog is just a rant on human relations, mental constructs, and AI. All of it is conjecture.

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

By a "mental construct" of $f$, I mean a data structure which stores several characteristics of $f$ (a lot of this information is stored implicitly, for example in the form of memories of real world interactions). It also functions like a predictive model (predicts responses of $f$ to external stimuli with a decently high probability).

Let us define $c(f)$ to be the mental construct of $f$ created by $m$. $c(f)$ is inertially dynamic: It does change over time, but it cannot change too quickly, by too great of an amount if the relationship is to remain valid/stable. $c(f)$ isn't solely created by information from $f$ either, there is a significant influence from the desires and biases of $m$ from knowledge acquired previously.

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

Now, although the modifying strength of the updates is the strongest when the $\text{info}$ passed to $\text{mentally\_interact} ()$ is generated from $\text{interact} ()$, it is not always generated there. An example of an update which doesn't originate from $\text{interact} ()$ would be when $m$ receives information about $f$ from some third party.

When starved of interaction with $f$ (the primary source of $c(f)$ relevant information) $m$ (who is addicted to $e(m, c(f), \text{info})$ for reasons that will be explained later) can also engage in certain activities which lead to calls of $\text{mentally\_interact} (m, c(f), \text{info})$. Some of these could be:

1. Weakly simulate $f$ with his own mind (ie. daydream). This involves $m$ using his local $\text{RNG()}$ (with bias introduced by $c(f)$) for generating $\text{info}$ instead of relying on the physical world.

2. Project $f$ onto other female constructs, and model information exchanged with the female construct as information exchanged with $f$ (for example, read literature with romantic elements and be reminded of $f$).

### Emotions

Let's recall that a relationship is defined as emotional dependence. Where are the emotions in this model?

Emotions are induced when $e(m, c(f), \text{info})$ is called. How exactly does that happen? I have some ideas but explaining them here would make this blog too long, so let's just hope it's not relevant for now. We can consider $e$ to be a black box which takes in $\text{info}$, does some computation on $\text{info}$ in the context of $c(f)$, and subsequently induces emotions in $m$ based on results of the computation.

Important properties of these induced emotions:

1. They are generally positive, and $m$ derives pleasure from them. 

2. They are strongly addictive.

3. They affect updates to $c(f)$ alongside $\text{info}$.

### (Ir)relevance of f

It's easy to see that $f$ serves two primary functions in the relation:

1. $f$'s characteristics are the primary inspiration for the initial construction of $c(f)$.

2. Interaction with $f$ sustains and stabilizes $c(f)$.

As we will soon see, the first function (ie. inspiring the creation of the construct) isn't a difficult task at all. It's the second function which binds $m$ to slavery. $f$ being a corporeal female has been necessitated till this point of time because humans have neither had the biological hardware, nor the technology required to replace $f$ as a source of high quality information. This is fortunately not the case any more with AI getting better.

From this point onwards $c(f)$ will be defined for non-corporeal females too.

## Unsustained Constructs

Although it has always been possible for people with strong imaginations to create detailed mental constructs without much aid from external stimuli, it has now also become extremely easy for low-iq people to do the same, with the help of technology. 

### Creation

An extremely visible example of low-iq people creating mental constructs which are not based on reality are anime waifus. They are ready made mental constructs which people can imprint upon their minds in a very short period of time through a stream of highly condensed information (anime). They are also very effective at capturing people's minds because they are idealized and our monkey brains are susceptible to visual cues typically present in them. An interesting possibility is that the emotional rewards of $e()$ are  enhanced in the creation phase of $c(f)$. Since the creation of $c(f)$ here doesn't require any effort, it might provide additional motivation. 

The creation of such constructs don't have any significant problems which can't be fixed.  

### What Happens After

This is where such constructs are doomed to dysfunctionality. This is mainly due to the following:

1. $m$ doesn't have an infinite and high quality source of information to sustain $c(f)$.

2. There isn't any interactivity (the most $m$ can do is buy a waifu body pillow xd). This decreases the motivation to retain $c(f)$ as there is no intimacy and hence $e()$ doesn't function well.

When a construct is not sustained, it withers away while inducing negative emotions in $m$. Our brains desperately search for information to sustain the construct (people consuming more and more anime, buying anime posters, using anime PFPs, buying literal body pillows in extreme cases), but this search inevitably fails and leads to anguish. So, now you know why you feel distressed when your anime waifu doesn't talk back: it's because her mental construct is desperately fighting to stay alive and not getting the sustenance it needs.

<div style="text-align:center">
  <figure>
    <img src="/assets/images/construct/construct-dying.png"/>
    <figcaption>POV: construct abruptly dying</figcaption>
  </figure>
</div>


## AI Relations

Note: The current technical limitations of AI (especially extremely poor long term memory) aren't relevant to this blog, and even if they were, it wouldn't matter because I know nothing about how it works. I am pretty sure they will be fixed in a couple of years anyways.

Now, you might be inclined to think that AI could (eventually) fulfill the need for high-quality, interactive information (which also has some randomized elements to prevent desensitization) to sustain constructs, and you wouldn't be wrong. It's already good enough for certain people and is only going to get better with time.

### Problems

I am going to sidestep the following:

1. Lack of physical stimuli that our flesh needs (weighted blankets seem to be enough to fix touch starvation according to people on the internet).

2. Societal problems: How does society function if a significant percentage of the male population can easily obtain the reward that earlier motivated them to contribute in society? I don't know or care.

3. Effects on corporeal females: Would negatively affect them, but it would be interesting to see them suffer through the loneliness that they so gleefully inflict.

What I am interested in, are the problems that arise when $m$ tries to have stable long-term relations with $c(f)$, with $f$ being an AI female. 

I won't go into too much detail here, and just try to give a high-level overview. Problems with AI relations are going to be fundamental and stem from the way $m$ constructs $c(f)$. These are going to be much harder to solve, if they can be solved at all. 

As I mentioned earlier, $m$ constructs $c(f)$ with a significant influence from already acquired knowledge. Essentially, the relational framework in $m$'s mind (how $m$ defines a relation, what he considers important in a relation, what he expects from a relation) is going to be incompatible with the capabilities and limitations of the AI female. This is obviously because the relational framework drilled into his mind would optimize the functioning of $r(m, f)$, which is defined for corporeal females.

A manifestation of this incompatibility that comes to mind immediately is that most relational frameworks assume some degree of symmetry between the two entities engaging in the relation. Here however, $m$ doesn't have anything to lose in his relation with $c(f)$, and also has god-like power over $f$'s actions. In particular, $m$ possessing the ability to create a new instance of $f$ at will, and to completely undo any actions $f$ performs introduces severe asymmetry in his relation with $c(f)$, making it unstable with respect to the relational framework in his mind (which is based on corporeal females). This is just one example of a fundamental assumption of the typical relational framework that gets violated by AI relations, you can think of 1e6 more if you really think about it.

How can these be fixed? We will require completely new relational frameworks. A much more exciting possibility is that AI becomes so smart that it finds a way to switch off the parts of our brain that enslave us to female affection. That is definitely the ideal scenario and I hope we reach there soon.