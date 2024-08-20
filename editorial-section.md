---
layout: default
title: "editorial"
permalink: /editorial/
---

<div class="home">

  
  {%- if site.posts.size > 0 -%}
    <h2 class="post-list-heading">{{ "Editorials" }}</h2>
    <ul class="post-list">
      {%- for post in site.posts -%}
      {%- if post.tags contains "editorial" -%}
      <!-- {%- unless post.tags contains "incomplete" -%} -->
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
      <!-- {%- endunless -%} -->
      {%- endif -%}
      {%- endfor -%}
    </ul>
  {%- endif -%}

</div>
