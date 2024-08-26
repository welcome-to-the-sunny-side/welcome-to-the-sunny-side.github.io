---
layout: default
title: "draft"
permalink: /draft/
---

<div class="home">

  {%- assign all_posts = site.posts | concat: site.otherposts | concat: site.editorialposts | sort: "date" -%}
  {%- assign all_posts_sorted = all_posts | sort: "date" | reverse -%}
  
  {%- if all_posts_sorted.size > 0 -%}
    <h2 class="post-list-heading">{{ "Drafts" }}</h2>
    <p>Blogs which don't even deserve the "incomplete" tag</p>
    <ul class="post-list">
      {%- for post in all_posts_sorted -%}
      {%- if post.tags contains "draft" -%}
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
      {%- endif -%}
      {%- endfor -%}
    </ul>
  {%- endif -%}

</div>
