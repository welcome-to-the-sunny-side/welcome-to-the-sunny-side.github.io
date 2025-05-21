---
layout: default
title: "algorithm"
permalink: /algorithm/
---

<div class="home">

  {%- assign posts = site.algoposts | sort: "date" -%}
  {%- assign posts_sorted = posts | sort: "date" | reverse -%}

  {%- if posts_sorted.size > 0 -%}
    <h2 class="post-list-heading">{{ "Algorithms" }}</h2>
<p>Algorithmic techniques and problems.</p>
    <ul class="post-list">
      {%- for post in posts_sorted -%}
      {%- unless post.tags contains "draft" -%}
	  <li>
	    {%- assign date_format = site.minima.date_format | default: "%b %-d, %Y" -%}
	    <span class="post-meta">{{ post.date | date: date_format }}</span>
	    <h3>
	      <a class="post-link" href="{{ post.url | relative_url }}">
		{{ post.title | escape }}
	      </a>
	    </h3>
	    {%- if site.show_excerpts -%}
	      {{ post.excerpt }}
	    {%- endif -%}
	  </li>
      {%- endunless -%}
      {%- endfor -%}
    </ul>
  {%- endif -%}

</div>
