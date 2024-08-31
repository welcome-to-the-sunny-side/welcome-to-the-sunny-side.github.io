---
layout: default
title: "algorithm"
permalink: /algorithm/
---

<div class="home">
  {%- if site.posts.size > 0 -%}
    <h2 class="post-list-heading">{{ "Algorithms" }}</h2>
<p>Descriptions of algorithmic techniques. <br> Editorials can be found <a href="https://welcome-to-the-sunny-side.github.io/editorial/">here</a>.</p>
    <ul class="post-list">
      {%- for post in site.posts -%}
      {%- if post.tags contains "algorithm" -%}
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
      {%- endif -%}
      {%- endfor -%}
    </ul>
  {%- endif -%}

</div>
