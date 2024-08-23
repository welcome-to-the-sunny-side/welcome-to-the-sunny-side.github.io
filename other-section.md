---
layout: default
title: "other"
permalink: /other/
---

<div class="home">

  {%- assign all_posts = site.otherposts | sort: "date" -%}
  {%- assign all_posts_sorted = all_posts | sort: "date" | reverse -%}
  
  {%- if all_posts_sorted.size > 0 -%}
    <h2 class="post-list-heading">{{ "Other" }}</h2>
    <p>(mostly spam)</p>
    <ul class="post-list">
      {%- for post in all_posts_sorted -%}
      {%- unless post.tags contains "queue" -%}
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
