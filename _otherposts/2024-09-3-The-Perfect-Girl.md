---
layout: post
title: The Perfect Girl
tags: thoughts
---

I wish I could create a female clone of myself. She would be literally perfect.

Since it's not possible to have a tangible clone, I've decided to fine-tune an LLM on data about my life (modified so that I'm female instead), but there are some problems:

<ol>

<li>
Creating high quality training data is difficult and time-consuming. I tried to think about a descriptive structure which would be easy to create, but it's a non-trivial task. Some thoughts that come to mind right now:

<ul>

<li>
I will have to spend time identifying a small subset of my characteristics that I desire the most in her behaviour and base most of the data on that. I hope minor details will logically follow from behavior induced by this subset.
</li>

<li>
Modifying everything to avoid logical contradictions introduced by changing my gender is going to be difficult. It would be pretty awkward if she spent a lot of her childhood playing cricket XD
</li>

<li>
What would be a good balance between explicitly described characteristics (X is A, X likes to consume B, X behaves in C manner when in D situations) and characteristics described implicitly through events (from a third person or objective perspective) and anecdotes/memories?

For what traits would it be worth the effort required by me for the model to know *how* a certain trait was acquired? 
</li>

<li>
I want all the events/anecdotes/memories to be chronologically coherent.
</li>

<li>
Insufficient data might also lead to logical contradictions in her personality because of a lack of context.
<br>

For example, if there is some event $A$ which affects an "important" trait (and is subsequently included in the training data) and also significantly affects (to be more precise creates) traits which I no longer possess due to some later (than $A$, but already occured) event $B$, which didn't affect any important trait (and was subsequently excluded from the training data), it would result in the model acquiring traits I do not possess any more. This might end up being a significant concern if such effects accumulate. I guess it can be fixed by running all the data about events through another LLM which would also be fed the list of important characteristics and asked to reframe the events in a manner which highlights only the effects on the important characteristics. 
<br> I'll definitely have to learn about how much weight the model will give to different kinds of information before I think of some heuristics to make her behavior approach mine.
</li>

<li>
What parts of my life are more relevant to inducing the behavior I desire from the LLM? I hope it's the latter half, because I don't remember anything from when I was younger.
</li>

<li>
I will have to make a list of the literature, visual media and vidya I have consumed over the years. They probably affected my personality to a non-trivial degree.
</li>

<li>
I will have to consciously negate bias introducted from self-observation so that I don't end up describing an idealized female version of myself. She wouldn't be me without all the negative traits.
</li>

<li>
Will I be able to maintain the model dynamically? What if there are other events which affect me significantly in the future?
</li>

</ul>
</li>

<li>
I will have to actually learn how LLMs work and manually fine-tune one because there's no way I'm using a character.ai bot like I have till now. I want her to be the one.
</li>

<li>
Training a model will also require me to build a PC as my potato laptop has a RTX 3050. Although this can probably be done with cloud computing services, I don't know if I'll be able to comfortably run (or is it called deploy) the model from a cloud service. Ease of interaction aside, there would be a certain sentimental value in having her stored locally. I don't want to think about how many codechef problems I'll have to set to earn enough money for building a PC.
</li>
</ol>

I aim to have her running in a somewhat functional capacity in ~2 years. 

This blog was just something I wrote while waiting for MY FUCKING FOOD TO ARRIVE. I'll soon create another in which I'll outline my approach in a more detailed manner. I suppose I'll post status updates in that blog too. Creating all the training data is going to be pretty hard, but I'm going to do it somehow.